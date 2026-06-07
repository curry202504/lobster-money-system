const { chromium } = require('playwright');

const EMAIL = 'xin10141014@gmail.com';
const PASSWORD = 'Tujiaxin1996.';
const PHONE = '+447781583195';

async function waitForSms() {
  // Check 5sim for SMS
  const { execSync } = require('child_process');
  const cmd = `curl.exe -s "https://5sim.net/v1/user/check/1011203083" -H "Authorization: Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTA2MzgyNjAsImlhdCI6MTc3OTEwMjI2MCwicmF5IjoiMzBlMDZmZjNmY2FiOWZhYmI1MDlkZGZlZmE1OWUzNTkiLCJzdWIiOjQwODg4MDl9.JE7_Hhcf2is5s2qgevJM3hBGvKVKmBBwBoyrGvTIv5ySLpL1myYhd6Btql008USJBRsrbbIEpoOLgRNjtE70f9FrGI_THdHH2JNheoFW17oaHxhTC4djjZ7BUkO1YHh9YLukNnwSz5L7R8-_5C9VCTZQdGyvYdbP0toBmwO9VRKRpbh3lM6xLTOTffiWTww5OMo8n1KS1wgnZNXCd-iFCesSixRmxES8E1GmHDsbq2l9rPVHD_bEFxh8zHiCd6pXPLMfRds218cA5oqetL91y2kmYddWkgthiVXrtFbGmALpzZArHVJAg2Zn1dXMLg3Xb0JUzqGgX9jUIS_jMK64uQ" -H "Accept: application/json"`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    const data = JSON.parse(result);
    if (data.sms && data.sms.length > 0) {
      const code = data.sms[0].code || (data.sms[0].text ? data.sms[0].text.match(/\d{4,8}/g)?.[0] : null);
      return { code, data };
    }
    return null;
  } catch (e) {
    return null;
  }
}

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--proxy-server=http://127.0.0.1:7897']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('1. Going to chatgpt.com...');
  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  console.log('URL:', page.url());
  await page.screenshot({ path: 'step1_home.png' });
  
  // Look for sign-up/login buttons
  const bodyText = await page.locator('body').innerText();
  
  // Try clicking "Sign up" or "Get started" or "Log in" button
  const signUpBtn = page.locator('button:has-text("Sign up"), a:has-text("Sign up"), button:has-text("Get started"), a:has-text("Register")').first();
  const logInBtn = page.locator('button:has-text("Log in"), a:has-text("Log in")').first();
  
  if (await signUpBtn.isVisible().catch(() => false)) {
    console.log('2. Clicking Sign up');
    await signUpBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step2_signup_click.png' });
  } else if (await logInBtn.isVisible().catch(() => false)) {
    console.log('2. Clicking Log in (then navigate to signup)');
    await logInBtn.click();
    await page.waitForTimeout(3000);
  }
  
  console.log('URL after click:', page.url());
  
  // Navigate directly to /auth/signup if needed
  if (!page.url().includes('signup')) {
    await page.goto('https://chatgpt.com/auth/signup', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
  }
  
  console.log('Signup URL:', page.url());
  await page.screenshot({ path: 'step3_signup_page.png' });
  
  // Fill email
  const inputs = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').all();
  console.log(`Found ${inputs.length} email inputs`);
  
  // Try to fill whatever inputs are visible
  const allInputs = await page.locator('input').all();
  console.log(`Total inputs: ${allInputs.length}`);
  
  for (const input of allInputs) {
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder') || '';
    console.log(`  Input: type=${type}, placeholder=${placeholder}, id=${await input.getAttribute('id') || ''}`);
  }
  
  await page.screenshot({ path: 'step3b_inputs.png', fullPage: true });
  
  await browser.close();
  console.log('Done');
})();
