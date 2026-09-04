// Local VLM via z-ai vision API
// Usage: bun tools/vlm.mjs <imagePath> <prompt>
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
const [imgPath, prompt] = process.argv.slice(2);
if (!imgPath || !prompt) { console.error('usage: bun tools/vlm.mjs <img> <prompt>'); process.exit(1); }
const img = fs.readFileSync(imgPath).toString('base64');
const zai = await ZAI.create();
const r = await zai.chat.completions.createVision({
  messages: [{role:'user', content:[
    {type:'text', text: prompt},
    {type:'image_url', image_url:{url:`data:image/png;base64,${img}`}}
  ]}]
});
console.log(r.choices[0].message.content);
