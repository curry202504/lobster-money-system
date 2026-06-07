const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => { let data=''; res.on('data',c=>data+=c); res.on('end',()=>resolve(data)); }).on('error', reject);
  });
}

class CDP {
  constructor(wsUrl) { this.wsUrl=wsUrl; this.msgId=0; this.pending=new Map(); }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws=new WebSocket(this.wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('message', data => {
        const msg=JSON.parse(data.toString());
        if(msg.id && this.pending.has(msg.id)) {
          const p=this.pending.get(msg.id); this.pending.delete(msg.id);
          msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
        }
      });
      this.ws.on('error', reject);
    });
  }
  async cmd(m, p={}) { 
    const id=++this.msgId;
    return new Promise((res,rej) => { this.pending.set(id,{resolve:res,reject:rej}); this.ws.send(JSON.stringify({id,method:m,params:p})); });
  }
  async js(fn) {
    const r=await this.cmd('Runtime.evaluate',{expression:fn,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  close() { if(this.ws) this.ws.close(); }
}

async function main() {
  const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
  const page = targets.find(t => t.type==='page' && t.url.includes('douyin.com'));
  if(!page) throw new Error('No douyin page');
  
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  
  // 1. Find ALL clickable elements related to following
  console.log('=== Finding all interactive elements ===\n');
  
  const interactive = await cdp.js(`(function(){
    const result = [];
    
    // Find all elements containing "关注" text that might be clickable
    document.querySelectorAll('div, span, a, button').forEach(el => {
      const t = (el.textContent||'').trim();
      const r = el.getBoundingClientRect();
      if (!t || r.width===0 || r.height===0) return;
      
      if ((t.includes('关注') || t.includes('粉丝')) && t.length < 30 && r.y > 100 && r.y < 600) {
        const isLink = el.tagName==='A' || el.closest('a');
        const hasClick = el.onclick || el.getAttribute('data-click') || el.getAttribute('href') || isLink;
        const reactKey = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
        
        result.push({
          text: t.substring(0,60),
          tag: el.tagName,
          cls: el.className?.substring(0,60),
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          isLink, hasReactProps: !!reactKey,
          href: isLink ? el.closest('a')?.href?.substring(0,100) : '',
          dataset: JSON.stringify(el.dataset || {}),
          cursor: window.getComputedStyle(el).cursor,
        });
      }
    });
    
    return result;
  })()`);
  
  console.log('Interactive elements:', JSON.stringify(interactive, null, 2));
  
  // 2. Try clicking various elements
  for (const el of interactive) {
    if (el.isLink || el.hasReactProps || el.cursor === 'pointer') {
      console.log(`\n=== Clicking "${el.text}" at (${el.x+el.w/2}, ${el.y+el.h/2}) ===`);
      
      // Click at the element's center
      const cx = Math.round(el.x + el.w/2);
      const cy = Math.round(el.y + el.h/2);
      
      // Use CDP Input to click
      const clickResult = await cdp.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
      await cdp.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
      
      // Also try JS click
      await cdp.js(`(function(){
        const el = document.elementFromPoint(${cx}, ${cy});
        if (!el) return 'no element';
        const rect = el.getBoundingClientRect();
        const x = rect.x + rect.width/2;
        const y = rect.y + rect.height/2;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        return 'clicked ' + el.tagName;
      })()`);
      
      console.log('  Result:', JSON.stringify(clickResult));
      await sleep(3000);
      
      const newUrl = await cdp.js(`(function(){ return location.href; })()`);
      console.log('  New URL:', newUrl);
      
      if (newUrl !== 'https://www.douyin.com/user/self?showTab=follow') {
        console.log('  URL CHANGED!');
        break;
      }
    }
  }
  
  // Screenshot after clicks
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_after_clicks.png'), Buffer.from(ss.data, 'base64'));
  console.log('\nScreenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
