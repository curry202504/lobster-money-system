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
  
  // Deep analysis of each "已关注" button
  const deepAnalysis = await cdp.js(`(function(){
    const cards = [];
    
    document.querySelectorAll('.Sq162AQL').forEach(btn => {
      const r = btn.getBoundingClientRect();
      if (r.width===0 || r.height===0) return;
      
      // Find the user card container (go up to find the parent card)
      let card = btn;
      for (let i=0; i<10; i++) {
        card = card.parentElement;
        if (!card) break;
        // A card should have enough child elements and decent width
        if (card.children.length >= 2 && card.getBoundingClientRect().width > 300) break;
      }
      
      // Get full card info
      const cardRect = card?.getBoundingClientRect();
      
      // Look for mutual follow indicators in the ENTIRE card including all child text
      const allText = card?.textContent || '';
      
      // Also check for specific elements that indicate mutual follow
      const hasMutualEl = card?.querySelector('[class*="mutual"], [class*="friend"], [class*="back"], [class*="互相"]');
      
      // Check for "回关", "互相关注", "朋友" in the full card
      const hasMutual = allText.includes('回关') || allText.includes('互相关注') || allText.includes('互关');
      
      // Find user name (usually an <a> or <span> with text before "已关注")
      let userName = '';
      const textNodes = [];
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const t = node.textContent?.trim();
        if (t && t.length > 1 && !t.includes('已关注') && !t.includes('移除') && !t.includes('确认') && !t.includes('取消')) {
          textNodes.push(t);
        }
      }
      userName = textNodes.slice(0, 3).join(' | ');
      
      // Check for "关注" in card (might be friend's follower count)
      // and check if there's a "回关" button separately
      const huiGuanBtn = card?.querySelector('[class*="回关"], span:not(.Sq162AQL)');
      const huiGuanText = huiGuanBtn?.textContent?.trim();
      
      cards.push({
        x: Math.round(r.x), y: Math.round(r.y),
        cardW: Math.round(cardRect?.width || 0),
        cardH: Math.round(cardRect?.height || 0),
        cardText: allText.substring(0, 150),
        hasMutual,
        hasMutualEl: !!hasMutualEl,
        userName: userName.substring(0, 100),
        huiGuanText: huiGuanText || '',
        btnHTML: btn.outerHTML?.substring(0, 200),
      });
    });
    
    return cards;
  })()`);
  
  console.log(`Found ${deepAnalysis.length} user cards with "已关注"`);
  console.log(`\nMutual follow count: ${deepAnalysis.filter(c => c.hasMutual).length}`);
  
  // Show all cards that might be mutual
  const mutualCards = deepAnalysis.filter(c => c.hasMutual);
  if (mutualCards.length > 0) {
    console.log('\n=== Mutual follow cards ===');
    mutualCards.forEach(c => {
      console.log(`  at(${c.x},${c.y}) "${c.userName}"`);
      console.log(`  card: ${c.cardText}`);
      console.log(`  huiguan: "${c.huiGuanText}"`);
    });
  }
  
  // Show first 5 non-mutual cards
  const nonMutual = deepAnalysis.filter(c => !c.hasMutual).slice(0, 5);
  console.log('\n=== Non-mutual card samples (first 5) ===');
  nonMutual.forEach(c => {
    console.log(`  at(${c.x},${c.y}) "${c.userName}"`);
    console.log(`  card: ${c.cardText}`);
    console.log(`  btnHTML: ${c.btnHTML}`);
  });
  
  // Save
  fs.writeFileSync(path.join(__dirname, 'douyin_cards.json'), JSON.stringify(deepAnalysis, null, 2));
  console.log('\n✅ Saved');
  
  cdp.close();
}

main().catch(e => { console.error('ERROR:', e.message); console.error(e.stack); });
