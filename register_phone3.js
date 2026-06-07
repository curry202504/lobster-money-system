const { chromium } = require('playwright');

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
  const browser = await chromium.launch({ 
    headless: true,
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
    viewport: { width: 1280, height: 900 }
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  console.log('=== Register via phone (full flow) ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(2000);

  // Click "Continue with phone"
  await page.locator('button:has-text("Continue with phone")').click();
  await wait(2000);

  // Select country code +44 for UK
  const countryText = page.locator('text=Singapore').first();
  if (await countryText.isVisible().catch(() => false)) {
    await countryText.click();
    await wait(500);
    await page.keyboard.type('United Kingdom');
    await wait(1000);
    await page.keyboard.press('Enter');
    await wait(500);
  }

  // Fill phone
  await page.locator('#phone, input[type="tel"]').first().fill(PHONE);
  console.log('Phone filled');
  await page.screenshot({ path: 'r1_phone.png' });
  
  // Submit phone
  await page.locator('button[type="submit"]').first().click();
  await wait(3000);
  console.log('Phone submitted');
  await page.screenshot({ path: 'r2_after_phone.png' });

  // Check what page we're on
  const text1 = await page.locator('body').innerText();
  console.log('Page:', text1.substring(0, 300));

  // If password is requested, fill it
  if (text1.includes('Password') || text1.includes('password')) {
    const passInput = page.locator('#password, input[type="password"]').first();
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill(PASSWORD);
      console.log('Password filled');
      await page.screenshot({ path: 'r3_password.png' });
      
      await page.locator('button[type="submit"]').first().click();
      await wait(3000);
      console.log('Password submitted');
      await page.screenshot({ path: 'r4_after_password.png' });
      
      const text2 = await page.locator('body').innerText();
      console.log('After password:', text2.substring(0, 300));
    }
  }

  // Check for SMS verification code input
  const text3 = await page.locator('body').innerText();
  if (text3.includes('code') || text3.includes('Code') || text3.includes('verify') || text3.includes('sms')) {
    console.log('Waiting for SMS verification code...');
    
    for (let i = 0; i < 36; i++) {
      await wait(5000);
      const data = checkSms();
      if (data && data.sms && data.sms.length > 0) {
        const smsText = data.sms[0].text || '';
        const code = smsText.match(/\d{4,8}/)?.[0] || data.sms[0].code;
        console.log(`SMS: "${smsText.substring(0,80)}" code="${code}"`);
        if (code) {
          await page.locator('input[type="text"], input[maxlength], #code').first().fill(code);
          await wait(500);
          await page.locator('button[type="submit"]').first().click();
          await wait(3000);
          console.log('Code verified!');
          await page.screenshot({ path: 'r5_verified.png' });
          console.log('URL:', page.url());
          
          // Check if logged in
          const loggedText = await page.locator('body').innerText();
          console.log('After verify:', loggedText.substring(0, 500));
          break;
        }
      }
      process.stdout.write('.');
    }
  } else {
    console.log('No code verification - checking for redirect...');
    await page.screenshot({ path: 'rX_unexpected.png' });
  }

  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 'r_final.png' });
  
  // Show cookies/storage
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => c.name).join(', '));
  
  await browser.close();
})();
