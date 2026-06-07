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
  async clickAt(x, y) {
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
  
  // Find the exact "关注" element with count
  console.log('Finding "关注1510" element...');
  const el = await cdp.js(`(function() {
    // Find all elements, look for the div containing "关注1510" but not the whole profile card
    const candidates = [];
    document.querySelectorAll('div, span, a').forEach(el => {
      const t = el.textContent?.trim() || '';
      if (t.startsWith('关注') && /\\d/.test(t) && t.length < 20) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.width < 300) {
          candidates.push({
            text: t,
            tag: el.tagName,
            cls: el.className?.substring(0, 80),
            x: r.x, y: r.y, w: r.width, h: r.height,
            centerX: Math.round(r.x + r.width/2),
            centerY: Math.round(r.y + r.height/2),
          });
        }
      }
    });
    return candidates;
  })()`);
  
  console.log('Found:', JSON.stringify(el, null, 2));
  
  if (el && el.length > 0) {
    // Pick the one with the right class or text
    const target = el.find(e => e.cls?.includes('Sxrus2d_')) || el[0];
    console.log(`\nClicking "${target.text}" at (${target.centerX}, ${target.centerY})`);
    await cdp.clickAt(target.centerX, target.centerY);
    console.log('Clicked!');
  }
  
  await sleep(4000);
  
  // Check what happened
  const result = await cdp.js(`(function() {
    // Check for any modal or new page
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
      bodyPreview: (document.body?.innerText||'').substring(0, 2000),
      followBtnCount: btns.length,
      sample: btns.slice(0, 20),
    };
  })()`);
  
  console.log('\nAfter click:');
  console.log('  URL:', result.url);
  console.log('  Title:', result.title);
  console.log('  Follow buttons:', result.followBtnCount);
  console.log('  Sample:', result.sample);
  console.log('  Body:', result.bodyPreview?.substring(0, 600));
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_follow_list.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
