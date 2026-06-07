const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

async function main() {
  try {
    console.log('User data dir:', USER_DATA_DIR);
    console.log('Launching persistent Chrome...');
    
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1440, height: 900 },
      timeout: 60000,
    });
    
    console.log('Chrome launched!');
    const page = context.pages()[0] || await context.newPage();
    
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
    
    // Check if logged in
    const loggedIn = await page.evaluate(() => {
      return !document.body.innerText.includes('登录') && 
             (document.body.innerText.includes('关注') || document.body.innerText.includes('粉丝'));
    });
    console.log('Logged in:', loggedIn);
    
    await context.close();
    console.log('Done');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}

main();
