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
  await cdp.cmd('DOM.enable');
  
  console.log('=== Step 1: Find and click "关注" to open following list ===\n');
  
  // Find the clickable "关注" element(s) and their context
  const clickTargets = await cdp.js(`(function() {
    const targets = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && t === '关注') {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0 && r.y > 300) {
          // Look at parents for context
          let p = el.parentElement;
          for (let i=0; i<4 && p; i++) {
            const pText = (p.textContent||'').trim();
            if (pText.includes('1510') || pText.includes('粉丝') || pText.includes('直播')) {
              targets.push({
                tag: el.tagName, cls: el.className,
                x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height),
                parentCls: p.className?.substring(0,80),
                parentText: pText.substring(0,80),
                level: i,
              });
              break;
            }
            p = p.parentElement;
          }
        }
      }
    });
    return targets;
  })()`);
  
  console.log('Clickable "关注" targets:', JSON.stringify(clickTargets, null, 2));
  
  // Try clicking each "关注" element that might open the following list
  // Strategy: click using DOM events
  console.log('\nClicking first target...');
  const clicked = await cdp.js(`(function() {
    // Find all "关注" spans/divs that are likely tabs
    const candidates = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && t === '关注') {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0 && r.y > 300) {
          candidates.push(el);
        }
      }
    });
    
    if (candidates.length > 0) {
      // Try clicking the first one
      const el = candidates[0];
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return { clicked: true, tag: el.tagName, cls: el.className };
    }
    return { clicked: false };
  })()`);
  console.log('Click result:', clicked);
  
  await sleep(4000);
  
  // Check current URL
  const currentUrl = await cdp.js(`(function(){ return location.href; })()`);
  console.log('URL after click:', currentUrl);
  
  // Check page content
  const newState = await cdp.js(`(function() {
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) btns.push({
          text:t, tag:el.tagName, cls:el.className?.substring(0,60),
          x:Math.round(r.x), y:Math.round(r.y),
        });
      }
    });
    return {
      title: document.title,
      url: location.href,
      bodyPreview: (document.body?.innerText||'').substring(0, 1000),
      followBtnCount: btns.length,
      followBtns: btns.slice(0, 20),
    };
  })()`);
  
  console.log('\nAfter click:');
  console.log('  Title:', newState.title);
  console.log('  URL:', newState.url);
  console.log('  Follow buttons:', newState.followBtnCount);
  newState.followBtns.forEach((b,i) => console.log(`    [${i}] "${b.text}" <${b.tag}> at(${b.x},${b.y})`));
  console.log('  Body:', newState.bodyPreview?.substring(0, 500));
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_after_click.png'), Buffer.from(ss.data, 'base64'));
  console.log('\nScreenshot saved');
  
  fs.writeFileSync(path.join(__dirname, 'douyin_state.json'), JSON.stringify(newState, null, 2));
  console.log('✅ Done');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
