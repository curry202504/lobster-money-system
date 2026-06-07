const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); }).on('error', reject);
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
  async click(x,y) {
    await this.cmd('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
    await sleep(100);
    await this.cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
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
  
  // Navigate back to profile
  console.log('Going to profile...');
  await cdp.cmd('Page.navigate', { url: 'https://www.douyin.com/user/self' });
  await sleep(6000);
  
  let currentUrl = await cdp.js(`(function(){ return location.href; })()`);
  console.log('Current URL:', currentUrl);
  
  // Find all clickable elements near "关注 1510"
  console.log('\n=== Analyzing profile for follow list link ===');
  
  const elements = await cdp.js(`(function(){
    const result = [];
    
    // Strategy: find the element or parent that links to following list
    document.querySelectorAll('a, div, span').forEach(el => {
      const t = (el.textContent||'').trim();
      const r = el.getBoundingClientRect();
      if (r.width>0 && r.height>0 && r.y < 600) {
        // Find elements containing "关注" followed by numbers
        const match = t.match(/关注\\s*(\\d+)/);
        if (match) {
          const href = el.tagName === 'A' ? el.href : el.closest('a')?.href;
          result.push({
            text: t.substring(0,50),
            tag: el.tagName,
            cls: el.className?.substring(0,60),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            href: href || '',
            cursor: window.getComputedStyle(el).cursor,
          });
        }
      }
    });
    return result;
  })()`);
  
  console.log('Elements with "关注+number":', JSON.stringify(elements, null, 2));
  
  // Click each element
  for (const el of elements) {
    const cx = Math.round(el.x + el.w/2);
    const cy = Math.round(el.y + el.h/2);
    
    console.log(`\nClicking "${el.text}" at (${cx}, ${cy}) [${el.tag}${el.href?' href='+el.href:''}]`);
    
    // CDP click
    await cdp.click(cx, cy);
    await sleep(3000);
    
    // JS click on the DOM element
    await cdp.js(`(function(){
      const el = document.elementFromPoint(${cx}, ${cy});
      if (el) {
        // Also try parent chain
        let p = el;
        for (let i=0; i<6 && p; i++) {
          if (p.tagName === 'A' && p.href) {
            p.click();
            break;
          }
          p.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,clientX:${cx},clientY:${cy}}));
          p = p.parentElement;
        }
        return 'clicked chain';
      }
      return 'no element';
    })()`);
    await sleep(3000);
    
    // Check URL and page state
    const newUrl = await cdp.js(`(function(){ return location.href; })()`);
    console.log('  URL:', newUrl);
    
    // Check for any modal/popup that appeared
    const modalCheck = await cdp.js(`(function(){
      const modals = [];
      document.querySelectorAll('div[class*="modal"], div[class*="drawer"], div[class*="popup"], div[class*="panel"], div[class*="Dialog"]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 200 && r.height > 200) {
          modals.push({ cls: el.className?.substring(0,60), text: el.textContent?.substring(0,100) });
        }
      });
      return modals;
    })()`);
    console.log('  Modals:', JSON.stringify(modalCheck));
    
    // Check for "已关注" buttons (these indicate a following list)
    const followBtns = await cdp.js(`(function(){
      let count = 0;
      document.querySelectorAll('*').forEach(el => {
        const t = (el.textContent||'').trim();
        if (el.children.length===0 && ['已关注'].includes(t)) {
          const r = el.getBoundingClientRect();
          if (r.width>0 && r.height>0) count++;
        }
      });
      return count;
    })()`);
    console.log('  "已关注" buttons:', followBtns);
    
    if (followBtns > 10 || modalCheck.length > 0) {
      console.log('\n✅ FOUND SOMETHING!');
      break;
    }
    
    // Go back if URL changed
    if (newUrl !== currentUrl && !newUrl.includes('follow')) {
      await cdp.cmd('Page.navigate', { url: currentUrl });
      await sleep(3000);
    }
    
    currentUrl = await cdp.js(`(function(){ return location.href; })()`);
  }
  
  // Final screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_list_found.png'), Buffer.from(ss.data, 'base64'));
  console.log('\nFinal screenshot saved');
  
  // Current state
  const state = await cdp.js(`(function(){
    return { url: location.href, body: (document.body?.innerText||'').substring(0, 800) };
  })()`);
  console.log('Final state:', state.url);
  console.log('Body:', state.body);
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
