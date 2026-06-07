const { chromium } = require('playwright');

const EMAIL = 'xin10141014@gmail.com';
const PASSWORD = 'Tujiaxin1996.';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 900 }
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });
  const page = await context.newPage();

  // Try platform.openai.com - less Cloudflare
  console.log('=== OpenAI Platform ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'p1.png' });
  
  const pageText = await page.locator('body').innerText();
  console.log('Text:', pageText.substring(0, 500));
  
  // Check all inputs
  const inputs = await page.locator('input:visible').all();
  for (const inp of inputs) {
    const id = await inp.getAttribute('id');
    const name = await inp.getAttribute('name');
    const type = await inp.getAttribute('type');
    const pl = await inp.getAttribute('placeholder');
    console.log(`  input id="${id}" name="${name}" type="${type}" placeholder="${pl}"`);
  }
  
  const btns = await page.locator('button:visible').all();
  for (const btn of btns) {
    const text = await btn.textContent();
    if (text && text.trim().length < 50) console.log(`  button "${text.trim()}"`);
  }

  await browser.close();
})();
