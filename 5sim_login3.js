const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Intercept ALL requests
  page.on('request', request => {
    const url = request.url();
    const resourceType = request.resourceType();
    if (resourceType === 'xhr' || resourceType === 'fetch') {
      console.log('>>> FETCH:', request.method(), url, request.postData() || '');
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
      const status = response.status();
      console.log('<<< XHR:', status, url);
    }
  });

  await page.goto('https://5sim.net/zh/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '5sim_before_login.png' });
  
  // Fill form
  await page.locator('input[aria-label="邮箱"]').waitFor({ timeout: 10000 });
  await page.locator('input[aria-label="邮箱"]').fill('xin10141014@gmail.com');
  await page.locator('input[aria-label="密码"]').fill('Tujiaxin1996.');
  
  await page.screenshot({ path: '5sim_form_filled.png' });
  
  // Click sign-in
  await page.locator('button[data-testid="sign-in"]').click();
  
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '5sim_after_click.png' });
  
  console.log('Final URL:', page.url());
  
  // Try to check localStorage / cookies for auth token
  const cookies = await context.cookies();
  console.log('Cookies:', JSON.stringify(cookies.map(c => c.name + '=' + c.value.substring(0,30))));
  
  const localStorageItems = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key).substring(0, 100);
    }
    return items;
  });
  console.log('localStorage:', JSON.stringify(localStorageItems));
  
  await browser.close();
  console.log('Done');
})();
