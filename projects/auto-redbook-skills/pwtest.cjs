const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/tmp/chromium' });
  const p = await b.newPage();
  await p.setContent('<h1>中文测试 ✓</h1>');
  console.log('OK version=', await b.version(), 'text=', await p.textContent('h1'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
