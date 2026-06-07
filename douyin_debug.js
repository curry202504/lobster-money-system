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
        if(msg.id && this.pending.has(msg.id)) { const p=this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
      });
      this.ws.on('error', reject);
    });
  }
  async cmd(m, p={}) { const id=++this.msgId; return new Promise((res,rej) => { this.pending.set(id,{resolve:res,reject:rej}); this.ws.send(JSON.stringify({id,method:m,params:p})); }); }
  async js(fn) { const r=await this.cmd('Runtime.evaluate',{expression:fn,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result?.value; }
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
  
  // Check what page we're on
  const state = await cdp.js(`(function(){
    return {
      url: location.href,
      sqBtns: document.querySelectorAll('.Sq162AQL').length,
      nixO41kD: document.querySelectorAll('.nixO41kD').length,
      body: (document.body?.innerText||'').substring(0, 500),
    };
  })()`);
  
  console.log('Current state:', JSON.stringify(state, null, 2));
  
  // Try to re-open following list
  console.log('\nTrying to open following list...');
  const opened = await cdp.js(`(function(){
    const el = document.querySelector('.Sxrus2d_.K8tYuhd8');
    if (el) {
      const r = el.getBoundingClientRect();
      console.log('Found stat el at', r.x, r.y);
      el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));
      el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));
      el.click();
      return true;
    }
    return false;
  })()`);
  console.log('Opened:', opened);
  await sleep(4000);
  
  // Check for following list panel
  const panel = await cdp.js(`(function(){
    const panels = [];
    document.querySelectorAll('div').forEach(el => {
      const r = el.getBoundingClientRect();
      // Look for a right-side panel with user list
      if (r.x > 600 && r.width > 300 && r.height > 300) {
        const text = el.textContent || '';
        if (text.includes('已关注') || text.includes('关注')) {
          panels.push({
            cls: el.className?.substring(0,80),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            clientH: el.clientHeight, scrollH: el.scrollHeight,
            children: el.children.length,
            hasScroll: el.scrollHeight > el.clientHeight,
          });
        }
      }
    });
    return panels;
  })()`);
  
  console.log('\nFollowing list panels:', JSON.stringify(panel, null, 2));
  
  // If a panel is found, try scrolling it
  if (panel.length > 0) {
    const p = panel[0];
    console.log(`\nScrolling panel "${p.cls}" to bottom...`);
    
    // Try different scroll approaches
    for (let i = 0; i < 10; i++) {
      await cdp.js(`(function(){
        // Try all scrollable elements in the right panel
        const all = document.querySelectorAll('div');
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.x > 600 && r.width > 300 && el.scrollHeight > el.clientHeight + 50) {
            el.scrollTop += el.clientHeight;
            return { cls: el.className?.substring(0,60), scrollTop: el.scrollTop, scrollH: el.scrollHeight };
          }
        }
        window.scrollBy(0, 500);
        return { window: window.scrollY };
      })()`);
      await sleep(1500);
    }
  }
  
  // Check current buttons
  const btns = await cdp.js(`(function(){
    let count=0, visible=0;
    document.querySelectorAll('.Sq162AQL').forEach(b => {
      if (b.textContent?.trim()==='已关注') {
        count++;
        if (b.getBoundingClientRect().width>0) visible++;
      }
    });
    return { total: count, visible };
  })()`);
  
  console.log('\nAfter scroll:');
  console.log('  已关注 total:', btns.total);
  console.log('  已关注 visible:', btns.visible);
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_debug_scroll.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
