const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

async function main() {
  try {
    console.log('User data dir:', USER_DATA_DIR);
    console.log('Launching persistent context...');
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1440, height: 900 },
      timeout: 30000,
    });
    console.log('Context launched successfully');
    
    const page = context.pages()[0] || await context.newPage();
    
    console.log('Navigating to douyin...');
    await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const screenshotPath = path.join(__dirname, 'douyin_test.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved:', screenshotPath);
    
    // Check login status
    const isLoggedIn = await page.evaluate(() => {
      return document.cookie.includes('passport') || 
             document.body.innerText.includes('消息') ||
             !document.body.innerText.includes('登录');
    });
    console.log('Logged in:', isLoggedIn);
    
    await context.close();
    console.log('Done');
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

main();
