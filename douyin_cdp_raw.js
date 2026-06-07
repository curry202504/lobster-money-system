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
  constructor(wsUrl) {
    this.ws = null;
    this.msgId = 0;
    this.pending = new Map();
    this.wsUrl = wsUrl;
  }
  
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
  
  async eval(expression) {
    const r = await this.cmd('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  
  async screenshot(filePath) {
    const r = await this.cmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(r.data, 'base64'));
    console.log('Screenshot:', filePath);
  }
  
  close() { if (this.ws) this.ws.close(); }
}

async function main() {
  try {
    // 1. List targets
    console.log('Fetching targets...');
    const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
    console.log(`Found ${targets.length} targets`);
    targets.forEach(t => console.log(`  ${t.type}: ${t.url.substring(0, 100)}`));
    
    // 2. Find a page target
    let pageTarget = targets.find(t => t.type === 'page' && t.url.includes('douyin.com'));
    if (!pageTarget) pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
    
    // Connect to it
    let cdp;
    if (pageTarget) {
      console.log('\nConnecting to page:', pageTarget.title);
      cdp = new CDP(pageTarget.webSocketDebuggerUrl);
    } else {
      // Connect to browser target and create a page
      console.log('\nNo pages, connecting to browser...');
      const versionJson = await httpGet('http://localhost:9222/json/version');
      const wsUrl = JSON.parse(versionJson).webSocketDebuggerUrl;
      cdp = new CDP(wsUrl);
      await cdp.connect();
      const r = await cdp.cmd('Target.createTarget', { url: 'about:blank' });
      console.log('Created target:', r.targetId);
      cdp.close();
      
      // Reconnect to the new page
      const newTargets = JSON.parse(await httpGet('http://localhost:9222/json'));
      pageTarget = newTargets.find(t => t.type === 'page');
      console.log('New page target:', pageTarget?.url);
      cdp = new CDP(pageTarget.webSocketDebuggerUrl);
    }
    
    await cdp.connect();
    console.log('CDP connected!');
    
    // 3. Enable Page domain
    await cdp.cmd('Page.enable');
    
    // 4. Navigate to following page
    console.log('\nNavigating to following page...');
    await cdp.cmd('Page.navigate', { url: 'https://www.douyin.com/user/self?showTab=follow' });
    await sleep(5000);
    
    // 5. Check current page
    const pageInfo = await cdp.eval(`(function(){
      return { title: document.title, url: location.href, body: document.body?.innerText?.substring(0, 800) || 'no body' };
    })()`);
    console.log('Page:', JSON.stringify(pageInfo, null, 2));
    
    // 6. Screenshot
    await cdp.screenshot(path.join(__dirname, 'douyin_cdp.png'));
    
    // 7. DOM probe
    console.log('\n=== DOM Probe ===');
    const probe = await cdp.eval(`(function(){
      const btns = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.textContent||'').trim();
        if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
          const rect = el.getBoundingClientRect();
          if (rect.width>0 && rect.height>0) {
            btns.push({
              text:t, tag:el.tagName,
              cls: el.className?.substring(0,80),
              parentCls: el.parentElement?.className?.substring(0,80),
            });
          }
        }
      });
      return { followButtons: btns, total: btns.length };
    })()`);
    console.log('Follow buttons:', JSON.stringify(probe, null, 2));
    
    // Save
    fs.writeFileSync(path.join(__dirname, 'douyin_report.json'), JSON.stringify(probe, null, 2));
    console.log('\n✅ Report saved');
    
    cdp.close();
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
