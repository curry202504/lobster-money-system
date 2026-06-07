const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Intercept API calls
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('signin') || url.includes('login') || url.includes('auth')) {
      console.log('>>> REQUEST:', request.method(), url, JSON.stringify(request.headers()['content-type']));
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('signin') || url.includes('login') || url.includes('auth')) {
      const status = response.status();
      let body = '';
      try { body = await response.text(); } catch(e) {}
      console.log('<<< RESPONSE:', status, url, body.substring(0, 500));
    }
  });

  // Go to login page
  console.log('Navigating to login...');
  await page.goto('https://5sim.net/zh/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // Fill email
  const emailInput = page.locator('input[aria-label="邮箱"]');
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill('xin10141014@gmail.com');
  
  // Fill password
  const passwordInput = page.locator('input[aria-label="密码"]');
  await passwordInput.fill('Tujiaxin1996.');
  
  // Click sign-in button
  const signInBtn = page.locator('button[data-testid="sign-in"]');
  await signInBtn.click();
  
  // Wait for response
  await page.waitForTimeout(10000);
  
  console.log('\n=== FINAL URL:', page.url());
  await page.screenshot({ path: '5sim_after_login.png' });
  
  // Check login state - try visiting profile
  const profileRes = await page.goto('https://5sim.net/v1/user/profile', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const profileBody = await profileRes.text();
  console.log('Profile response:', profileBody.substring(0, 500));
  
  await browser.close();
  console.log('Done');
})();
