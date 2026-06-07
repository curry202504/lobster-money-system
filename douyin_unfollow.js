const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
const DEBUG_PORT = 9222;
const FOLLOW_URL = 'https://www.douyin.com/user/self?showTab=follow';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // Connect to Chrome via CDP
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  
  // Get the existing page or create new one
  const contexts = browser.contexts();
  const pages = contexts[0]?.pages() || [];
  let page = pages.find(p => p.url().includes('douyin.com')) || pages[0];
  
  if (!page) {
    page = await contexts[0].newPage();
  }
  
  console.log('Navigating to following page...');
  await page.goto(FOLLOW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  
  // Take a screenshot to understand the layout
  const screenshotPath = path.join(__dirname, 'douyin_following.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Screenshot saved: ${screenshotPath}`);
  
  // Inspect the DOM structure
  const pageContent = await page.evaluate(() => {
    // Try to find the following list and relevant elements
    const info = {
      title: document.title,
      url: location.href,
      bodyText: document.body.innerText.substring(0, 2000),
    };
    
    // Look for follow buttons
    const allButtons = document.querySelectorAll('button, span, div[class*="follow"], div[class*="关注"]');
    const buttonTexts = [];
    allButtons.forEach(el => {
      const text = el.textContent?.trim();
      if (text && (text.includes('关注') || text.includes('朋友') || text.includes('取消') || text.includes('回关'))) {
        buttonTexts.push({
          tag: el.tagName,
          text: text,
          class: el.className?.substring(0, 100),
        });
      }
    });
    info.followButtons = buttonTexts.slice(0, 20);
    
    // Look for user list items
    const userItems = document.querySelectorAll('[class*="user"], [class*="follow-item"], [class*="item"], li');
    info.userItemCount = userItems.length;
    
    // Get all visible text elements
    const allText = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const t = node.textContent.trim();
      if (t && (t.includes('关注') || t.includes('粉丝') || t.includes('朋友') || t.includes('互关') || t.includes('取消'))) {
        allText.push(t);
      }
    }
    info.relevantTexts = allText.slice(0, 30);
    
    return info;
  });
  
  console.log('Page info:', JSON.stringify(pageContent, null, 2));
  
  await browser.close();
  console.log('Done');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
