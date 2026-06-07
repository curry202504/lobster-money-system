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
  
  const TARGET = 1000;
  const STATE_FILE = path.join(__dirname, 'unfollow_state.json');
  let totalDone = 0, totalSkipped = 0;
  
  if (fs.existsSync(STATE_FILE)) {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    totalDone = s.done || 0;
    totalSkipped = s.skipped || 0;
    console.log(`Resumed from: ${totalDone} done, ${totalSkipped} skipped`);
  }
  
  // Ensure following list is open
  console.log('Opening following list...');
  await cdp.js(`(function(){
    const el = document.querySelector('.Sxrus2d_.K8tYuhd8');
    if (el) { el.click(); return true; }
    return false;
  })()`);
  await sleep(4000);
  
  let noBtnCount = 0;
  
  while (totalDone < TARGET) {
    // Get current batch of "已关注" buttons
    const batch = await cdp.js(`(async function(){
      const btns = [];
      const all = document.querySelectorAll('.Sq162AQL');
      
      for (const btn of all) {
        const r = btn.getBoundingClientRect();
        if (r.width===0 || r.height===0) continue;
        if (btn.textContent?.trim() !== '已关注') continue;
        if (r.y < 400) continue; // skip nav elements
        
        // Find parent card
        let card = btn;
        for (let i=0; i<8; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.children.length>=2 && card.getBoundingClientRect().width>300) break;
        }
        const cardText = card?.textContent || '';
        const isMutual = cardText.includes('相互关注');
        
        btns.push({
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          isMutual,
          name: cardText.substring(0, 25).replace(/\\n/g,' '),
        });
      }
      return btns;
    })()`);
    
    console.log(`\n[${totalDone}/${TARGET}] Visible 已关注: ${batch.length} | Skipped: ${totalSkipped}`);
    
    if (batch.length === 0) {
      noBtnCount++;
      console.log('  No buttons, scrolling...');
      await cdp.js(`(function(){
        const el = document.querySelector('.nixO41kD');
        if (el) el.scrollTop += 400;
      })()`);
      await sleep(2000);
      if (noBtnCount > 10) {
        console.log('No buttons after 10 scrolls, done!');
        break;
      }
      continue;
    }
    noBtnCount = 0;
    
    // Process up to 10 buttons per batch
    let processed = 0;
    for (const btn of batch) {
      if (totalDone >= TARGET) break;
      
      if (btn.isMutual) {
        totalSkipped++;
        continue;
      }
      
      const cx = btn.x + btn.w/2;
      const cy = btn.y + btn.h/2;
      
      const result = await cdp.js(`(async function(){
        const btn = document.querySelector('.Sq162AQL');
        if (!btn) return { error: 'no btn' };
        
        // Find the specific button at these coords
        let target = null;
        for (const b of document.querySelectorAll('.Sq162AQL')) {
          const r = b.getBoundingClientRect();
          if (Math.abs(r.x - ${btn.x}) < 10 && Math.abs(r.y - ${btn.y}) < 10) {
            target = b;
            break;
          }
        }
        if (!target) return { error: 'btn moved' };
        if (target.textContent?.trim() !== '已关注') return { skip: 'already changed' };
        
        // Check mutual
        let card = target;
        for (let i=0; i<8; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.children.length>=2 && card.getBoundingClientRect().width>300) break;
        }
        if ((card?.textContent||'').includes('相互关注')) return { skip: 'mutual' };
        
        // Dispatch click events
        const r = target.getBoundingClientRect();
        const cx = r.x + r.width/2;
        const cy = r.y + r.height/2;
        
        target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:cx,clientY:cy,pointerId:1}));
        target.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:cx,clientY:cy,button:0}));
        target.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:cx,clientY:cy,pointerId:1}));
        target.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:cx,clientY:cy,button:0}));
        target.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:cx,clientY:cy,button:0}));
        target.click();
        
        await new Promise(r => setTimeout(r, 600));
        
        // Check if it changed to "关注"
        const newText = target.textContent?.trim();
        return { success: newText !== '已关注', newText };
      })()`);
      
      if (result?.success) {
        totalDone++;
        console.log(`  ✅ [${totalDone}] ${btn.name}`);
      } else if (result?.skip) {
        console.log(`  ⏭️ SKIP: ${result.skip} - ${btn.name}`);
        if (result.skip === 'mutual') totalSkipped++;
      } else {
        console.log(`  ⚠️ ${JSON.stringify(result)} - ${btn.name}`);
      }
      
      // Save state
      fs.writeFileSync(STATE_FILE, JSON.stringify({ done: totalDone, skipped: totalSkipped }));
      
      await sleep(800 + Math.random() * 400); // Random delay 0.8-1.2s
      processed++;
      if (processed >= 10) break;
    }
    
    // Scroll to load more
    await cdp.js(`(function(){
      const el = document.querySelector('.nixO41kD');
      if (el) el.scrollTop += el.clientHeight * 0.7;
    })()`);
    await sleep(2500);
  }
  
  console.log(`\n🎉 FINISHED! Unfollowed: ${totalDone}, Skipped (mutual): ${totalSkipped}`);
  
  // Screenshot
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_done.png'), Buffer.from(ss.data, 'base64'));
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
