/* 리더 검증 하네스 — 최소 DOM으로 reader.js를 실제 실행한다.
   사용법: node test/harness.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 가짜 엘리먼트 ---------- */
let idSeq = 0;
function El(tag, attrs) {
  const self = {
    __id: ++idSeq,
    tagName: tag || 'div',
    _attrs: Object.assign({}, attrs),
    _classes: new Set(),
    _listeners: {},
    _html: '',
    children: [],
    style: {},
    hidden: false,
    disabled: false,
    textContent: '',
    value: '',
    classList: {
      add: (c) => self._classes.add(c),
      remove: (c) => self._classes.delete(c),
      contains: (c) => self._classes.has(c),
      toggle: (c, on) => {
        const v = on === undefined ? !self._classes.has(c) : !!on;
        v ? self._classes.add(c) : self._classes.delete(c);
        return v;
      }
    },
    getAttribute: (k) => (k in self._attrs ? self._attrs[k] : null),
    setAttribute: (k, v) => { self._attrs[k] = String(v); },
    removeAttribute: (k) => { delete self._attrs[k]; },
    hasAttribute: (k) => k in self._attrs,
    addEventListener: (type, fn) => {
      (self._listeners[type] = self._listeners[type] || []).push(fn);
    },
    dispatch: (type, ev) => {
      (self._listeners[type] || []).forEach((fn) => fn(Object.assign({
        target: self, preventDefault() {}, key: '', touches: [], changedTouches: []
      }, ev)));
    },
    click: () => self.dispatch('click', { target: self }),
    closest: (sel) => {
      sel = sel.split(',')[0].trim();
      // tag[attr] / [attr] 형태
      const attr = sel.match(/\[([^\]=]+)\]/);
      if (attr) {
        const tagPart = sel.slice(0, sel.indexOf('['));
        const tagOk = !tagPart || tagPart === self.tagName;
        return tagOk && self.getAttribute(attr[1]) !== null ? self : null;
      }
      if (sel.startsWith('.')) return self._classes.has(sel.slice(1)) ? self : null;
      return sel === self.tagName ? self : null;
    },
    matches: () => false,
    scrollIntoView() {},
    querySelector: (sel) => self.querySelectorAll(sel)[0] || null,
    querySelectorAll: (sel) => {
      const out = [];
      sel.split(',').map((s) => s.trim()).forEach((s) => {
        const cls = s.replace(/^\./, '');
        self.children.forEach((c) => { if (c._classes.has(cls)) out.push(c); });
      });
      return out;
    }
  };
  Object.defineProperty(self, 'innerHTML', {
    get: () => self._html,
    set: (v) => {
      self._html = String(v);
      // 목차 항목 재구성
      self.children = [];
      const re = /<button class="toc__item" data-idx="(\d+)" data-t="([^"]*)">/g;
      let m;
      while ((m = re.exec(self._html))) {
        const item = El('button', { 'data-idx': m[1], 'data-t': m[2] });
        item._classes.add('toc__item');
        self.children.push(item);
      }
      const re2 = /<div class="(toc__vol|toc__part)"/g;
      while ((m = re2.exec(self._html))) {
        const d = El('div');
        d._classes.add(m[1]);
        self.children.push(d);
      }
    }
  });
  return self;
}

const IDS = ['topbar', 'topbarChap', 'progressBar', 'btnToc', 'btnTocClose', 'btnTheme',
  'btnSettings', 'toc', 'tocList', 'tocSearch', 'tocStats', 'scrim', 'sheet', 'cover',
  'reader', 'pager', 'btnPrev', 'btnNext', 'btnTop', 'btnStart', 'btnResume', 'btnReset',
  'coverMeta', 'setTheme', 'setFont', 'setSize', 'setLeading', 'setWidth', 'setPhoto',
  'coverHint', 'badgeCount', 'badgeTime', 'btnInfo', 'info'];

const nodes = {};
IDS.forEach((id) => { nodes[id] = El('div', { id }); });

/* 세그먼트 버튼 채우기 */
const SEG_VALUES = {
  setTheme: ['auto', 'light', 'sepia', 'dark'],
  setFont: ['serif', 'sans'],
  setSize: ['1', '2', '3', '4', '5'],
  setLeading: ['tight', 'normal', 'loose'],
  setWidth: ['narrow', 'normal', 'wide'],
  setPhoto: ['on', 'off']
};
Object.keys(SEG_VALUES).forEach((id) => {
  nodes[id].children = SEG_VALUES[id].map((v) => El('button', { 'data-v': v }));
});

