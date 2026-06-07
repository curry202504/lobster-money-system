const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  try {
    console.log('Launching Chrome with user profile via debug pipe...');
    
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1440, height: 900 },
      timeout: 60000,
      args: [
        '--disable-features=Translate',
      ],
    });
    
    console.log('Chrome launched!');
    const page = context.pages()[0] || await context.newPage();
    
    // Navigate to following page
    console.log('Navigating to following page...');
    await page.goto('https://www.douyin.com/user/self?showTab=follow', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await sleep(5000);
    
    // Check what page we're on
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyText: document.body.innerText.substring(0, 1500),
    }));
    
    console.log('Page title:', pageInfo.title);
    console.log('Page URL:', pageInfo.url);
    console.log('Body preview:', pageInfo.bodyText.substring(0, 500));
    
    // Screenshot
    const ssPath = path.join(__dirname, 'douyin_following.png');
    await page.screenshot({ path: ssPath });
    console.log('Screenshot saved:', ssPath);
    
    // Run the DOM probe
    console.log('\n=== DOM PROBE ===');
    const probeResult = await page.evaluate(() => {
      const report = { url: location.href, title: document.title };
      
      // Find follow-related elements
      const followTexts = [];
      document.querySelectorAll('*').forEach(el => {
        const text = (el.textContent || '').trim();
        if (el.children.length === 0 && text && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(text)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            followTexts.push({
              text, tag: el.tagName,
              class: el.className?.substring(0, 100),
              x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height),
              parentClass: el.parentElement?.className?.substring(0, 100),
            });
          }
        }
      });
      report.followElements = followTexts.slice(0, 30);
      report.totalFollowButtons = followTexts.length;
      
      // Find user list containers  
      const containers = [];
      document.querySelectorAll('div, ul, section').forEach(el => {
        const text = el.textContent || '';
        if (el.children.length > 3 && (text.includes('关注') || text.includes('粉丝'))) {
          containers.push({
            tag: el.tagName,
            class: el.className?.substring(0, 100),
            children: el.children.length,
          });
        }
      });
      report.containers = containers.slice(0, 10);
      
      // Find mutual follow indicators
      const mutualEls = [];
      document.querySelectorAll('*').forEach(el => {
        const text = (el.textContent || '').trim();
        if (el.children.length === 0 && ['回关', '朋友', '互相关注', '互关'].includes(text)) {
          mutualEls.push({ text, tag: el.tagName, class: el.className?.substring(0, 100) });
        }
      });
      report.mutualElements = mutualEls.slice(0, 10);
      
      return report;
    });
    
    console.log('Probe result:', JSON.stringify(probeResult, null, 2));
    
    console.log('\n✅ Done. Keeping browser open.');
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
