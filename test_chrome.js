const { chromium } = require('playwright');

async function main() {
  try {
    console.log('Launching Chrome...');
    const browser = await chromium.launch({ 
      channel: 'chrome', 
      headless: false 
    });
    console.log('Chrome launched successfully');
    await browser.close();
    console.log('Done');
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

main();