const documentElement = El('html');
const body = El('body');

global.document = {
  documentElement, body, title: '',
  getElementById: (id) => nodes[id] || null,
  addEventListener: (t, fn) => body.addEventListener(t, fn),
  _keydown: (key) => body.dispatch('keydown', { key, target: { matches: () => false } })
};

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

global.window = {
  NOVEL: null,
  scrollY: 0,
  innerHeight: 800,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: (fn) => fn(),
  addEventListener() {},
  scrollTo() {},
  localStorage: global.localStorage
};
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.setTimeout = global.setTimeout;
global.history = { replaceState() {} };
global.location = { hash: '' };
documentElement.scrollHeight = 4000;

/* ---------- 콘텐츠 로드 ---------- */
global.window.NOVEL = {
  meta: null, volumes: [], parts: [], chapters: [],
  setMeta(m) { this.meta = m; },
  addVolume(v) { this.volumes.push(v); },
  addPart(p) { this.parts.push(p); },
  addChapter(c) { this.chapters.push(c); }
};
global.NOVEL = global.window.NOVEL;

for (const f of fs.readdirSync(path.join(ROOT, 'content')).sort()) {
  eval(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
}

/* ---------- reader.js 실행 ---------- */
let ok = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { ok++; console.log('  OK  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}

console.log('1) reader.js 실행');
try {
  eval(fs.readFileSync(path.join(ROOT, 'assets', 'reader.js'), 'utf8'));
  check('예외 없이 초기화', true);
} catch (e) {
  check('예외 없이 초기화', false, e.message + '\n' + e.stack.split('\n')[1]);
  process.exit(1);
}

console.log('\n2) 설정 / 테마');
check('테마 속성 적용', documentElement.getAttribute('data-theme') === 'dark',
  documentElement.getAttribute('data-theme'));
check('글꼴 속성 적용', documentElement.getAttribute('data-font') === 'serif');
check('설정 저장', !!store['misang.settings']);
/* 순환: light -> sepia -> dark -> light (아이콘 표시와 일치) */
nodes.btnTheme.click();
check('다크 -> 라이트 전환', documentElement.getAttribute('data-theme') === 'light',
  documentElement.getAttribute('data-theme'));
nodes.btnTheme.click();
check('라이트 -> 세피아 전환', documentElement.getAttribute('data-theme') === 'sepia',
  documentElement.getAttribute('data-theme'));
nodes.btnTheme.click();
check('세피아 -> 다크 전환', documentElement.getAttribute('data-theme') === 'dark',
  documentElement.getAttribute('data-theme'));
/* 세그먼트는 상위 박스에 위임된 리스너를 쓴다 (버블링 대체) */
nodes.setSize.dispatch('click', { target: nodes.setSize.children[4] });
check('글자 크기 5단계 적용', documentElement.getAttribute('data-size') === '5',
  documentElement.getAttribute('data-size'));
check('선택 버튼 표시', nodes.setSize.children[4].classList.contains('is-on'));
nodes.setLeading.dispatch('click', { target: nodes.setLeading.children[2] });
check('줄간격 넓게 적용', documentElement.getAttribute('data-leading') === 'loose');
nodes.setWidth.dispatch('click', { target: nodes.setWidth.children[0] });
check('본문 폭 좁게 적용', documentElement.getAttribute('data-width') === 'narrow');
nodes.setFont.dispatch('click', { target: nodes.setFont.children[1] });
check('고딕 글꼴 적용', documentElement.getAttribute('data-font') === 'sans');
nodes.btnReset.click();
check('설정 초기화', documentElement.getAttribute('data-size') === '3' &&
  documentElement.getAttribute('data-leading') === 'normal');

console.log('\n3) 목차');
const items = nodes.tocList.querySelectorAll('.toc__item');
check('목차 항목 25개', items.length === 25, items.length + '개');
check('권 표기 존재', nodes.tocList.innerHTML.includes('제1권'));
['제1부 노출', '제2부 잠상', '제3부 현상', '제4부 정착', '종장 수세'].forEach((p) => {
  check('부 표기: ' + p, nodes.tocList.innerHTML.includes(p));
});
check('표지 배지: 화수', /전 25화/.test(nodes.badgeCount.textContent), nodes.badgeCount.textContent);
check('표지 배지: 예상 독서 시간', /시간/.test(nodes.badgeTime.textContent), nodes.badgeTime.textContent);
check('표지 통계: 원고지 매수', /원고지/.test(nodes.coverMeta.textContent), nodes.coverMeta.textContent);
check('시작 화 예고', /^1화 /.test(nodes.coverHint.textContent), nodes.coverHint.textContent);
check('목차에 화별 소요 시간', /\d+분/.test(nodes.tocList.innerHTML));

console.log('\n4) 첫 화 렌더링');
nodes.btnStart.click();
const h = nodes.reader.innerHTML;
check('본문 표시', nodes.reader.hidden === false && nodes.cover.hidden === true);
check('화 제목 출력', h.includes('미현상') && h.includes('제 1 화'));
check('부 헤더 출력', h.includes('제1부 노출'));
check('문단 <p> 생성', (h.match(/<p>/g) || []).length > 20);
check('이전 화 버튼 비활성', nodes.btnPrev.disabled === true);
check('다음 화 카드', h.includes('nextcard'));
check('상단바 제목 갱신', nodes.topbarChap.textContent.startsWith('1화'));
check('읽은 화 저장', JSON.parse(store['misang.read']).includes(1));
check('위치 저장', JSON.parse(store['misang.position']).no === 1);

console.log('\n5) 마크업 파서 (전 25화)');
let quote = 0, log = 0, sep = 0, h3 = 0, strong = 0, caption = 0;
for (let i = 0; i < 25; i++) {
  nodes.btnNext.click();
  const b = nodes.reader.innerHTML;
  if (/<blockquote>/.test(b)) quote++;
  if (/<pre class="log">/.test(b)) log++;
  if (/<div class="sep">/.test(b)) sep++;
  if (/<h3>/.test(b)) h3++;
  if (/<strong>/.test(b)) strong++;
  if (/<div class="caption">/.test(b)) caption++;
  if (/[>|@]\s/.test(b.replace(/<[^>]+>/g, ''))) {
    // 파서가 처리하지 못한 마커가 본문 텍스트로 남았는지
  }
}
check('인용 블록 렌더링', quote > 5, quote + '화에서 발견');
check('로그 블록 렌더링', log > 5, log + '화에서 발견');
check('장면 전환 기호', sep > 15, sep + '화에서 발견');
check('강조 렌더링', strong > 3, strong + '화에서 발견');
check('마지막 화 도달', nodes.btnNext.disabled === true);
check('완결 카드 표시', nodes.reader.innerHTML.includes('theend'));

console.log('\n6) 미처리 마커 잔존 검사');
let leftovers = [];
for (let i = 0; i < 25; i++) {
  const c = global.NOVEL.chapters[i];
  const lines = c.body.split('\n').map((s) => s.trim()).filter(Boolean);
  lines.forEach((l) => {
    if (/^[#]{3,}/.test(l) || /^\|\|/.test(l)) leftovers.push(c.no + '화: ' + l.slice(0, 30));
  });
}
check('비정상 마커 없음', leftovers.length === 0, leftovers.join(' / '));

console.log('\n7) 키보드 / 해시 이동');
global.document._keydown('t');
check('T 키로 목차 열림', nodes.toc.classList.contains('is-open'));
global.document._keydown('Escape');
check('ESC로 목차 닫힘', !nodes.toc.classList.contains('is-open'));

console.log('\n7-2) 작품 정보 화면');
nodes.btnInfo.click();
check('작품 정보 표시', nodes.info.hidden === false && nodes.cover.hidden === true);
check('완결 · 화수 표기', /완결/.test(nodes.info.innerHTML) && /전 25화/.test(nodes.info.innerHTML));
check('분량 · 원고지 표기', /원고지/.test(nodes.info.innerHTML));
check('피드백 경로', /github\.com\/SnapSketchWorks\/kiro\/issues/.test(nodes.info.innerHTML));
check('부 구성 표기', /노출/.test(nodes.info.innerHTML) && /수세/.test(nodes.info.innerHTML));

console.log('\n7-3) 접근성 (index.html 정적 검사)');
const shellHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sizeSeg = (shellHtml.match(/id="setSize"[\s\S]*?<\/div>/) || [''])[0];
const sizeBtns = sizeSeg.match(/<button[^>]*>/g) || [];
check('글자 크기 버튼 5개', sizeBtns.length === 5, sizeBtns.length + '개');
check('글자 크기 버튼마다 aria-label',
  sizeBtns.length === 5 && sizeBtns.every((b) => /aria-label="[^"]+"/.test(b)),
  sizeBtns.filter((b) => !/aria-label/.test(b)).length + '개 누락');
check('글자 크기 라벨이 서로 구분됨',
  new Set(sizeBtns.map((b) => (b.match(/aria-label="([^"]+)"/) || [])[1])).size === 5);
['setTheme', 'setFont', 'setSize', 'setLeading', 'setWidth', 'setPhoto'].forEach((id) => {
  const seg = (shellHtml.match(new RegExp('id="' + id + '"[^>]*>')) || [''])[0];
  check('세그먼트 그룹 이름: ' + id, /aria-labelledby="[^"]+"/.test(seg));
});
check('og:image 지정', /property="og:image"\s+content="https:\/\//.test(shellHtml));
check('og:image 크기 명시',
  /og:image:width/.test(shellHtml) && /og:image:height/.test(shellHtml));
check('og:image 대체 텍스트', /og:image:alt/.test(shellHtml));
check('twitter 카드 large', /name="twitter:card"\s+content="summary_large_image"/.test(shellHtml));

console.log('\n8) 도판 (각 화의 사진)');
const PH = global.window.PHOTOS || {};
check('전 25화에 도판 존재', Object.keys(PH).length === 25, Object.keys(PH).length + '개');

/* SVG 태그 정합성 검사 (스택 기반) */
function svgWellFormed(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const closing = m[1] === '/', tag = m[2], selfClose = m[4] === '/';
    if (selfClose) continue;
    if (closing) {
      if (stack.pop() !== tag) return '닫힘 불일치: ' + tag;
    } else stack.push(tag);
  }
  return stack.length ? '닫히지 않은 태그: ' + stack.join(',') : null;
}

let phBad = [];
for (let no = 1; no <= 25; no++) {
  const p = PH[no];
  if (!p) { phBad.push(no + '화: 없음'); continue; }
  if (!/^<svg /.test(p.svg) || !/<\/svg>$/.test(p.svg)) phBad.push(no + '화: svg 래퍼 이상');
  const err = svgWellFormed(p.svg);
  if (err) phBad.push(no + '화: ' + err);
  if (!p.caption || !p.caption.trim()) phBad.push(no + '화: 캡션 없음');
  if (/undefined|NaN/.test(p.svg)) phBad.push(no + '화: undefined/NaN 포함');
}
check('SVG 태그 정합성 · 캡션 · 값 오류', phBad.length === 0, phBad.slice(0, 4).join(' / '));

/* 참조 정의 확인
   - f-* : 공용 필터. index.html 의 ph-defs 에 있어야 한다
   - 그 외 : 각 도판이 자기 <defs> 안에 직접 정의해야 한다 (테마 전환 안전) */
const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sharedMissing = new Set();
const localMissing = [];
const sharedUsed = new Set();

Object.keys(PH).forEach((no) => {
  const svg = PH[no].svg;
  const used = (svg.match(/url\(#([\w-]+)\)/g) || []).map((u) => u.slice(5, -1));
  used.forEach((id) => {
    if (id.indexOf('f-') === 0) {
      sharedUsed.add(id);
      if (!shell.includes('id="' + id + '"')) sharedMissing.add(id);
    } else if (!svg.includes('id="' + id + '"')) {
      localMissing.push(no + '화:' + id);
    }
  });
});
check('공용 필터가 index.html 에 정의됨 (' + [...sharedUsed].sort().join(', ') + ')',
  sharedMissing.size === 0, '누락: ' + [...sharedMissing].join(','));
check('도판별 그라디언트가 각 SVG 안에 정의됨',
  localMissing.length === 0, localMissing.slice(0, 5).join(', '));

/* 실제 렌더링에 삽입되는지 (1화 다시 렌더) */
nodes.btnStart.click();
const rendered = nodes.reader.innerHTML;
check('본문에 figure.plate 삽입', rendered.includes('<figure class="plate">'));
check('도판 캡션 출력', rendered.includes('plate__cap'));
check('도판이 본문보다 앞에 위치',
  rendered.indexOf('plate') < rendered.indexOf('<div class="body">'));

/* 숨기기 설정 */
nodes.setPhoto.dispatch('click', { target: nodes.setPhoto.children[1] });
check('사진 숨기기 설정 반영', documentElement.getAttribute('data-photo') === 'off',
  documentElement.getAttribute('data-photo'));
nodes.setPhoto.dispatch('click', { target: nodes.setPhoto.children[0] });
check('사진 표시 복귀', documentElement.getAttribute('data-photo') === 'on');

console.log('\n========================================');
console.log(ok + ' 통과 / ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
