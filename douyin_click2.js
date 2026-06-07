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
  async click(x, y) {
    await this.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await this.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
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

  
  // Find the "关注 1510" element and get its coordinates
  const clickTargets = await cdp.js(`(function() {
    const all = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && t==='关注') {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) {
          all.push({
            x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2),
            tag: el.tagName, cls: el.className?.substring(0,60),
            text: t, w: Math.round(r.width), h: Math.round(r.height),
          });
        }
      }
    });
    
    // Also find elements containing "1510" near "关注"
    const withCount = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (t.includes('关注') && t.includes('1510')) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) {
          withCount.push({
            x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2),
            tag: el.tagName, cls: el.className?.substring(0,60),
            text: t.substring(0,80),
          });
        }
      }
    });
    
    return { followTexts: all, withCount: withCount };
  })()`);
  
  console.log('Follow text elements:', JSON.stringify(clickTargets.followTexts, null, 2));
  console.log('Elements with "关注 1510":', JSON.stringify(clickTargets.withCount, null, 2));
  
  // Click the element that shows "关注" with count
  if (clickTargets.withCount.length > 0) {
    const t = clickTargets.withCount[0];
    console.log(`\nClicking: "${t.text}" at (${t.x}, ${t.y})`);
    await cdp.click(t.x, t.y);
    console.log('Clicked!');
  } else {
    // Fallback: click the "关注" div at (744, 116) center
    const fallback = clickTargets.followTexts.find(f => f.x > 700);
    if (fallback) {
      console.log(`\nFallback click at (${fallback.x}, ${fallback.y})`);
      await cdp.click(fallback.x, fallback.y);
    }
  }
  
  await sleep(3000);
  
  // Navigate directly to the following page via URL
  console.log('\nAlso trying direct navigation...');
  await cdp.cmd('Page.navigate', { url: 'https://www.douyin.com/user/self?showTab=follow' });
  await sleep(5000);
  
  // Check results
  const result = await cdp.js(`(function() {
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) btns.push({text:t, cls:el.className?.substring(0,40)});
      }
    });
    return {
      url: location.href,
      title: document.title,
      bodyPreview: (document.body?.innerText||'').substring(0, 1500),
      followBtnCount: btns.length,
      sample: btns.slice(0, 15),
    };
  })()`);
  
  console.log('\nResult:');
  console.log('  URL:', result.url);
  console.log('  Title:', result.title);
  console.log('  Body:', result.bodyPreview?.substring(0, 600));
  console.log('  Follow buttons:', result.followBtnCount, result.sample);
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_result.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
