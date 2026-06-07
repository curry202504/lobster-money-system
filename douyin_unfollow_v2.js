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

async function reopenList(cdp) {
  console.log('  🔄 Re-opening following list...');
  await cdp.js(`(function(){
    const el = document.querySelector('.Sxrus2d_.K8tYuhd8');
    if (el) {
      el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));
      el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));
      el.click();
      return true;
    }
    return false;
  })()`);
  await sleep(4000);
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
    console.log(`📋 Resumed: ${totalDone} done, ${totalSkipped} skipped`);
  }
  
  // Open following list
  await reopenList(cdp);
  
  let noBtnCount = 0;
  
  while (totalDone < TARGET) {
    // Get current "已关注" buttons
    const batch = await cdp.js(`(function(){
      const btns = [];
      document.querySelectorAll('.Sq162AQL').forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width===0 || r.height===0 || r.y < 350) return;
        if (btn.textContent?.trim() !== '已关注') return;
        
        // Find card
        let card = btn;
        for (let i=0; i<8; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.children.length>=2 && card.getBoundingClientRect().width>300) break;
        }
        const cardText = card?.textContent || '';
        
        btns.push({
          y: Math.round(r.y), h: Math.round(r.height),
          isMutual: cardText.includes('相互关注'),
          name: cardText.substring(0, 20).replace(/\\n/g,' '),
        });
      });
      return btns;
    })()`);
    
    console.log(`\n[${totalDone}/${TARGET}] Visible: ${batch.length} | Skipped: ${totalSkipped}`);
    
    if (batch.length === 0) {
      noBtnCount++;
      if (noBtnCount >= 3) {
        await reopenList(cdp);
        noBtnCount = 0;
      } else {
        console.log('  No buttons, scrolling...');
      }
      // Scroll
      await cdp.js(`(function(){
        const el = document.querySelector('.nixO41kD');
        if (el) el.scrollTop += el.clientHeight * 0.8;
        else window.scrollBy(0, 500);
      })()`);
      await sleep(2500);
      continue;
    }
    noBtnCount = 0;
    
    // Unfollow up to 15 per batch
    let processed = 0;
    for (const btn of batch) {
      if (totalDone >= TARGET) break;
      if (btn.isMutual) { totalSkipped++; continue; }
      
      const result = await cdp.js(`(async function(){
        // Find button at this y position
        let target = null;
        for (const b of document.querySelectorAll('.Sq162AQL')) {
          const r = b.getBoundingClientRect();
          if (Math.abs(r.y - ${btn.y}) < 5 && b.textContent?.trim()==='已关注') {
            target = b; break;
          }
        }
        if (!target) return { skip: 'not found' };
        
        // Check mutual again
        let card = target;
        for (let i=0; i<8; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.children.length>=2 && card.getBoundingClientRect().width>300) break;
        }
        if ((card?.textContent||'').includes('相互关注')) return { skip: 'mutual' };
        
        const r = target.getBoundingClientRect();
        const cx = r.x + r.width/2;
        const cy = r.y + r.height/2;
        
        target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:cx,clientY:cy,pointerId:1}));
        target.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:cx,clientY:cy,button:0}));
        target.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:cx,clientY:cy,pointerId:1}));
        target.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:cx,clientY:cy,button:0}));
        target.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:cx,clientY:cy,button:0}));
        target.click();
        
        await new Promise(r => setTimeout(r, 500));
        return { success: target.textContent?.trim() !== '已关注' };
      })()`);
      
      if (result?.success) {
        totalDone++;
        console.log(`  ✅ [${totalDone}] ${btn.name}`);
      } else if (result?.skip) {
        if (result.skip==='mutual') { totalSkipped++; console.log(`  🔄 MUTUAL SKIP: ${btn.name}`); }
        else if (result.skip==='not found') console.log(`  ⚠️ Not found: ${btn.name}`);
        else console.log(`  ⏭️ ${result.skip}: ${btn.name}`);
      } else {
        console.log(`  ❌ ${JSON.stringify(result)}`);
      }
      
      fs.writeFileSync(STATE_FILE, JSON.stringify({ done: totalDone, skipped: totalSkipped }));
      await sleep(800 + Math.random() * 400);
      
      processed++;
      if (processed >= 15) break;
    }
    
    // Scroll
    await cdp.js(`(function(){
      const el = document.querySelector('.nixO41kD');
      if (el) el.scrollTop += el.clientHeight * 0.7;
      else window.scrollBy(0, 500);
    })()`);
    await sleep(2500);
  }
  
  console.log(`\n🎉 FINISHED! Unfollowed: ${totalDone}, Skipped (mutual): ${totalSkipped}`);
  
  const ss = await cdp.cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'douyin_final.png'), Buffer.from(ss.data, 'base64'));
  console.log('Final screenshot saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
