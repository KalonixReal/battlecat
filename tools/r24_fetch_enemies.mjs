/* r24: fetch enemy master list via z-ai page_reader → /tmp/enemyunits.json */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const main = async () => {
  const zai = await (await import('z-ai-web-dev-sdk')).default.create();
  const urls = [
    'https://battle-cats.fandom.com/wiki/Enemy_Release_Order',
    'https://battlecats.miraheze.org/wiki/Enemy_Release_Order',
  ];
  for (const url of urls) {
    try {
      const r = await zai.functions.invoke('page_reader', { url });
      const html = typeof r === 'string' ? r : (r.html || r.text || JSON.stringify(r));
      fs.writeFileSync('/tmp/enemyunits.json', JSON.stringify({ data: { html } }));
      console.log('OK', url, 'len', html.length);
      return;
    } catch (e) {
      console.log('FAIL', url, e.message);
    }
  }
  process.exit(1);
};
main();
