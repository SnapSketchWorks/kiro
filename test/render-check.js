/* 헤드리스 브라우저로 실제 렌더 결과를 검사한다.
   DOM 스텁 하네스로는 잡히지 않는 CSS 문제(hidden 무력화, stroke 상속,
   명암비, 닫힌 서랍의 포커스 누출 등)를 잡는다.

   검사 페이지는 여기서 조립한다. 예전에는 render-check.html 이 index.html 의
   SVG 필터 정의를 복사해서 갖고 있었는데, 정의가 바뀔 때마다 수동 동기화가
   필요해 실제로 두 번 어긋났다. 이제 index.html 에서 읽어와 주입한다.

   사용법: node test/render-check.js */
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
  console.log('브라우저를 찾지 못해 렌더 검사를 건너뜁니다.');
  console.log('(설치된 환경에서는 node test/render-check.js 로 실행됩니다)');
  process.exit(0);
}

const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const defs = shell.match(/<svg class="ph-defs"[\s\S]*?<\/svg>/)[0];
const page = fs.readFileSync(path.join(__dirname, 'render-check.tpl.html'), 'utf8')
  .replace('<!--DEFS-->', defs);

const tmp = path.join(__dirname, '_render-check.build.html');
fs.writeFileSync(tmp, page, 'utf8');

let dom;
try {
  dom = execFileSync(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--virtual-time-budget=3000', '--dump-dom', 'file://' + tmp
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 });
} catch (e) {
  console.error('렌더 실패:', e.message);
  process.exit(1);
} finally {
  fs.unlinkSync(tmp);
}

const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
if (!m) {
  console.error('검사 결과를 읽지 못했습니다. 페이지 스크립트가 실행되지 않았을 수 있습니다.');
  process.exit(1);
}
const text = m[1]
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

console.log('렌더 검사 (헤드리스 ' + path.basename(chrome) + ')');
console.log(text.split('\n').slice(1).join('\n'));

const head = text.split('\n')[0];
const failed = parseInt((head.match(/(\d+)\s*실패/) || [0, '0'])[1], 10);
console.log('----------------------------------------');
console.log(head.replace('RESULT ', ''));
process.exit(failed ? 1 : 0);
