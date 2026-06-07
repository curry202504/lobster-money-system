const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

class CDP {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.ws = null; this.msgId = 0; this.pending = new Map(); }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
        }
      });
      this.ws.on('error', reject);
    });
  }
  async cmd(method, params = {}) { 
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async js(fnCode) {
    const r = await this.cmd('Runtime.evaluate', { expression: fnCode, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function main() {
  const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
  const page = targets.find(t => t.type === 'page' && t.url.includes('douyin.com'));
  if (!page) throw new Error('No douyin page');
  
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  
  // Strategy: Click the sidebar "关注" navigation using proper React event simulation
  console.log('=== Attempting sidebar click with full React event simulation ===\n');
  
  const clickResult = await cdp.js(`(function() {
    // Find the sidebar "关注" link (not profile stat)
    const sidebarFollow = document.querySelector('.sU4_QaCR');
    if (!sidebarFollow) {
      // Try broader search
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent === '关注' && span.className?.includes('sU4_QaCR')) {
          sidebarFollow = span;
          break;
        }
      }
    }
    
    if (!sidebarFollow) return { error: 'Not found' };
    
    console.log('Found sidebar follow:', sidebarFollow.outerHTML?.substring(0, 200));
    
    // Simulate proper click with React event system
    const rect = sidebarFollow.getBoundingClientRect();
    
    // Use MouseEvent with proper React-compatible properties
    const events = ['mousedown', 'mouseup', 'click'];
    for (const eventType of events) {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
        button: 0,
      });
      sidebarFollow.dispatchEvent(event);
    }
    
    // Also try clicking the parent element
    const parent = sidebarFollow.parentElement;
    if (parent) {
      for (const eventType of events) {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
          button: 0,
        });
        parent.dispatchEvent(event);
      }
    }
    
    return { 
      clicked: true, 
      text: sidebarFollow.textContent, 
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      parentTag: parent?.tagName,
      parentCls: parent?.className?.substring(0, 60),
    };
  })()`);
  
  console.log('Sidebar click:', JSON.stringify(clickResult, null, 2));
  
  await sleep(4000);
  
  // Check if page changed
  const newState = await cdp.js(`(function() {
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) btns.push({text:t, cls:el.className?.substring(0,50), x:Math.round(r.x), y:Math.round(r.y)});
      }
    });
    return {
      url: location.href,
      title: document.title,
      bodyPreview: (document.body?.innerText||'').substring(0, 1500),
      followBtnCount: btns.length,
      sample: btns.slice(0, 30),
    };
  })()`);
  
  console.log('\nAfter sidebar click:');
  console.log('  URL:', newState.url);
  console.log('  Title:', newState.title);
  console.log('  Follow buttons:', newState.followBtnCount, newState.sample);
  console.log('  Body:', newState.bodyPreview?.substring(0, 500));
  
  // Also try navigating directly
  console.log('\n=== Trying direct URL navigation ===');
  await cdp.js(`(function(){ location.href = 'https://www.douyin.com/user/self?showTab=following'; })()`);
  await sleep(5000);
  
  const afterNav = await cdp.js(`(function() {
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) btns.push({text:t, cls:el.className?.substring(0,50), x:Math.round(r.x), y:Math.round(r.y)});
      }
    });
    return {
      url: location.href,
      title: document.title,
      bodyPreview: (document.body?.innerText||'').substring(0, 1500),
      followBtnCount: btns.length,
      sample: btns.slice(0, 30),
    };
  })()`);
  
  console.log('After nav to /following:');
  console.log('  URL:', afterNav.url);
  console.log('  Title:', afterNav.title);
  console.log('  Follow buttons:', afterNav.followBtnCount);
  console.log('  Body:', afterNav.bodyPreview?.substring(0, 500));
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_after_sidebar.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
