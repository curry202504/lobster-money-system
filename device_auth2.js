const { chromium } = require('playwright');

const DEVICE_CODE = '8DJG-97BV0';
const PASSWORD = 'Tujiaxin1996.';
const PHONE = '7441583159';
const ORDER_ID = '1011217698';
const API_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTA2MzgyNjAsImlhdCI6MTc3OTEwMjI2MCwicmF5IjoiMzBlMDZmZjNmY2FiOWZhYmI1MDlkZGZlZmE1OWUzNTkiLCJzdWIiOjQwODg4MDl9.JE7_Hhcf2is5s2qgevJM3hBGvKVKmBBwBoyrGvTIv5ySLpL1myYhd6Btql008USJBRsrbbIEpoOLgRNjtE70f9FrGI_THdHH2JNheoFW17oaHxhTC4djjZ7BUkO1YHh9YLukNnwSz5L7R8-_5C9VCTZQdGyvYdbP0toBmwO9VRKRpbh3lM6xLTOTffiWTww5OMo8n1KS1wgnZNXCd-iFCesSixRmxES8E1GmHDsbq2l9rPVHD_bEFxh8zHiCd6pXPLMfRds218cA5oqetL91y2kmYddWkgthiVXrtFbGmALpzZArHVJAg2Zn1dXMLg3Xb0JUzqGgX9jUIS_jMK64uQ';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function checkSms() {
  const { execSync } = require('child_process');
  try {
    const r = execSync(`curl.exe -s "https://5sim.net/v1/user/check/${ORDER_ID}" -H "Authorization: Bearer ${API_TOKEN}" -H "Accept: application/json"`, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(r);
  } catch(e) { return null; }
}

(async () => {
  // Use non-headless to bypass Cloudflare
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--proxy-server=http://127.0.0.1:7897',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'en-US',
    timezoneId: 'Europe/London',
    viewport: { width: 1280, height: 900 },
    // Use a persistent profile with cookies
    storageState: undefined
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  console.log('=== Non-headless device auth ===');
  
  // Go to device auth page with code already in URL
  await page.goto('https://auth.openai.com/codex/device?user_code=' + DEVICE_CODE, { timeout: 30000 });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'nh1.png' });

  // Check page
  const text0 = await page.locator('body').innerText();
  console.log('Page:', text0.substring(0, 500));
  
  // If login page, use phone
  const phoneBtn = page.locator('button:has-text("Continue with phone")');
  if (await phoneBtn.isVisible().catch(() => false)) {
    await phoneBtn.click();
    await wait(2000);

    // Select UK country
    const sgText = page.locator('text=Singapore').first();
    if (await sgText.isVisible().catch(() => false)) {
      await sgText.click();
      await wait(500);
      await page.keyboard.type('United Kingdom');
      await wait(500);
      await page.keyboard.press('Enter');
      await wait(500);
    }
    
    // Fill phone
    await page.locator('#phone, input[type="tel"]').first().fill(PHONE);
    await page.locator('button[type="submit"]').first().click();
    await wait(2000);
    
    // Password if needed
    const t1 = await page.locator('body').innerText();
    if (t1.includes('Password')) {
      await page.locator('#password, input[type="password"]').first().fill(PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await wait(2000);
    }
    
    // SMS code
    const t2 = await page.locator('body').innerText();
    if (t2.includes('code') || t2.includes('Code')) {
      for (let i = 0; i < 36; i++) {
        await wait(5000);
        const data = checkSms();
        if (data && data.sms && data.sms.length > 0) {
          const code = (data.sms[0].text || '').match(/\d{4,8}/)?.[0];
          if (code) {
            await page.locator('input').first().fill(code);
            await page.locator('button[type="submit"]').first().click();
            await wait(3000);
            console.log('Verified!');
            break;
          }
        }
        process.stdout.write('.');
      }
    }
  }

  // Check final state - look for authorize/confirm
  await wait(2000);
  await page.screenshot({ path: 'nh_final.png' });
  const finalText = await page.locator('body').innerText();
  console.log('\nFinal:', finalText.substring(0, 500));
  console.log('URL:', page.url());

  // Keep browser open for 2 minutes
  console.log('\nBrowser open. Will close in 120s...');
  await wait(120000);
  await browser.close();
})();
