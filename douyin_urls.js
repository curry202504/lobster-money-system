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
  await sleep(5000);
  
  // Try navigating directly to different following-related URLs
  const urls = [
    'https://www.douyin.com/user/self?showTab=follow',
    'https://www.douyin.com/user/self?showTab=following',
    'https://www.douyin.com/following',
    'https://www.douyin.com/relation/follow',
  ];
  
  for (const url of urls) {
    console.log(`\n=== Trying: ${url} ===`);
    await cdp.cmd('Page.navigate', { url });
    await sleep(6000);
    
    const state = await cdp.js(`(function(){
      const btns = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.textContent||'').trim();
        if (el.children.length===0 && ['已关注','关注','回关','朋友'].includes(t)) {
          const r = el.getBoundingClientRect();
          if (r.width>0 && r.height>0) btns.push({text:t, x:Math.round(r.x), y:Math.round(r.y)});
        }
      });
      return {
        url: location.href,
        title: document.title,
        followBtns: btns.length,
        sample: btns.slice(0, 15),
        bodyPreview: (document.body?.innerText||'').substring(0, 300),
      };
    })()`);
    
    console.log('  URL:', state.url);
    console.log('  Title:', state.title);
    console.log('  Follow btns:', state.followBtns, state.sample);
    console.log('  Body:', state.bodyPreview);
    
    if (state.followBtns > 4) break; // Found the following list!
  }
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_explore.png'), Buffer.from(ss.data, 'base64'));
  console.log('\nScreenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
