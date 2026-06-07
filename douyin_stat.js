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
  
  // Go back to clean profile page
  await cdp.cmd('Page.navigate', { url: 'https://www.douyin.com/user/self' });
  await sleep(6000);
  
  // Click the "关注1509" element using JS directly, targeting its specific class
  console.log('Clicking "关注1509" stat element...');
  const result = await cdp.js(`(async function(){
    // Find the specific element
    const el = document.querySelector('.Sxrus2d_.K8tYuhd8');
    if (!el) return { error: 'Not found', all: [...document.querySelectorAll('[class*="Sxrus2d"]')].map(e=>e.textContent?.substring(0,50)) };
    
    const r = el.getBoundingClientRect();
    console.log('Found:', el.textContent, 'at', r.x, r.y);
    
    // Dispatch full click sequence on the element itself
    const cx = r.x + r.width/2;
    const cy = r.y + r.height/2;
    
    // Try mousedown/mouseup/click on element
    ['mousedown','mouseup','click'].forEach(type => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 }));
    });
    
    // Also try on parent
    if (el.parentElement) {
      ['mousedown','mouseup','click'].forEach(type => {
        el.parentElement.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 }));
      });
    }
    
    // Try using the __vue__ or __react event system
    const vueInstance = el.__vue__ || el.__vue_parent || el.__vue_event__;
    const reactFiber = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    
    // Try native click
    el.click();
    
    // Wait a bit and check
    await new Promise(r => setTimeout(r, 2000));
    
    return { 
      clicked: true, 
      text: el.textContent?.substring(0,50),
      hasVue: !!vueInstance,
      hasReact: !!reactFiber,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  })()`);
  
  console.log('Click result:', JSON.stringify(result));
  await sleep(3000);
  
  // Check what happened
  const state = await cdp.js(`(function(){
    // Check for modal/following list
    const modals = [];
    document.querySelectorAll('div[class*="modal"], div[class*="drawer"], div[class*="panel"], div[class*="Dialog"], div[class*="popup"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width>200 && r.height>200) modals.push({cls:el.className?.substring(0,60), text:el.textContent?.substring(0,100)});
    });
    
    // Check for "已关注" buttons (indicator of following list)
    let followBtnCount = 0;
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) followBtnCount++;
      }
    });
    
    return {
      url: location.href,
      body: (document.body?.innerText||'').substring(0, 600),
      modals,
      followBtnCount,
    };
  })()`);
  
  console.log('\nAfter click:');
  console.log('URL:', state.url);
  console.log('Modals:', state.modals.length);
  console.log('Follow btns:', state.followBtnCount);
  console.log('Body:', state.body);
  
  // If the page changed URL or a modal appeared, print detail
  if (state.modals.length > 0) {
    console.log('Modal details:', state.modals.map(m => m.cls + ': ' + m.text).join('\n'));
  }
  
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_follow_stat.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
