const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); }).on('error', reject);
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
        if(msg.id && this.pending.has(msg.id)) { const p=this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
      });
      this.ws.on('error', reject);
    });
  }
  async cmd(m, p={}) { const id=++this.msgId; return new Promise((res,rej) => { this.pending.set(id,{resolve:res,reject:rej}); this.ws.send(JSON.stringify({id,method:m,params:p})); }); }
  async js(fn) { const r=await this.cmd('Runtime.evaluate',{expression:fn,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result?.value; }
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
  
  // Make sure following list is open
  console.log('Opening following list...');
  await cdp.js(`(function(){
    const el = document.querySelector('.Sxrus2d_.K8tYuhd8');
    if (el) {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));
      el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));
      el.click();
    }
    return !!el;
  })()`);
  await sleep(4000);
  
  // Find the correct scroll container
  const containerInfo = await cdp.js(`(function(){
    const containers = [];
    document.querySelectorAll('div').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 500 && el.clientHeight > 400 && el.clientHeight < 1000) {
        containers.push({
          cls: el.className?.substring(0,80),
          clientH: el.clientHeight, scrollH: el.scrollHeight, children: el.children.length,
        });
      }
    });
    return containers;
  })()`);
  console.log('Scroll containers:', JSON.stringify(containerInfo, null, 2));
  
  // Pick the container with the most content
  const bestContainer = containerInfo.sort((a,b) => (b.scrollH-b.clientH) - (a.scrollH-a.clientH))[0];
  console.log('Using container cls:', bestContainer?.cls);
  const SCROLL_CLS = bestContainer?.cls || 'nixO41kD';
  
  // Test unfollow one user
  console.log('\n=== Testing unfollow on first user ===');
  
  const testResult = await cdp.js(`(async function(){
    // Find first "已关注" button
    const btn = document.querySelector('.Sq162AQL');
    if (!btn) return { error: 'No Sq162AQL found' };
    
    const r = btn.getBoundingClientRect();
    if (r.width===0 || r.height===0) return { error: 'Button not visible' };
    
    // Check if mutual
    let card = btn;
    for (let i=0; i<8; i++) {
      card = card.parentElement;
      if (!card) break;
      if (card.children.length >= 2 && card.getBoundingClientRect().width > 300) break;
    }
    const cardText = card?.textContent || '';
    const isMutual = cardText.includes('相互关注');
    
    if (isMutual) return { skip: true, reason: 'mutual', userName: cardText.substring(0,30) };
    
    console.log('Clicking 已关注...');
    
    // Dispatch React-compatible events
    const cx = r.x + r.width/2;
    const cy = r.y + r.height/2;
    
    btn.dispatchEvent(new MouseEvent('mouseenter', {bubbles:true,clientX:cx,clientY:cy}));
    btn.dispatchEvent(new MouseEvent('mouseover', {bubbles:true,clientX:cx,clientY:cy}));
    btn.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,clientX:cx,clientY:cy,pointerId:1}));
    btn.dispatchEvent(new MouseEvent('mousedown', {bubbles:true,clientX:cx,clientY:cy,button:0}));
    btn.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,clientX:cx,clientY:cy,pointerId:1}));
    btn.dispatchEvent(new MouseEvent('mouseup', {bubbles:true,clientX:cx,clientY:cy,button:0}));
    btn.dispatchEvent(new MouseEvent('click', {bubbles:true,clientX:cx,clientY:cy,button:0}));
    
    // Also try native click
    btn.click();
    
    // Wait for popup
    await new Promise(r => setTimeout(r, 1000));
    
    // Find "移除" button in the DOM
    const allElements = document.querySelectorAll('*');
    let removeBtn = null;
    for (const el of allElements) {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && t==='移除') {
        const rect = el.getBoundingClientRect();
        if (rect.width>0 && rect.height>0) {
          removeBtn = el;
          break;
        }
      }
    }
    
    if (!removeBtn) {
      // Look for alternative text
      for (const el of allElements) {
        const t = (el.textContent||'').trim();
        if (el.children.length===0 && (t==='确定移除'||t==='确认'||t==='取消关注')) {
          const rect = el.getBoundingClientRect();
          if (rect.width>0 && rect.height>0) {
            removeBtn = el;
            break;
          }
        }
      }
    }
    
    if (!removeBtn) {
      // Debug: find all visible small text elements
      const visible = [];
      for (const el of allElements) {
        const t = (el.textContent||'').trim();
        const rect = el.getBoundingClientRect();
        if (el.children.length===0 && t.length>0 && t.length<10 && rect.width>0 && rect.height>0 && rect.y>400 && rect.y<900) {
          visible.push({text:t, tag:el.tagName, x:Math.round(rect.x), y:Math.round(rect.y), cls:el.className?.substring(0,50)});
        }
      }
      return { error: 'No remove button', visible: visible };
    }
    
    // Click the remove button
    const rmRect = removeBtn.getBoundingClientRect();
    console.log('Found remove button:', removeBtn.textContent, 'at', rmRect.x, rmRect.y);
    
    removeBtn.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));
    removeBtn.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));
    removeBtn.dispatchEvent(new MouseEvent('click',{bubbles:true,button:0}));
    removeBtn.click();
    
    await new Promise(r => setTimeout(r, 800));
    
    // Verify unfollowed
    const btnStillThere = document.querySelectorAll('.Sq162AQL').length;
    return { success: true, remainingBtns: btnStillThere, userName: cardText.substring(0,30) };
  })()`);
  
  console.log('Test result:', JSON.stringify(testResult, null, 2));
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_test_unfollow.png'), Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
