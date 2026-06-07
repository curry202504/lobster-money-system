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
  async click(x,y) {
    await this.cmd('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
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
  
  await sleep(3000);
  
  // 1. Get sidebar links
  console.log('=== Sidebar navigation ===');
  const sidebar = await cdp.js(`(function(){
    // Find the left sidebar
    const nav = [];
    document.querySelectorAll('a').forEach(a => {
      const t = a.textContent?.trim() || '';
      const r = a.getBoundingClientRect();
      if (r.x < 200 && r.width > 0 && t.length < 10) {
        nav.push({ text: t, href: a.href, x: Math.round(r.x), y: Math.round(r.y) });
      }
    });
    return nav;
  })()`);
  console.log('Sidebar links:', JSON.stringify(sidebar, null, 2));
  
  // 2. Click the "关注" sidebar link
  const followLink = sidebar.find(s => s.text === '关注');
  if (followLink) {
    console.log(`\nClicking "关注" sidebar link at (${followLink.x+50}, ${followLink.y+10})`);
    await cdp.click(followLink.x+50, followLink.y+10);
    await sleep(5000);
  }
  
  // 3. Check where we landed
  const after = await cdp.js(`(function(){
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) btns.push({text:t, x:Math.round(r.x), y:Math.round(r.y)});
      }
    });
    return { url: location.href, title: document.title, followBtns: btns.length, body: (document.body?.innerText||'').substring(0, 500) };
  })()`);
  
  console.log('After click:', after.url);
  console.log('Title:', after.title);
  console.log('Follow btns:', after.followBtns);
  console.log('Body:', after.body);
  
  // 4. If still on profile, try clicking "关注" count
  if (after.url.includes('user/self')) {
    console.log('\n=== Still on profile, trying to click follow stats ===');
    
    // Click "关注1510" element 
    const statClick = await cdp.js(`(function() {
      const el = document.querySelector('.IvVtgRz2');
      if (!el) {
        // Find any div containing "关注" and a number near it
        const divs = document.querySelectorAll('div');
        for (const d of divs) {
          if (d.textContent?.match(/关注\\s*\\d/) && d.getBoundingClientRect().width < 250) {
            const r = d.getBoundingClientRect();
            d.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
            d.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
            d.click();
            return { clicked: true, cls: d.className, x: Math.round(r.x), y: Math.round(r.y) };
          }
        }
        return { error: 'not found' };
      }
      el.click();
      return { clicked: true, cls: 'IvVtgRz2', text: el.textContent };
    })()`);
    console.log('Stat click:', JSON.stringify(statClick));
    await sleep(4000);
  }
  
  // 5. Final state
  const final = await cdp.js(`(function(){
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) btns.push({text:t, x:Math.round(r.x), y:Math.round(r.y)});
      }
    });
    return { url: location.href, title: document.title, followBtns: btns.length, sample: btns.slice(0,15) };
  })()`);
  
  console.log('\nFinal:', final.url);
  console.log('Follow btns:', final.followBtns, final.sample);
  
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_final.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
