// douyin_full_auto.js - Start Chrome + Connect + Analyze
const { execSync } = require('child_process');
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
  async js(fn) {
    const r = await this.cmd('Runtime.evaluate', { 
      expression: `(${fn.toString()})()`, 
      returnByValue: true, 
      awaitPromise: true 
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function startChrome() {
  const tempDir = process.env.TEMP + '\\chrome_dev_profile';
  const userDataDir = process.env.LOCALAPPDATA + '\\Google\\Chrome\\User Data';
  
  // Ensure junction
  try {
    execSync(`taskkill /F /IM chrome.exe 2>nul & taskkill /F /IM agent-browser-win32-x64.exe 2>nul`, { timeout: 5000 });
  } catch(e) {}
  await sleep(3000);
  
  if (!fs.existsSync(tempDir)) {
    execSync(`cmd /c "mklink /J "${tempDir}" "${userDataDir}""`, { timeout: 5000 });
  }
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  execSync(`start "" "${chromePath}" --remote-debugging-port=9222 --user-data-dir="${tempDir}" "https://www.douyin.com/user/self?showTab=follow"`, { timeout: 5000 });
  console.log('Chrome started, waiting...');
  await sleep(10000);
  
  // Verify CDP
  for (let i = 0; i < 10; i++) {
    try {
      await httpGet('http://localhost:9222/json/version');
      console.log('CDP ready!');
      return true;
    } catch(e) {
      await sleep(2000);
    }
  }
  throw new Error('CDP not ready');
}

async function main() {
  await startChrome();
  
  // Get targets
  const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
  const page = targets.find(t => t.type === 'page' && t.url.includes('douyin.com'));
  if (!page) throw new Error('No douyin page');
  
  console.log('Page:', page.title, '|', page.url);
  
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  
  // Wait for page to fully load
  await sleep(5000);
  
  // --- ANALYSIS ---
  console.log('\n=== ANALYZING PAGE ===\n');
  
  const info = await cdp.js(function() {
    // Current state
    const state = {
      title: document.title,
      url: location.href,
      bodyPreview: document.body?.innerText?.substring(0, 500) || '',
    };
    
    // All follow-related elements
    const followEls = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent || '').trim();
      if (el.children.length === 0 && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          followEls.push({
            text: t, tag: el.tagName,
            cls: el.className?.substring(0, 80),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            clickable: el.onclick !== null || el.getAttribute('role') === 'button' || el.tagName === 'BUTTON',
            html: el.outerHTML?.substring(0, 200),
          });
        }
      }
    });
    state.followElements = followEls;
    
    // Scrollable containers
    const scrollContainers = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 400) {
        scrollContainers.push({
          tag: el.tagName, cls: el.className?.substring(0, 80),
          clientH: el.clientHeight, scrollH: el.scrollHeight,
          children: el.children.length,
        });
      }
    });
    state.scrollContainers = scrollContainers.slice(0, 5);
    
    // User list items
    const userCards = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length >= 2 && el.children.length <= 15) {
        const r = el.getBoundingClientRect();
        if (r.width > 250 && r.height > 50 && r.height < 150) {
          const hasFollow = el.textContent?.includes('已关注') || el.textContent?.includes('关注');
          const hasAvatar = !!el.querySelector('img');
          if (hasFollow) {
            userCards.push({
              cls: el.className?.substring(0, 80),
              text: el.textContent?.substring(0, 100),
              hasAvatar, hasFollow,
              w: Math.round(r.width), h: Math.round(r.height),
            });
          }
        }
      }
    });
    state.userCards = userCards.slice(0, 10);
    
    return state;
  });
  
  console.log('Page:', info.title, '|', info.url);
  console.log('Body preview:', info.bodyPreview);
  console.log('Follow elements:', info.followElements.length);
  info.followElements.forEach((f, i) => {
    console.log(`  [${i}] "${f.text}" <${f.tag}>${f.clickable?' CLICKABLE':''} at(${f.x},${f.y}) class="${f.cls}"`);
    console.log(`      HTML: ${f.html}`);
  });
  console.log('Scroll containers:', JSON.stringify(info.scrollContainers, null, 2));
  console.log('User cards:', JSON.stringify(info.userCards, null, 2));
  
  fs.writeFileSync(path.join(__dirname, 'douyin_analysis.json'), JSON.stringify(info, null, 2));
  console.log('\n✅ Saved to douyin_analysis.json');
  
  cdp.close();
}

main().catch(e => { console.error(e.message); console.error(e.stack); });
