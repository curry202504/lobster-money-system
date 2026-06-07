const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  try {
    console.log('Connecting to Chrome CDP...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('Connected!');
    
    const contexts = browser.contexts();
    const defaultContext = contexts[0];
    const pages = defaultContext.pages();
    
    // Find or navigate to following page
    let page = pages.find(p => p.url().includes('douyin.com'));
    if (!page) {
      page = await defaultContext.newPage();
      console.log('Navigating to following page...');
      await page.goto('https://www.douyin.com/user/self?showTab=follow', { 
        waitUntil: 'domcontentloaded', timeout: 30000 
      });
      await sleep(5000);
    } else {
      await page.bringToFront();
      console.log('Using existing douyin page:', page.url());
    }
    
    // Check current page
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyText: document.body.innerText.substring(0, 2000),
    }));
    console.log('Current page:', pageInfo.title);
    console.log('URL:', pageInfo.url);
    console.log('Body preview:', pageInfo.bodyText.substring(0, 600));
    
    // Screenshot
    const ss = path.join(__dirname, 'douyin_following.png');
    await page.screenshot({ path: ss });
    console.log('Screenshot:', ss);
    
    // DOM Probe
    console.log('\n=== DOM PROBE ===');
    const probe = await page.evaluate(() => {
      const r = {};
      
      // Follow buttons
      const btns = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.textContent || '').trim();
        if (el.children.length === 0 && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(t)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            btns.push({
              text: t, tag: el.tagName,
              cls: el.className?.substring(0, 120),
              parentCls: el.parentElement?.className?.substring(0, 120),
              gparentCls: el.parentElement?.parentElement?.className?.substring(0, 120),
              x: Math.round(rect.x), y: Math.round(rect.y),
            });
          }
        }
      });
      r.followButtons = btns;
      
      // User list containers
      const lists = [];
      document.querySelectorAll('*').forEach(el => {
        const children = el.children.length;
        if (children >= 5 && children <= 30) {
          const childTexts = [];
          for (const c of el.children) {
            childTexts.push(c.textContent?.trim().substring(0, 50));
          }
          const allText = childTexts.join(' ');
          if (allText.includes('已关注') || allText.includes('关注')) {
            lists.push({
              tag: el.tagName,
              cls: el.className?.substring(0, 120),
              children: children,
              sample: childTexts.slice(0, 3),
            });
          }
        }
      });
      r.userLists = lists.slice(0, 10);
      
      return r;
    });
    
    console.log('Follow buttons found:', probe.followButtons.length);
    console.log('Sample:', probe.followButtons.slice(0, 20));
    console.log('User lists:', probe.userLists);
    
    // Save report to file
    fs.writeFileSync(
      path.join(__dirname, 'douyin_dom_report.json'),
      JSON.stringify(probe, null, 2)
    );
    console.log('Report saved to douyin_dom_report.json');
    
    console.log('\n✅ Done. Browser stays open.');
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
