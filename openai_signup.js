const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Going to chatgpt.com signup...');
  try {
    await page.goto('https://chatgpt.com/auth/signup', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'chatgpt_signup.png', fullPage: true });
    
    const text = await page.locator('body').innerText();
    console.log('PAGE TEXT (first 2000):', text.substring(0, 2000));
  } catch (e) {
    console.log('Error:', e.message);
    await page.screenshot({ path: 'chatgpt_error.png' });
  }
  
  await browser.close();
  console.log('Done');
})();
