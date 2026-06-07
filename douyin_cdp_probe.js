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
  
  async js(code) {
    const r = await this.cmd('Runtime.evaluate', { expression: `(${code})()`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  
  async screenshot(filePath) {
    const r = await this.cmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(r.data, 'base64'));
  }
  
  close() { if (this.ws) this.ws.close(); }
}

async function main() {
  try {
    // Connect to douyin page
    const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
    console.log('Targets:');
    targets.forEach(t => console.log(`  [${t.type}] ${t.title} | ${t.url.substring(0, 80)}`));
    
    const douyinPage = targets.find(t => t.type === 'page' && t.url.includes('douyin.com'));
    if (!douyinPage) throw new Error('No douyin page found');
    
    console.log('\nConnecting to:', douyinPage.title);
    const cdp = new CDP(douyinPage.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.cmd('Page.enable');
    await cdp.cmd('Runtime.enable');
    
    // Check current URL
    const currentUrl = await cdp.js(function() { return location.href; });
    console.log('Current URL:', currentUrl);
    
    // Navigate to following page if needed
    const followUrl = 'https://www.douyin.com/user/self?showTab=follow';
    if (currentUrl !== followUrl) {
      console.log('Navigating to following page...');
      await cdp.cmd('Page.navigate', { url: followUrl });
      await sleep(8000);
      
      const newUrl = await cdp.js(function() { return location.href; });
      console.log('After nav URL:', newUrl);
    }
    
    // Check page state
    const pageInfo = await cdp.js(function() {
      const btns = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.textContent || '').trim();
        if (el.children.length === 0 && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(t)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) btns.push({ text: t, tag: el.tagName, cls: el.className?.substring(0, 60) });
        }
      });
      return {
        title: document.title,
        url: location.href,
        bodyPreview: document.body?.innerText?.substring(0, 1000) || '',
        followBtnCount: btns.length,
        followBtnSample: btns.slice(0, 10),
      };
    });
    
    console.log('\nPage info:');
    console.log('  Title:', pageInfo.title);
    console.log('  URL:', pageInfo.url);
    console.log('  Follow buttons:', pageInfo.followBtnCount);
    console.log('  Body:', pageInfo.bodyPreview?.substring(0, 500));
    
    // Screenshot
    const ss = path.join(__dirname, 'douyin_current.png');
    await cdp.screenshot(ss);
    console.log('Screenshot:', ss);
    
    // Save report
    fs.writeFileSync(path.join(__dirname, 'douyin_report.json'), JSON.stringify(pageInfo, null, 2));
    console.log('\n✅ Done');
    
    cdp.close();
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
