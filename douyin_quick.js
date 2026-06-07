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
    const r = await this.cmd('Runtime.evaluate', { 
      expression: fnCode, 
      returnByValue: true, 
      awaitPromise: true 
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function main() {
  const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
  const page = targets.find(t => t.type === 'page' && t.url.includes('douyin.com'));
  if (!page) { console.log('Targets:', targets.map(t=>t.type+':'+t.url.substring(0,60))); throw new Error('No douyin page'); }
  
  console.log('Page:', page.title, page.url);
  
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  
  await sleep(3000);
  
  // 1. Get page state
  const info = await cdp.js(`(function() {
    return {
      title: document.title,
      url: location.href,
      bodyPreview: (document.body?.innerText || '').substring(0, 800),
    };
  })()`);
  console.log('Title:', info.title);
  console.log('URL:', info.url);
  console.log('Body:', info.bodyPreview);
  
  // 2. Find all follow buttons with full context
  const btns = await cdp.js(`(function() {
    const result = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) {
          // Walk up to find parent card
          let card = el;
          for (let i=0; i<8; i++) {
            card = card.parentElement;
            if (!card) break;
            const cardText = card.textContent||'';
            // Check if this parent contains user info pattern
            if (cardText.length > 10 && cardText.length < 200 && card.children.length >= 2) {
              break;
            }
          }
          result.push({
            text:t, tag:el.tagName,
            cls: el.className?.substring(0,80),
            x:Math.round(r.x), y:Math.round(r.y),
            w:Math.round(r.width), h:Math.round(r.height),
            html: el.outerHTML?.substring(0,200),
            cardCls: card?.className?.substring(0,80),
            cardText: card?.textContent?.substring(0,80),
          });
        }
      }
    });
    return result;
  })()`);
  
  console.log(`\nFound ${btns.length} follow elements:`);
  btns.forEach((b,i) => {
    console.log(`  [${i}] "${b.text}" <${b.tag}> at(${b.x},${b.y}) class="${b.cls}"`);
    console.log(`      HTML: ${b.html}`);
    console.log(`      Card: ${b.cardCls} "${b.cardText}"`);
  });
  
  // 3. Find scrollable list and scroll to load more
  console.log('\n=== Scrolling to load more ===');
  for (let i = 0; i < 3; i++) {
    await cdp.js(`(function() {
      const scrollables = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 400 && el.clientHeight < 2000) {
          scrollables.push(el);
        }
      });
      if (scrollables.length > 0) {
        const target = scrollables[0];
        target.scrollTop = target.scrollHeight;
      }
      return scrollables.length;
    })()`);
    await sleep(2000);
  }
  
  // 4. Re-count follow buttons after scrolling
  const btns2 = await cdp.js(`(function() {
    let count = 0;
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) count++;
      }
    });
    return count;
  })()`);
  console.log(`\nFollow buttons after scroll: ${btns2} (was ${btns.length})`);
  
  // 5. Screenshot
  console.log('\nTaking screenshot...');
  const ssData = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  const ssPath = path.join(__dirname, 'douyin_after_scroll.png');
  fs.writeFileSync(ssPath, Buffer.from(ssData.data, 'base64'));
  console.log('Screenshot:', ssPath);
  
  fs.writeFileSync(path.join(__dirname, 'douyin_analysis.json'), JSON.stringify({btns, btnsAfterScroll: btns2, info}, null, 2));
  console.log('✅ Done');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
