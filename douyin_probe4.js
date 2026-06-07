const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  try {
    // Fetch CDP endpoint
    console.log('Fetching CDP endpoint...');
    const versionJson = await httpGet('http://localhost:9222/json/version');
    const version = JSON.parse(versionJson);
    const wsUrl = version.webSocketDebuggerUrl;
    console.log('WebSocket URL:', wsUrl);
    
    // Connect via WebSocket
    console.log('Connecting...');
    const browser = await chromium.connect({ wsEndpoint: wsUrl });
    console.log('Connected!');
    
    const contexts = browser.contexts();
    console.log('Contexts:', contexts.length);
    const defaultContext = contexts[0];
    const pages = defaultContext.pages();
    console.log('Pages:', pages.length);
    
    // Find or create douyin page
    let page = pages.find(p => p.url().includes('douyin.com'));
    if (!page) {
      page = await defaultContext.newPage();
      console.log('Navigating to following page...');
      await page.goto('https://www.douyin.com/user/self?showTab=follow', { 
        waitUntil: 'domcontentloaded', timeout: 30000 
      });
      await sleep(5000);
    } else {
      console.log('Using existing douyin page');
      await page.bringToFront();
    }
    
    // Check page
    const info = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyPreview: document.body.innerText.substring(0, 1500),
    }));
    console.log('Title:', info.title);
    console.log('URL:', info.url);
    console.log('Body preview:', info.bodyPreview.substring(0, 600));
    
    // Screenshot
    const ss = path.join(__dirname, 'douyin_current.png');
    await page.screenshot({ path: ss });
    console.log('Screenshot saved:', ss);
    
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
              cls: el.className?.substring(0, 100),
              parentCls: el.parentElement?.className?.substring(0, 100),
              grandParentCls: el.parentElement?.parentElement?.className?.substring(0, 100),
            });
          }
        }
      });
      return result;
    });
    console.log(`Found ${btns.length} follow buttons`);
    btns.slice(0, 30).forEach((b, i) => 
      console.log(`  ${i}: [${b.text}] <${b.tag}> class="${b.cls}"`)
    );
    
    // Save
    fs.writeFileSync(path.join(__dirname, 'douyin_report.json'), JSON.stringify({ followButtons: btns, pageInfo: info }, null, 2));
    console.log('\n✅ Report saved');
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
