/* 미현상 — 단일 파일 빌드 스크립트
   사용법: node build.js
   결과: dist/미현상.html  (CSS/JS/본문이 전부 인라인된 단일 HTML)
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, '미현상.html');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

let html = read('index.html');

/* 1) <link rel="stylesheet" href="..."> -> <style> */
html = html.replace(/[ \t]*<link rel="stylesheet" href="([^"]+)">\s*/g, (m, href) => {
  return '<style>\n' + read(href).trim() + '\n</style>\n';
});

/* 2) <script src="..."></script> -> <script> ... </script> */
html = html.replace(/[ \t]*<script src="([^"]+)"><\/script>\s*/g, (m, src) => {
  return '<script>\n' + read(src).trim() + '\n</script>\n';
});

/* 3) 단일 파일 안내 주석 */
html = html.replace('<head>',
  '<head>\n<!-- 미현상(未現像) — 단일 파일 리더. 이 파일 하나만 있으면 오프라인에서 읽을 수 있습니다. -->');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, html, 'utf8');
/* 한글 파일명이 불편한 환경을 위한 영문명 사본 */
fs.writeFileSync(path.join(OUT_DIR, 'misang.html'), html, 'utf8');

/* 4) 통계 */
global.window = global.window || {};   /* photos.js 가 window 에 등록하므로 */
const stats = { n: 0, noSpace: 0, withSpace: 0, parts: {} };
global.NOVEL = {
  setMeta() {}, addVolume() {},
  addPart(p) { stats.parts[p.id] = p.label + ' ' + p.title; },
  addChapter(c) {
    stats.n++;
    stats.noSpace += c.body.replace(/\s/g, '').length;
    stats.withSpace += c.body.length;
  }
};
for (const f of fs.readdirSync(path.join(ROOT, 'content')).sort()) {
  eval(read(path.join('content', f)));
}

const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
console.log('빌드 완료: dist/미현상.html (' + kb + ' KB)');
console.log('----------------------------------------');
console.log('수록  : 전 ' + stats.n + '화 (제1권 · 4부 + 종장)');
console.log('분량  : 공백 제외 ' + stats.noSpace.toLocaleString('ko-KR') + '자 / 공백 포함 ' +
            stats.withSpace.toLocaleString('ko-KR') + '자');
console.log('환산  : 200자 원고지 약 ' + Math.round(stats.withSpace / 200) + '매');
console.log('        신국판 약 ' + Math.round(stats.withSpace / 420) + '쪽 분량');
console.log('읽기  : 약 ' + (stats.noSpace / 700 / 60).toFixed(1) + '시간');
