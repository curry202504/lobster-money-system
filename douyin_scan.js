const { chromium } = require('playwright');
const path = require('path');

async function main() {
  try {
    console.log('Starting Chrome (fresh, no login)...');
    const browser = await chromium.launch({ 
      channel: 'chrome',
      headless: false,
      viewport: { width: 1440, height: 900 },
      timeout: 30000,
    });
    
    const page = await browser.newPage();
    console.log('Going to Douyin login page...');
    await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const ss = path.join(__dirname, 'douyin_login.png');
    await page.screenshot({ path: ss });
    console.log('Login page screenshot:', ss);
    
    console.log('Waiting 30s for you to log in (scan QR)...');
    await page.waitForTimeout(30000);
    
    // Check if logged in
    const loggedIn = await page.evaluate(() => {
      return document.querySelector('[class*="profile"]') !== null || 
             document.querySelector('[class*="avatar"]') !== null;
    });
    console.log('Login check:', loggedIn);
    
    // Navigate to following
    console.log('Going to following page...');
    await page.goto('https://www.douyin.com/user/self?showTab=follow', { 
      waitUntil: 'domcontentloaded', timeout: 30000 
    });
    await page.waitForTimeout(5000);
    
    const ss2 = path.join(__dirname, 'douyin_following.png');
    await page.screenshot({ path: ss2 });
    console.log('Following page screenshot:', ss2);
    
    // Analyze DOM structure
    const dom = await page.evaluate(() => {
      const info = { title: document.title, url: location.href };
      
      // Find all interactive elements
      const elements = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const text = (el.textContent || '').trim();
        if (text.length > 0 && text.length < 50 && el.children.length === 0) {
          const parent3 = el.parentElement?.parentElement?.parentElement;
          if (parent3) {
            const parentText = parent3.textContent?.trim().substring(0, 200);
            if (parentText && (parentText.includes('关注') || parentText.includes('粉丝'))) {
              elements.push({
                tag: el.tagName,
                text: text,
                parentTag: el.parentElement?.tagName,
                parentClass: el.parentElement?.className?.substring(0, 100),
                grandParentClass: parent3.className?.substring(0, 100),
              });
            }
          }
        }
      }
      info.relevantElements = elements.slice(0, 50);
      
      // Full body text (first 3000 chars)
      info.bodyText = document.body.innerText.substring(0, 3000);
      
      return info;
    });
    
    console.log('DOM analysis:', JSON.stringify(dom, null, 2));
    
    // Keep browser open - don't close
    console.log('Browser still open. Check it.');
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
