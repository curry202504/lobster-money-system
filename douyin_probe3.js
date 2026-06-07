const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  try {
    console.log('Connecting to Chrome CDP...');
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('Connected!');
    
    const contexts = browser.contexts();
    console.log('Contexts:', contexts.length);
    const defaultContext = contexts[0];
    const pages = defaultContext.pages();
    console.log('Pages:', pages.length);
    
    // Find or create page
    let page = pages.find(p => p.url().includes('douyin.com'));
    if (!page) {
      page = await defaultContext.newPage();
      console.log('Going to following page...');
      await page.goto('https://www.douyin.com/user/self?showTab=follow', { 
        waitUntil: 'domcontentloaded', timeout: 30000 
      });
      await sleep(5000);
    } else {
      console.log('Existing page:', page.url());
      await page.bringToFront();
    }
    
    // Check page state
    const info = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyPreview: document.body.innerText.substring(0, 1500),
    }));
    console.log('Title:', info.title);
    console.log('URL:', info.url);
    console.log('Body:', info.bodyPreview.substring(0, 500));
    
    // Screenshot
    const ss = path.join(__dirname, 'douyin_current.png');
    await page.screenshot({ path: ss });
    await page.screenshot({ path: ss, fullPage: true, path: path.join(__dirname, 'douyin_full.png') });
    console.log('Screenshot saved');
    
    // DOM probe
    console.log('\n=== Follow buttons ===');
    const btns = await page.evaluate(() => {
      const result = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.textContent || '').trim();
        if (el.children.length === 0 && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(t)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            result.push({
              text: t, tag: el.tagName,
              cls: el.className?.substring(0, 80),
              parentCls: el.parentElement?.className?.substring(0, 80),
            });
          }
        }
      });
      return result;
    });
    console.log(`Found ${btns.length} follow-related elements`);
    btns.slice(0, 30).forEach(b => console.log(`  [${b.text}] <${b.tag}> class="${b.cls}"`));
    
    // Save report
    const report = { followButtons: btns, pageInfo: info };
    fs.writeFileSync(path.join(__dirname, 'douyin_report.json'), JSON.stringify(report, null, 2));
    console.log('\nReport saved to douyin_report.json');
    
    console.log('\n✅ Done');
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
