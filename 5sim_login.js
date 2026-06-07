const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Go to login page
  console.log('Navigating to login...');
  await page.goto('https://5sim.net/zh/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  console.log('Page loaded, URL:', page.url());
  await page.screenshot({ path: '5sim_step1.png' });
  
  // Fill email
  const emailInput = page.locator('input[aria-label="邮箱"]');
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill('xin10141014@gmail.com');
  console.log('Email filled');
  
  // Fill password
  const passwordInput = page.locator('input[aria-label="密码"]');
  await passwordInput.fill('Tujiaxin1996.');
  console.log('Password filled');
  
  // Click sign-in button
  const signInBtn = page.locator('button[data-testid="sign-in"]');
  await signInBtn.click();
  console.log('Clicked sign-in');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  
  console.log('After login URL:', page.url());
  
  // Navigate to API settings
  await page.goto('https://5sim.net/zh/settings/api', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  console.log('Settings page URL:', page.url());
  await page.screenshot({ path: '5sim_settings.png', fullPage: true });
  
  // Get page text
  const text = await page.locator('body').innerText();
  console.log('=== PAGE TEXT ===');
  console.log(text.substring(0, 2000));
  
  await browser.close();
  console.log('Done');
})();
