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
  async click(selector) {
    await this.js(function(s) {
      const el = document.querySelector(s);
      if (el) el.click();
    }.toString().replace('function(s)', 'function() { const s = ' + JSON.stringify(selector) + '; '));
  }
  close() { if (this.ws) this.ws.close(); }
}

async function main() {
  const targets = JSON.parse(await httpGet('http://localhost:9222/json'));
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('douyin.com'));
  if (!pageTarget) throw new Error('No douyin page');
  
  const cdp = new CDP(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  
  console.log('=== Deep DOM Analysis ===\n');
  
  // 1. Find the main content area
  const layout = await cdp.js(function() {
    // Find main content containers
    const containers = [];
    document.querySelectorAll('div, section, main, ul').forEach(el => {
      const rect = el.getBoundingClientRect();
      const children = el.children.length;
      const text = el.textContent?.substring(0, 200) || '';
      if (rect.width > 300 && rect.height > 300 && children > 2 && children < 60) {
        containers.push({
          tag: el.tagName,
          id: el.id || '',
          cls: el.className?.substring(0, 80),
          children: children,
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          text: text.substring(0, 100),
        });
      }
    });
    return containers.slice(0, 20);
  });
  console.log('Containers:', JSON.stringify(layout, null, 2));
  
  // 2. Find the following list specifically
  const listInfo = await cdp.js(function() {
    const result = { tabs: [], lists: [] };
    
    // Find tab elements with counts
    document.querySelectorAll('*').forEach(el => {
      const t = el.textContent?.trim() || '';
      if (t.match(/^(关注|粉丝|朋友|作品|喜欢|收藏)\s*\d*$/)) {
        const r = el.getBoundingClientRect();
        result.tabs.push({ text: t, tag: el.tagName, cls: el.className?.substring(0, 60) });
      }
    });
    
    // Find scrollable containers that might be the following list
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.height > 400 && r.width > 300 && el.scrollHeight > el.clientHeight + 100) {
        const childCount = el.children.length;
        const firstChildText = el.children[0]?.textContent?.trim().substring(0, 100);
        result.lists.push({
          tag: el.tagName, cls: el.className?.substring(0, 80),
          clientH: el.clientHeight, scrollH: el.scrollHeight,
          children: childCount,
          firstChild: firstChildText,
        });
      }
    });
    
    return result;
  });
  console.log('\nTabs:', JSON.stringify(listInfo.tabs, null, 2));
  console.log('Scrollable lists:', JSON.stringify(listInfo.lists, null, 2));
  
  // 3. Find user cards in the following list
  const userCards = await cdp.js(function() {
    // Look for elements that look like user cards (avatar + name + follow button pattern)
    const cards = [];
    
    // Strategy: find parent elements that contain both a follow button and user info
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent || '';
      const children = el.children;
      // Skip too small or too large
      if (children.length < 2 || children.length > 20) return;
      
      const rect = el.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 40 || rect.height > 200) return;
      
      // Check if it contains a follow-related button
      const hasFollowBtn = Array.from(el.querySelectorAll('*')).some(child => {
        const t = (child.textContent || '').trim();
        return child.children.length === 0 && ['已关注', '关注', '回关', '朋友'].includes(t);
      });
      
      // Check if it contains an avatar-like element (img or specific div)
      const hasAvatar = el.querySelector('img') || 
        Array.from(el.querySelectorAll('div, span')).some(c => {
          const r = c.getBoundingClientRect();
          return r.width > 30 && r.width < 60 && r.height > 30 && r.height < 60 && 
            (c.className?.includes('avatar') || c.className?.includes('Avatar') || 
             c.style?.borderRadius === '50%');
        });
      
      if (hasFollowBtn) {
        cards.push({
          tag: el.tagName,
          cls: el.className?.substring(0, 100),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          text: text.substring(0, 100),
          hasAvatar: hasAvatar,
        });
      }
    });
    
    return cards.slice(0, 30);
  });
  console.log('\nUser cards:', JSON.stringify(userCards, null, 2));
  
  // 4. Detailed follow button analysis
  const btns = await cdp.js(function() {
    const result = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent || '').trim();
      if (el.children.length === 0 && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(t)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Get parent tree
          let parent = el.parentElement;
          const parents = [];
          for (let i = 0; i < 5 && parent; i++) {
            parents.push({ tag: parent.tagName, cls: parent.className?.substring(0, 60) });
            // Check for mutual follow indicators in parent
            const parentText = parent.textContent?.trim() || '';
            if (parentText.includes('回关') || parentText.includes('朋友') || parentText.includes('互关')) {
              parents[parents.length-1].hasMutual = true;
            }
            parent = parent.parentElement;
          }
          
          result.push({
            text: t,
            tag: el.tagName,
            cls: el.className?.substring(0, 60),
            x: Math.round(rect.x), y: Math.round(rect.y),
            w: Math.round(rect.width), h: Math.round(rect.height),
            clickable: el.onclick !== null || el.getAttribute('role') === 'button' || el.tagName === 'BUTTON',
            parents: parents,
          });
        }
      }
    });
    return result;
  });
  console.log('\nFollow buttons detailed:');
  btns.forEach((b, i) => {
    console.log(`  [${i}] "${b.text}" <${b.tag}> ${b.clickable ? '(clickable)' : ''} at (${b.x},${b.y}) size=${b.w}x${b.h}`);
    console.log(`      class: ${b.cls}`);
    console.log(`      parents: ${b.parents.map(p => `<${p.tag}> class="${p.cls}"${p.hasMutual?' 🔄MUTUAL':''}`).join(' → ')}`);
  });
  
  // 5. Check for mutual follow pattern
  const mutualInfo = await cdp.js(function() {
    const mutuals = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent || '').trim();
      if (['回关', '朋友', '互相关注', '互关'].includes(t)) {
        const rect = el.getBoundingClientRect();
        mutuals.push({
          text: t, tag: el.tagName,
          cls: el.className?.substring(0, 60),
          x: Math.round(rect.x), y: Math.round(rect.y),
        });
      }
    });
    return mutuals;
  });
  console.log('\nMutual indicators:', JSON.stringify(mutualInfo, null, 2));
  
  fs.writeFileSync(path.join(__dirname, 'douyin_analysis.json'), JSON.stringify({
    layout, listInfo, userCards, btns, mutualInfo
  }, null, 2));
  console.log('\n✅ Analysis saved');
  
  cdp.close();
}

main().catch(e => { console.error(e.message); console.error(e.stack); });
