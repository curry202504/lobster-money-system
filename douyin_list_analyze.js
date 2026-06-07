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
  
  // Detailed analysis
  console.log('=== Following List Analysis ===\n');
  
  const analysis = await cdp.js(`(function(){
    const btns = [];
    document.querySelectorAll('*').forEach(el => {
      const t = (el.textContent||'').trim();
      if (el.children.length===0 && ['已关注','关注','回关','朋友','取消关注','互相关注'].includes(t)) {
        const r = el.getBoundingClientRect();
        if (r.width>0 && r.height>0) {
          // Find parent card (user info)
          let card = el;
          for (let i=0; i<8; i++) {
            card = card.parentElement;
            if (!card) break;
            const cardText = card.textContent||'';
            if (cardText.length > 10 && cardText.length < 300) break;
          }
          
          // Check for mutual follow indicators in card
          const cardText = card?.textContent||'';
          const hasMutual = cardText.includes('回关') || cardText.includes('朋友') || cardText.includes('互关');
          
          btns.push({
            text: t,
            tag: el.tagName,
            cls: el.className?.substring(0,100),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            cardCls: card?.className?.substring(0,100),
            cardText: cardText.substring(0, 100),
            hasMutual,
            clickable: el.tagName==='BUTTON' || el.onclick || el.getAttribute('role')==='button',
          });
        }
      }
    });
    
    // Find the scrollable container for the following list
    const scrollContainers = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300 && el.clientHeight < 1000) {
        scrollContainers.push({
          tag: el.tagName, cls: el.className?.substring(0,80),
          clientH: el.clientHeight, scrollH: el.scrollHeight,
          children: el.children.length,
          preview: el.textContent?.substring(0, 80),
        });
      }
    });
    
    return { 
      buttons: btns, 
      totalButtons: btns.length,
      mutualCount: btns.filter(b => b.hasMutual).length,
      nonMutualCount: btns.filter(b => !b.hasMutual && b.text==='已关注').length,
      scrollContainers: scrollContainers.slice(0, 10),
    };
  })()`);
  
  console.log(`Total buttons: ${analysis.totalButtons}`);
  console.log(`"已关注" buttons: ${analysis.buttons.filter(b=>b.text==='已关注').length}`);
  console.log(`"回关" (mutual) buttons: ${analysis.buttons.filter(b=>b.text==='回关').length}`);
  console.log(`Mutual indicators: ${analysis.mutualCount}`);
  console.log(`Non-mutual "已关注": ${analysis.nonMutualCount}`);
  
  console.log('\nScroll containers:', JSON.stringify(analysis.scrollContainers, null, 2));
  
  console.log('\nButton samples (first 20):');
  analysis.buttons.slice(0, 20).forEach((b,i) => {
    console.log(`  [${i}] "${b.text}" <${b.tag}>${b.hasMutual?' 🔄MUTUAL':''} at(${b.x},${b.y})`);
    console.log(`      btn class: ${b.cls}`);
    console.log(`      card: ${b.cardText?.substring(0,60)}`);
  });
  
  // Count by type
  const byType = {};
  analysis.buttons.forEach(b => { byType[b.text] = (byType[b.text]||0) + 1; });
  console.log('\nBy type:', byType);
  
  // See some mutual and non-mutual samples
  const mutualSample = analysis.buttons.filter(b => b.hasMutual).slice(0, 10);
  const nonMutualSample = analysis.buttons.filter(b => !b.hasMutual && b.text==='已关注').slice(0, 10);
  
  console.log('\n--- Mutual (回关) samples ---');
  mutualSample.forEach(b => console.log(`  "${b.text}" card: "${b.cardText}"`));
  
  console.log('\n--- Non-mutual (已关注) samples ---');
  nonMutualSample.forEach(b => console.log(`  "${b.text}" card: "${b.cardText}"`));
  
  fs.writeFileSync(path.join(__dirname, 'douyin_list_analysis.json'), JSON.stringify(analysis, null, 2));
  console.log('\n✅ Saved to douyin_list_analysis.json');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
