/* 실제 리더를 브라우저에서 구동해 검사한다.
 *
 * 예전에는 최소 DOM 스텁으로 로직만 확인했다. 그 방식은 두 번 실패했다.
 *   1) element.hidden = true 는 확인했지만 CSS 의 .cover{display:grid} 가
 *      이를 덮어써 표지가 모든 화 위에 남아 있었다.
 *   2) 스텁에 removeAttribute 가 없어 초기화 자체가 깨진 것을 늦게 알았다.
 * 그래서 이제 index.html 을 그대로 띄우고, 실제로 클릭하고,
 * 계산된 스타일을 읽는다.
 *
 * 사용법: node test/browser-test.js
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
  console.log('브라우저를 찾지 못해 브라우저 테스트를 건너뜁니다.');
  console.log('데이터 검사는 node test/content-check.js 로 실행됩니다.');
  process.exit(0);
}

/* ---------------- 페이지에서 실행될 검사 ---------------- */
const TEST = String.raw`
<script>
(function () {
  var log = [], pass = 0, fail = 0;
  function ck(name, cond, extra) {
    if (cond) { pass++; log.push('  OK   ' + name); }
    else { fail++; log.push('  FAIL ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
  }
  var $ = function (id) { return document.getElementById(id); };
  var cs = function (el) { return getComputedStyle(el); };
  function key(k) {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  }

  try {
  /* ── 1. 초기 상태 ── */
  ck('표지가 보인다', $('cover').hidden === false && cs($('cover')).display !== 'none');
  ck('본문은 숨겨져 있다', cs($('reader')).display === 'none');
  ck('상태 배지: 화수', /전 25화/.test($('badgeCount').textContent), $('badgeCount').textContent);
  ck('상태 배지: 예상 독서 시간', /\d+시간/.test($('badgeTime').textContent), $('badgeTime').textContent);
  ck('표지 통계: 원고지', /원고지/.test($('coverMeta').textContent));
  ck('시작 화 예고', /^1화 /.test($('coverHint').textContent), $('coverHint').textContent);

  /* ── 2. 목차 ── */
  var items = document.querySelectorAll('.toc__item');
  ck('목차 25항목', items.length === 25, items.length + '개');
  ck('목차에 부 구획 5개', document.querySelectorAll('.toc__part').length === 5);
  ck('목차에 화별 소요 시간', /\d+분/.test($('tocList').innerHTML));

  /* 닫힌 서랍이 탭 순서에서 제외되는가 (키보드 사용자가 안 보이는 항목을 지나면 안 된다) */
  ck('닫힌 목차는 visibility:hidden', cs($('toc')).visibility === 'hidden', cs($('toc')).visibility);
  $('btnToc').click();
  ck('열린 목차는 visibility:visible', cs($('toc')).visibility === 'visible');
  ck('목차 열림 시 aria-expanded', $('btnToc').getAttribute('aria-expanded') === 'true');
  $('btnTocClose').click();
  ck('목차 닫힘', cs($('toc')).visibility === 'hidden' || !$('toc').classList.contains('is-open'));

  /* ── 3. 화 이동과 렌더 ── */
  $('btnStart').click();
  ck('표지가 실제로 사라진다 (display:none)', cs($('cover')).display === 'none', cs($('cover')).display);
  ck('본문이 보인다', cs($('reader')).display !== 'none');
  ck('1화 제목 렌더', /제 1 화/.test($('reader').innerHTML));
  ck('부 헤더 렌더', /제1부 노출/.test($('reader').innerHTML));
  ck('문단 20개 이상', ($('reader').innerHTML.match(/<p>/g) || []).length > 20);
  ck('이전 화 버튼 비활성', $('btnPrev').disabled === true);
  ck('상단바 제목 갱신', /^1화 /.test($('topbarChap').textContent), $('topbarChap').textContent);
  ck('읽은 화 저장', (JSON.parse(localStorage.getItem('misang.read') || '[]')).indexOf(1) > -1);

  /* 도판이 실제로 그려지는가 */
  var svg = document.querySelector('.plate__frame svg');
  ck('도판 SVG 존재', !!svg);
  ck('도판이 본문 폭을 채운다 (>400px)', svg && Math.round(svg.getBoundingClientRect().width) > 400,
    svg ? Math.round(svg.getBoundingClientRect().width) + 'px' : '-');
  var pr = svg && svg.querySelector('rect');
  ck('도판에 UI 아이콘 stroke 상속 없음', pr && cs(pr).stroke === 'none', pr ? cs(pr).stroke : '-');
  ck('도판 fill 이 유효', pr && cs(pr).fill !== 'none' && cs(pr).fill !== 'rgb(0, 0, 0)');
  ck('도판 캡션 출력', !!document.querySelector('.plate__cap'));
  /* 반대 방향: 아이콘은 stroke 로 그리므로 stroke 가 살아 있어야 한다.
     도판 보호를 위해 전역 svg 규칙을 걷어낼 때 아이콘까지 죽이면 안 된다. */
  var iconPath = $('btnToc').querySelector('path');
  ck('UI 아이콘은 stroke 를 유지', iconPath && cs(iconPath).stroke !== 'none',
    iconPath ? cs(iconPath).stroke : '-');
  ck('UI 아이콘 크기 유지 (22px)',
    Math.round($('btnToc').querySelector('svg').getBoundingClientRect().width) === 22,
    Math.round($('btnToc').querySelector('svg').getBoundingClientRect().width) + 'px');
  ck('도판이 본문보다 앞', $('reader').innerHTML.indexOf('plate') < $('reader').innerHTML.indexOf('class="body"'));

  /* ── 4. 25화 전체 순회 ── */
  var seen = { quote: 0, log: 0, sep: 0, strong: 0, plate: 0 };
  for (var i = 0; i < 24; i++) {
    $('btnNext').click();
    var h = $('reader').innerHTML;
    if (/<blockquote>/.test(h)) seen.quote++;
    if (/<pre class="log">/.test(h)) seen.log++;
    if (/<div class="sep">/.test(h)) seen.sep++;
    if (/<strong>/.test(h)) seen.strong++;
    if (/figure class="plate"/.test(h)) seen.plate++;
  }
  ck('마지막 화 도달', $('btnNext').disabled === true);
  ck('완결 카드 표시', /theend/.test($('reader').innerHTML));
  ck('전 화에 도판 렌더 (24/24)', seen.plate === 24, seen.plate + '화');
  ck('인용 블록 렌더', seen.quote >= 5, seen.quote + '화');
  ck('로그 블록 렌더', seen.log >= 5, seen.log + '화');
  ck('장면 전환 렌더', seen.sep >= 15, seen.sep + '화');
  ck('현재 화에 aria-current', !!document.querySelector('.toc__item[aria-current="true"]'));

  /* ── 5. 설정 ── */
  function seg(id, idx) {
    $(id).children[idx].click();
  }
  seg('setSize', 4);
  ck('글자 크기 5단계 적용', document.documentElement.getAttribute('data-size') === '5');
  var fsBig = parseFloat(cs(document.querySelector('.body')).fontSize);
  seg('setSize', 0);
  var fsSmall = parseFloat(cs(document.querySelector('.body')).fontSize);
  ck('글자 크기가 실제 픽셀로 반영 (' + fsSmall + 'px < ' + fsBig + 'px)', fsSmall < fsBig);
  seg('setSize', 2);

  seg('setLeading', 2);
  ck('줄 간격 넓게', document.documentElement.getAttribute('data-leading') === 'loose');
  seg('setLeading', 1);
  seg('setWidth', 0);
  var narrow = parseFloat(cs($('reader')).maxWidth);
  seg('setWidth', 2);
  var wide = parseFloat(cs($('reader')).maxWidth);
  ck('본문 폭이 실제로 변한다 (' + narrow + ' < ' + wide + ')', narrow < wide);
  seg('setWidth', 1);

  seg('setFont', 1);
  ck('고딕 적용', document.documentElement.getAttribute('data-font') === 'sans');
  seg('setFont', 0);

  seg('setPhoto', 1);
  ck('사진 숨기기가 실제로 적용', cs(document.querySelector('.plate')).display === 'none');
  seg('setPhoto', 0);
  ck('사진 표시 복귀', cs(document.querySelector('.plate')).display !== 'none');

  ck('설정이 저장된다', !!localStorage.getItem('misang.settings'));
  $('btnReset').click();
  ck('설정 초기화', document.documentElement.getAttribute('data-size') === '3');

  /* ── 6. 테마 · 명암비 ── */
  function lum(c) {
    var m = c.match(/[\d.]+/g).slice(0, 3).map(function (v) {
      v = +v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  /* 배경색은 body 에 transition 이 걸려 있어 테마 변경 직후 읽으면
     전환 중간값이 나온다. 애니메이션되지 않는 커스텀 속성에서 읽는다. */
  function hexToRgb(h) {
    h = h.trim().replace('#', '');
    return 'rgb(' + [0, 2, 4].map(function (i) {
      return parseInt(h.substr(i, 2), 16);
    }).join(',') + ')';
  }
  ['light', 'sepia', 'dark'].forEach(function (t) {
    document.documentElement.setAttribute('data-theme', t);
    var bodyBg = hexToRgb(cs(document.documentElement).getPropertyValue('--bg'));
    var probe = document.createElement('span');
    document.body.appendChild(probe);
    ['--fg', '--fg-soft', '--fg-dim', '--accent'].forEach(function (v) {
      probe.style.color = 'var(' + v + ')';
      var r = ratio(cs(probe).color, bodyBg);
      ck('명암비 AA ' + t + ' ' + v + ' = ' + r.toFixed(2) + ':1', r >= 4.5);
    });
    probe.remove();
    ck('테마 보정 filter: ' + t, cs(document.querySelector('.plate__frame')).filter !== 'none');
  });
  document.documentElement.setAttribute('data-theme', 'dark');

  /* ── 7. 작품 정보 ── */
  var posBefore = localStorage.getItem('misang.position');
  $('btnInfo').click();
  ck('작품 정보 표시', cs($('info')).display !== 'none' && cs($('cover')).display === 'none');
  ck('완결 · 화수 표기', /완결/.test($('info').innerHTML) && /전 25화/.test($('info').innerHTML));
  ck('분량 표기', /원고지/.test($('info').innerHTML));
  ck('피드백 경로', /SnapSketchWorks\/kiro\/issues/.test($('info').innerHTML));
  ck('해시가 #info 로 갱신', location.hash === '#info', location.hash);
  /* 작품 정보에서 스크롤해도 읽던 위치가 오염되지 않아야 한다 */
  window.scrollTo(0, 400);
  window.dispatchEvent(new Event('scroll'));
  var posAfter = localStorage.getItem('misang.position');
  ck('작품 정보 스크롤이 읽던 위치를 덮어쓰지 않는다',
    JSON.parse(posAfter || '{}').no === JSON.parse(posBefore || '{}').no,
    posBefore + ' -> ' + posAfter);

  /* ── 8. 키보드 · 해시 ── */
  key('c');
  ck('C 키로 표지', cs($('cover')).display !== 'none');
  ck('표지로 돌아가면 해시 정리', location.hash === '', location.hash || '(빈값)');
  key('t');
  ck('T 키로 목차 열림', $('toc').classList.contains('is-open'));
  key('Escape');
  ck('ESC 로 목차 닫힘', !$('toc').classList.contains('is-open'));

  location.hash = '#12';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  ck('해시 딥링크 #12', /제 12 화/.test($('reader').innerHTML));
  key('ArrowRight');
  ck('오른쪽 화살표로 다음 화', /제 13 화/.test($('reader').innerHTML));
  key('ArrowLeft');
  ck('왼쪽 화살표로 이전 화', /제 12 화/.test($('reader').innerHTML));

  /* ── 9. 접근성 · 메타 ── */
  var sizeBtns = $('setSize').children;
  var labels = [];
  for (var b = 0; b < sizeBtns.length; b++) labels.push(sizeBtns[b].getAttribute('aria-label'));
  ck('글자 크기 버튼 5개 모두 aria-label', labels.every(function (l) { return !!l; }), labels.join(','));
  ck('글자 크기 라벨이 서로 구분', new Set(labels).size === 5);
  ['setTheme', 'setFont', 'setSize', 'setLeading', 'setWidth', 'setPhoto'].forEach(function (id) {
    ck('그룹 이름: ' + id, !!$(id).getAttribute('aria-labelledby'));
  });
  function meta(sel) { var m = document.querySelector(sel); return m && m.content; }
  ck('og:image 절대 URL', /^https:\/\//.test(meta('meta[property="og:image"]') || ''));
  ck('og:image 크기 명시', !!meta('meta[property="og:image:width"]'));
  ck('og:image 대체 텍스트', !!meta('meta[property="og:image:alt"]'));
  ck('twitter large image', meta('meta[name="twitter:card"]') === 'summary_large_image');
  ck('description 에 핵심 갈등', /천백사십|실화/.test(meta('meta[name="description"]') || ''));

  } catch (e) {
    fail++;
    log.push('  FAIL 예외 발생 -> ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]);
  }

  log.unshift('RESULT ' + pass + ' 통과 / ' + fail + ' 실패');
  var pre = document.createElement('pre');
  pre.id = 'TESTOUT';
  pre.textContent = log.join('\n');
  document.body.appendChild(pre);
})();
</script>
`;

