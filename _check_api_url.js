const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  async function checkUrl(url) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(`\n=== ${url} ===`);
      console.log('Title:', await page.title());
      console.log('Text:', text.substring(0, 300));
    } catch(e) {
      console.log(`\n=== ${url} ===`);
      console.log('Error:', e.message.substring(0, 100));
    }
  }
  
  await checkUrl('https://my.vultr.com/account/api/');
  await checkUrl('https://my.vultr.com/api/');
  await checkUrl('https://my.vultr.com/settings/api/');
  
  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
