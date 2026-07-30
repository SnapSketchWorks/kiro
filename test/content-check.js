/* 본문 · 도판 데이터 검사 (브라우저 불필요)
 *
 * 여기서는 DOM 을 흉내 내지 않는다. 순수 데이터만 본다.
 * 화면 동작은 test/browser-test.js 가 실제 브라우저로 검사한다.
 *
 * 사용법: node test/content-check.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let ok = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { ok++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}

/* ---------- 콘텐츠 로드 ---------- */
const parts = {};
const volumes = [];
const chapters = [];
global.window = {};
global.NOVEL = {
  setMeta(m) { this.meta = m; },
  addVolume(v) { volumes.push(v); },
  addPart(p) { parts[p.id] = p; },
  addChapter(c) { chapters.push(c); }
};
for (const f of fs.readdirSync(path.join(ROOT, 'content')).sort()) {
  eval(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
}
chapters.sort((a, b) => a.no - b.no);
const PHOTOS = global.window.PHOTOS || {};

/* ---------- 1. 구조 ---------- */
console.log('1) 작품 구조');
check('권 1개', volumes.length === 1);
check('부 5개 (4부 + 종장)', Object.keys(parts).length === 5, Object.keys(parts).length + '개');
check('화 25개', chapters.length === 25, chapters.length + '개');
check('화 번호 1~25 연속', chapters.every((c, i) => c.no === i + 1));
check('모든 화에 부가 지정됨', chapters.every((c) => !!parts[c.part]));
check('모든 화에 제목', chapters.every((c) => c.title && c.title.trim()));
const partOrder = ['p1', 'p2', 'p3', 'p4', 'p5'];
check('화가 부 순서대로 배치됨',
  chapters.every((c, i) => i === 0 || partOrder.indexOf(c.part) >= partOrder.indexOf(chapters[i - 1].part)));

/* ---------- 2. 분량 ---------- */
console.log('\n2) 분량');
let noSp = 0, withSp = 0;
chapters.forEach((c) => { noSp += c.body.replace(/\s/g, '').length; withSp += c.body.length; });
const CPM = 480;
const mins = Math.round(withSp / CPM);
check('공백 포함 10만자 이상', withSp >= 100000, withSp.toLocaleString() + '자');
check('원고지 500매 이상', withSp / 200 >= 500, Math.round(withSp / 200) + '매');
console.log('       공백 제외 ' + noSp.toLocaleString() + '자 / 공백 포함 ' + withSp.toLocaleString() +
  '자 / 원고지 약 ' + Math.round(withSp / 200) + '매 / 약 ' +
  Math.floor(mins / 60) + '시간 ' + (mins % 60) + '분');
const short = chapters.filter((c) => c.body.replace(/\s/g, '').length < 1800);
check('지나치게 짧은 화 없음 (1,800자 미만)', short.length === 0,
  short.map((c) => c.no + '화').join(','));

/* ---------- 3. 본문 마크업 ---------- */
console.log('\n3) 본문 마크업');
const badMark = [], badEmph = [], badTpl = [];
chapters.forEach((c) => {
  if ((c.body.match(/\*\*/g) || []).length % 2) badEmph.push(c.no + '화');
  if (c.body.includes('${') || c.body.includes('`')) badTpl.push(c.no + '화');
  c.body.split('\n').map((s) => s.trim()).filter(Boolean).forEach((l) => {
    if (/^#{3,}/.test(l) || /^\|\|/.test(l) || /^>>/.test(l)) badMark.push(c.no + '화: ' + l.slice(0, 24));
  });
});
check('강조 마크업 짝이 맞음', badEmph.length === 0, badEmph.join(','));
check('템플릿 리터럴 깨짐 없음', badTpl.length === 0, badTpl.join(','));
check('비정상 마커 없음', badMark.length === 0, badMark.slice(0, 3).join(' / '));
const kinds = { quote: 0, log: 0, sep: 0, head: 0, caption: 0 };
chapters.forEach((c) => {
  if (/^>\s/m.test(c.body)) kinds.quote++;
  if (/^\|\s/m.test(c.body)) kinds.log++;
  if (/^---$/m.test(c.body)) kinds.sep++;
  if (/^##\s/m.test(c.body)) kinds.head++;
  if (/^@\s/m.test(c.body)) kinds.caption++;
});
check('인용 블록 사용', kinds.quote >= 5, kinds.quote + '화');
check('화면 로그 블록 사용', kinds.log >= 5, kinds.log + '화');
check('장면 전환 기호 사용', kinds.sep >= 15, kinds.sep + '화');

/* ---------- 4. 도판 ---------- */
console.log('\n4) 도판');
check('전 25화에 도판', Object.keys(PHOTOS).length === 25, Object.keys(PHOTOS).length + '개');

function svgWellFormed(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    if (m[4] === '/') continue;
    if (m[1] === '/') { if (stack.pop() !== m[2]) return '닫힘 불일치: ' + m[2]; }
    else stack.push(m[2]);
  }
  return stack.length ? '닫히지 않음: ' + stack.join(',') : null;
}

const phBad = [];
for (let no = 1; no <= 25; no++) {
  const p = PHOTOS[no];
  if (!p) { phBad.push(no + '화 없음'); continue; }
  if (!/^<svg /.test(p.svg) || !/<\/svg>$/.test(p.svg)) phBad.push(no + '화 래퍼');
  const err = svgWellFormed(p.svg);
  if (err) phBad.push(no + '화 ' + err);
  if (!p.caption || !p.caption.trim()) phBad.push(no + '화 캡션');
  if (/undefined|NaN/.test(p.svg)) phBad.push(no + '화 undefined/NaN');
}
check('SVG 정합성 · 캡션 · 값 오류', phBad.length === 0, phBad.slice(0, 4).join(' / '));
check('도판이 테마 변수에 의존하지 않음',
  Object.keys(PHOTOS).every((no) => PHOTOS[no].svg.indexOf('var(') === -1));

/* 좌표가 프레임(720x520)을 크게 벗어나지 않는지 */
const oob = [];
Object.keys(PHOTOS).forEach((no) => {
  const svg = PHOTOS[no].svg;
  for (const m of svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    const x = +m[1], y = +m[2], w = +m[3], h = +m[4];
    if (x < -60 || y < -60 || x + w > 820 || y + h > 600) oob.push(no + '화 rect');
  }
});
check('도형 좌표가 프레임 안에 있음', oob.length === 0, [...new Set(oob)].slice(0, 4).join(','));

/* 참조 정의: f-* 는 공용(index.html), 나머지는 각 SVG 안 */
const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sharedMissing = new Set(), localMissing = [], sharedUsed = new Set();
Object.keys(PHOTOS).forEach((no) => {
  const svg = PHOTOS[no].svg;
  (svg.match(/url\(#([\w-]+)\)/g) || []).map((u) => u.slice(5, -1)).forEach((id) => {
    if (id.indexOf('f-') === 0) {
      sharedUsed.add(id);
      if (!shell.includes('id="' + id + '"')) sharedMissing.add(id);
    } else if (!svg.includes('id="' + id + '"')) localMissing.push(no + '화:' + id);
  });
});
check('공용 필터가 index.html 에 정의됨 (' + [...sharedUsed].sort().join(', ') + ')',
  sharedMissing.size === 0, [...sharedMissing].join(','));
check('도판별 그라디언트가 각 SVG 안에 정의됨', localMissing.length === 0,
  localMissing.slice(0, 4).join(','));

/* ---------- 5. 연속성 (나이 · 연도) ---------- */
console.log('\n5) 연속성');
const all = chapters.map((c) => c.body).join('\n');
const facts = [
  ['곽명수 1955년생 언급', /곽명수 할아버지는 1955년에 태어나서/],
  ['1992년 그날 나이 = 서른일곱', /그날 저희 아버지는 서른일곱이었고/],
  ['사진관 퇴사 후 십일 년', /사진관 그만두고 십일 년 됐고/],
  ['에필로그 서명 2032년', /서다인, 2032년 겨울/],
  ['개정판 2033 수록 설정', /개정판\(2033\)/]
];
facts.forEach(([n, re]) => check(n, re.test(all)));
check('1992년 - 1955년 = 37 (본문 서른일곱과 일치)', 1992 - 1955 === 37);
check('2032년 다인(2011.12생) 스무 살 / 진우(1983생) 마흔아홉',
  2032 - 2011 - 1 === 20 && 2032 - 1983 === 49);

/* ---------- 6. 배포 파일 ---------- */
console.log('\n6) 배포 구성');
['index.html', '404.html', 'og.png', 'LICENSE', 'README.md',
  'dist/misang.html', 'dist/미현상.html', '.nojekyll'].forEach((f) => {
  check('존재: ' + f, fs.existsSync(path.join(ROOT, f)));
});
const dist = fs.readFileSync(path.join(ROOT, 'dist/misang.html'), 'utf8');
check('단일 파일에 외부 참조 없음',
  !/<script src=|rel="stylesheet"/.test(dist));
check('단일 파일에 25화 모두 포함',
  chapters.every((c) => dist.includes(c.title)));
check('og:image 절대 URL', /property="og:image"\s+content="https:\/\//.test(shell));

console.log('\n========================================');
console.log(ok + ' 통과 / ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