/* ---------------- 페이지 조립 ---------------- */
let page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* 결정적 상태로 시작 */
page = page.replace('<head>', '<head>\n<script>try{localStorage.clear()}catch(e){}</script>');
/* reader.js 다음에 검사 스크립트를 넣는다 */
page = page.replace('</body>', TEST + '</body>');

const tmp = path.join(ROOT, '_browser-test.build.html');
fs.writeFileSync(tmp, page, 'utf8');

let dom;
try {
  dom = execFileSync(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--virtual-time-budget=6000', '--dump-dom', 'file://' + tmp
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.error('렌더 실패:', e.message);
  fs.unlinkSync(tmp);
  process.exit(1);
} finally {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
}

const m = dom.match(/<pre id="TESTOUT">([\s\S]*?)<\/pre>/);
if (!m) {
  console.error('검사 결과를 읽지 못했습니다. 페이지 스크립트가 실행되지 않았을 수 있습니다.');
  process.exit(1);
}
const text = m[1]
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

console.log('브라우저 테스트 (' + path.basename(chrome) + ', 실제 index.html)');
console.log(text.split('\n').slice(1).join('\n'));
const head = text.split('\n')[0];
console.log('========================================');
console.log(head.replace('RESULT ', ''));
process.exit(parseInt((head.match(/(\d+)\s*실패/) || [0, '0'])[1], 10) ? 1 : 0);
