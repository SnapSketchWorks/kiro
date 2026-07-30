/* 도판 검수용 정적 컨택트시트 생성
   사용법: node test/contact-sheet.js [dark|light|sepia] [출력경로] [only:1,4,9]
   JS 실행 없이 SVG가 HTML에 박힌 정적 파일을 만들어, 헤드리스 렌더 결과가
   스크립트 타이밍에 영향받지 않게 한다. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const theme = process.argv[2] || 'dark';
const out = process.argv[3] || path.join(ROOT, '..', 'shots', 'sheet-' + theme + '.html');
const onlyArg = (process.argv[4] || '').replace('only:', '');
const only = onlyArg ? onlyArg.split(',').map(Number) : null;

global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'content', 'photos.js'), 'utf8'));
const PHOTOS = global.window.PHOTOS;

const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const defs = shell.match(/<svg class="ph-defs"[\s\S]*?<\/svg>/)[0];
const css = fs.readFileSync(path.join(ROOT, 'assets', 'reader.css'), 'utf8');

const list = (only || Object.keys(PHOTOS).map(Number)).sort((a, b) => a - b);
const cols = list.length <= 2 ? list.length : 5;

let cells = '';
for (const no of list) {
  const p = PHOTOS[no];
  if (!p) continue;
  cells += '<figure class="cell"><div class="cell__no">' + no + '</div>' +
    '<figure class="plate"><div class="plate__frame">' + p.svg + '</div>' +
    '<figcaption class="plate__cap">' + no + '</figcaption></figure></figure>';
}

const html = '<!DOCTYPE html>\n<html lang="ko" data-theme="' + theme + '" data-photo="on">\n' +
  '<head><meta charset="utf-8"><title>contact sheet ' + theme + '</title>\n<style>\n' + css +
  '\nbody{margin:0;padding:18px}' +
  '.csheet{display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:16px 14px}' +
  '.cell{margin:0}.plate{margin:0}' +
  '.cell__no{font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:.1em;' +
  'color:var(--accent);margin-bottom:5px}' +
  '.plate__cap{font-size:10px;margin-top:5px}' +
  '</style></head>\n<body>\n<div class="csheet">' + cells + '</div>\n' + defs + '\n</body></html>\n';

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, 'utf8');
console.log('생성: ' + out + '  (' + theme + ', ' + list.length + '장, ' + cols + '열)');
