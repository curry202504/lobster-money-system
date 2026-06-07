const { chromium } = require('playwright');
const path = require('path');

async function main() {
  try {
    // Connect to the running Chrome (hermes agent)
    console.log('Connecting to Chrome on port 64089...');
    const browser = await chromium.connectOverCDP('http://localhost:64089');
    console.log('Connected!');
    
    // Get existing pages
    const contexts = browser.contexts();
    console.log('Contexts:', contexts.length);
    const defaultContext = contexts[0];
    const pages = defaultContext.pages();
    console.log('Pages:', pages.length);
    
    // Create a new page
    const page = await defaultContext.newPage();
    
    // Navigate to Douyin following page
    console.log('Going to following page...');
    await page.goto('https://www.douyin.com/user/self?showTab=follow', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await page.waitForTimeout(5000);
    
    // Screenshot
    const ss = path.join(__dirname, 'douyin_following.png');
    await page.screenshot({ path: ss });
    console.log('Screenshot:', ss);
    
    // Analyze DOM
    const info = await page.evaluate(() => {
      const result = {
        title: document.title,
        url: location.href,
        bodyPreview: document.body.innerText.substring(0, 500),
      };
      
      // Find all follow-related elements
      const followEls = [];
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 30 && (
          text.includes('已关注') || text.includes('关注') || 
          text.includes('朋友') || text.includes('互关') || 
          text.includes('回关') || text.includes('取消关注')
        )) {
          followEls.push({
            tag: el.tagName,
            text: text,
            class: el.className?.substring(0, 80),
            rect: el.getBoundingClientRect(),
          });
        }
      });
      result.followElements = followEls.slice(0, 30);
      
      return result;
    });
    
    console.log('Page info:', JSON.stringify(info, null, 2));
    
    await browser.close();
    console.log('Done');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
