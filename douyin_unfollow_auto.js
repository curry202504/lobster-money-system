// douyin_unfollow_auto.js - The Main Event
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
  
  console.log('🤖 Starting unfollow automation...\n');
  
  let totalUnfollowed = 0;
  let totalSkipped = 0;
  const TARGET = 1000;
  const STATE_FILE = path.join(__dirname, 'unfollow_state.json');
  
  // Load state if exists
  if (fs.existsSync(STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    totalUnfollowed = state.totalUnfollowed || 0;
    totalSkipped = state.totalSkipped || 0;
    console.log(`Resumed: ${totalUnfollowed} unfollowed, ${totalSkipped} skipped`);
  }
  
  // Ensure we're on the following list page
  const currentUrl = await cdp.js(`(function(){ return location.href; })()`);
  if (!currentUrl.includes('user/self') || !currentUrl.includes('showTab=follow')) {
    console.log('Navigating to following list...');
    // Click "关注" stat to open list
    await cdp.js(`(function(){
      const el = document.querySelector('.Sxrus2d_.K8tYuhd8');
      if (el) {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));
        el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));
        el.click();
      }
    })()`);
    await sleep(4000);
  }
  
  // Find scrollable container
  const scrollContainer = await cdp.js(`(function(){
    const containers = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300 && el.clientHeight < 1000) {
        containers.push({ cls: el.className, clientH: el.clientHeight, scrollH: el.scrollHeight });
      }
    });
    return containers[0]?.cls || '';
  })()`);
  console.log('Scroll container:', scrollContainer);
  
  // Main unfollow loop
  let batchFailed = 0;
  
  while (totalUnfollowed < TARGET) {
    // Get current visible "已关注" buttons
    const btns = await cdp.js(`(function(){
      const result = [];
      document.querySelectorAll('.Sq162AQL').forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width===0 || r.height===0 || r.y < 300) return; // Skip invisible or nav elements
        
        // Find parent card and check for mutual
        let card = btn;
        for (let i=0; i<8; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.children.length >= 2 && card.getBoundingClientRect().width > 300) break;
        }
        const cardText = card?.textContent || '';
        const isMutual = cardText.includes('相互关注');
        
        result.push({
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          isMutual,
          userName: cardText.substring(0, 30),
        });
      });
      return result;
    })()`);
    
    console.log(`\nVisible buttons: ${btns.length} | Unfollowed: ${totalUnfollowed}/${TARGET} | Skipped: ${totalSkipped}`);
    
    if (btns.length === 0) {
      console.log('No buttons found! Scrolling...');
      await cdp.js(`(function(){
        const el = document.querySelector('.${scrollContainer}') || document.querySelector('.nixO41kD');
        if (el) el.scrollTop += 500;
        else window.scrollBy(0, 500);
      })()`);
      await sleep(2000);
      batchFailed++;
      if (batchFailed > 5) {
        console.log('Too many failures, stopping');
        break;
      }
      continue;
    }
    batchFailed = 0;
    
    // Process buttons
    let processedThisBatch = 0;
    for (const btn of btns) {
      if (totalUnfollowed >= TARGET) break;
      
      // Skip mutual follows
      if (btn.isMutual) {
        totalSkipped++;
        continue;
      }
      
      // Click "已关注" button at this position
      const cx = btn.x + btn.w/2;
      const cy = btn.y + btn.h/2;
      
      console.log(`  Unfollowing at (${cx},${cy}): "${btn.userName}"...`);
      
      // Step 1: Click "已关注"
      await cdp.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
      await cdp.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
      await sleep(800);
      
      // Step 2: Click "移除" in the popup
      const removed = await cdp.js(`(async function(){
        // Find the "移除" text in a popup/modal
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const t = (el.textContent||'').trim();
          if (el.children.length===0 && t==='移除') {
            const r = el.getBoundingClientRect();
            if (r.width>0 && r.height>0 && r.y > 300) {
              el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true,cancelable:true}));
              el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true,cancelable:true}));
              el.click();
              await new Promise(r => setTimeout(r, 500));
              return true;
            }
          }
        }
        return false;
      })()`);
      
      if (removed) {
        totalUnfollowed++;
        console.log(`    ✅ Unfollowed! (${totalUnfollowed}/${TARGET})`);
      } else {
        console.log('    ⚠️ Could not find "移除" button');
      }
      
      // Save progress
      fs.writeFileSync(STATE_FILE, JSON.stringify({ totalUnfollowed, totalSkipped }));
      
      await sleep(1000); // Rate limiting
      processedThisBatch++;
      
      if (processedThisBatch >= 10) break; // Process 10 per batch, then scroll
    }
    
    // Scroll to load more
    await cdp.js(`(function(){
      const el = document.querySelector('.${scrollContainer}') || document.querySelector('.nixO41kD');
      if (el) el.scrollTop += el.clientHeight * 0.8;
      else window.scrollBy(0, 500);
    })()`);
    await sleep(3000);
  }
  
  console.log(`\n🎉 Done! Unfollowed: ${totalUnfollowed}, Skipped: ${totalSkipped}`);
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
