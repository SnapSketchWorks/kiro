/* 공유 카드(og.png) 생성 — 헤드리스 브라우저로 1200x630 렌더
   사용법: node tools/make-og.js
   결과: og.png (저장소 루트)
*/
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const CANDIDATES = [
  'chrome', 'chromium', 'google-chrome',
  '/usr/local/bin/chrome',
  '/opt/playwright/chromium-1232/chrome-linux64/chrome'
];

function findChrome() {
  for (const c of CANDIDATES) {
    try { execFileSync(c, ['--version'], { stdio: 'ignore' }); return c; }
    catch (e) { /* 다음 후보 */ }
  }
  return null;
}

const chrome = findChrome();
if (!chrome) {
  console.log('브라우저를 찾지 못해 og.png 생성을 건너뜁니다. 기존 파일을 유지합니다.');
  process.exit(0);
}

/* 도판 공용 필터를 index.html 에서 가져와 카드에 주입한다 */
const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const defs = shell.match(/<svg class="ph-defs"[\s\S]*?<\/svg>/)[0];
const cardSrc = fs.readFileSync(path.join(__dirname, 'og-card.html'), 'utf8');
const built = cardSrc.replace(
  /<svg class="ph-defs"[\s\S]*?<\/svg>/,
  defs.replace('class="ph-defs"', 'class="ph-defs" style="position:absolute;width:0;height:0"')
);
const tmp = path.join(__dirname, '_og-build.html');
fs.writeFileSync(tmp, built, 'utf8');

const out = path.join(ROOT, 'og.png');
try {
  execFileSync(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--virtual-time-budget=4000',
    '--window-size=1200,630',
    '--screenshot=' + out,
    'file://' + tmp
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
} finally {
  fs.unlinkSync(tmp);
}

if (!fs.existsSync(out)) {
  console.error('og.png 생성 실패');
  process.exit(1);
}
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log('생성: og.png (1200x630, ' + kb + ' KB)');
console.log('참조: <meta property="og:image" content="https://snapsketchworks.github.io/kiro/og.png">');
