/* ============================================================
   미현상(未現像) — 리더 스크립트
   의존성 없음 / 로컬 파일(file://)에서도 동작
   ============================================================ */
(function () {
  'use strict';

  var N = window.NOVEL;
  var LS_SET = 'misang.settings';
  var LS_POS = 'misang.position';
  var LS_READ = 'misang.read';

  var $ = function (id) { return document.getElementById(id); };

  var el = {
    root: document.documentElement,
    body: document.body,
    topbar: $('topbar'),
    topbarChap: $('topbarChap'),
    progressBar: $('progressBar'),
    btnToc: $('btnToc'),
    btnTocClose: $('btnTocClose'),
    btnTheme: $('btnTheme'),
    btnSettings: $('btnSettings'),
    toc: $('toc'),
    tocList: $('tocList'),
    tocSearch: $('tocSearch'),
    tocStats: $('tocStats'),
    scrim: $('scrim'),
    sheet: $('sheet'),
    cover: $('cover'),
    reader: $('reader'),
    pager: $('pager'),
    btnPrev: $('btnPrev'),
    btnNext: $('btnNext'),
    btnTop: $('btnTop'),
    btnStart: $('btnStart'),
    btnResume: $('btnResume'),
    btnReset: $('btnReset'),
    coverMeta: $('coverMeta'),
    coverHint: $('coverHint'),
    badgeCount: $('badgeCount'),
    badgeTime: $('badgeTime'),
    btnInfo: $('btnInfo'),
    info: $('info')
  };

  /* ---------------- 설정 ---------------- */
  var PHOTOS = window.PHOTOS || {};
  var DEFAULTS = {
    theme: 'auto', font: 'serif', size: '3',
    leading: 'normal', width: 'normal', photo: 'on'
  };
  var settings = load(LS_SET, {});
  for (var k in DEFAULTS) { if (!(k in settings)) settings[k] = DEFAULTS[k]; }

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function applySettings() {
    var resolved = settings.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme;
    el.root.setAttribute('data-theme', resolved);
    el.root.setAttribute('data-font', settings.font);
    el.root.setAttribute('data-size', settings.size);
    el.root.setAttribute('data-leading', settings.leading);
    el.root.setAttribute('data-width', settings.width);
    el.root.setAttribute('data-photo', settings.photo);
    syncSegs();
    save(LS_SET, settings);
  }

  var SEGS = {
    setTheme: 'theme', setFont: 'font', setSize: 'size',
    setLeading: 'leading', setWidth: 'width', setPhoto: 'photo'
  };

  function syncSegs() {
    Object.keys(SEGS).forEach(function (id) {
      var box = $(id); if (!box) return;
      var key = SEGS[id];
      Array.prototype.forEach.call(box.children, function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-v') === String(settings[key]));
        b.setAttribute('aria-pressed', b.classList.contains('is-on') ? 'true' : 'false');
      });
    });
  }

  Object.keys(SEGS).forEach(function (id) {
    var box = $(id); if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      settings[SEGS[id]] = b.getAttribute('data-v');
      applySettings();
    });
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
    if (settings.theme === 'auto') applySettings();
  });

  el.btnTheme.addEventListener('click', function () {
    var order = ['light', 'sepia', 'dark'];
    var cur = el.root.getAttribute('data-theme');
    settings.theme = order[(order.indexOf(cur) + 1) % order.length];
    applySettings();
  });

  el.btnReset.addEventListener('click', function () {
    settings = JSON.parse(JSON.stringify(DEFAULTS));
    applySettings();
  });

  /* ---------------- 본문 파서 ----------------
     빈 줄 = 문단 구분
     ## 소제목      -> h3
     > 인용/편지    -> blockquote
     | 화면 로그    -> pre.log
     @ 사진 캡션    -> div.caption
     ---           -> 장면 전환 기호
     **강조** *기울임*
  ------------------------------------------------ */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function render(text) {
    var lines = String(text).replace(/\r/g, '').split('\n');
    var out = [];
    var buf = [];
    var mode = null; // null | 'p' | 'quote' | 'log' | 'caption'

    function flush() {
      if (!buf.length) { mode = null; return; }
      if (mode === 'p') {
        out.push('<p>' + inline(buf.join(' ')) + '</p>');
      } else if (mode === 'quote') {
        out.push('<blockquote>' + buf.map(function (l) {
          return '<p>' + inline(l) + '</p>';
        }).join('') + '</blockquote>');
      } else if (mode === 'log') {
        out.push('<pre class="log">' + buf.map(function (l) {
          return esc(l).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
        }).join('\n') + '</pre>');
      } else if (mode === 'caption') {
        out.push('<div class="caption">' + buf.map(function (l) {
          return inline(l);
        }).join('<br>') + '</div>');
      }
      buf = [];
      mode = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var line = raw.trim();

      if (line === '') { flush(); continue; }
      if (line === '---') { flush(); out.push('<div class="sep"></div>'); continue; }

      if (line.indexOf('## ') === 0) {
        flush();
        out.push('<h3>' + inline(line.slice(3)) + '</h3>');
        continue;
      }
      if (line.charAt(0) === '>') {
        if (mode !== 'quote') flush();
        mode = 'quote';
        buf.push(line.replace(/^>\s?/, ''));
        continue;
      }
      if (line.charAt(0) === '|') {
        if (mode !== 'log') flush();
        mode = 'log';
        buf.push(line.replace(/^\|\s?/, ''));
        continue;
      }
      if (line.charAt(0) === '@') {
        if (mode !== 'caption') flush();
        mode = 'caption';
        buf.push(line.replace(/^@\s?/, ''));
        continue;
      }
      if (mode !== 'p') flush();
      mode = 'p';
      buf.push(line);
    }
    flush();
    return out.join('\n');
  }

  /* ---------------- 데이터 준비 ---------------- */
  var chapters = N.chapters.slice().sort(function (a, b) { return a.no - b.no; });
  var partsById = {};
  N.parts.forEach(function (p) { partsById[p.id] = p; });

  /* 한국어 문학 산문 기준 읽기 속도. 공백 포함 분당 글자수.
     이전에 쓰던 700자/분은 정보성 글 기준으로, 소설에는 너무 빨랐다. */
  var CPM = 480;

  var totalChars = 0, totalCharsSp = 0;
  chapters.forEach(function (c) {
    c.chars = String(c.body).replace(/\s/g, '').length;
    c.charsSp = String(c.body).length;
    totalChars += c.chars;
    totalCharsSp += c.charsSp;
  });

  var readSet = {};
  (load(LS_READ, []) || []).forEach(function (n) { readSet[n] = true; });

  var current = -1; // -1 = 표지

  function minutes(charsSp) { return Math.max(1, Math.round(charsSp / CPM)); }

  function hhmm(charsSp) {
    var m = Math.round(charsSp / CPM);
    var h = Math.floor(m / 60), mm = m % 60;
    if (h <= 0) return m + '분';
    return h + '시간' + (mm ? ' ' + mm + '분' : '');
  }

  el.badgeCount.textContent = '전 ' + chapters.length + '화';
  el.badgeTime.textContent = '약 ' + hhmm(totalCharsSp);
  el.coverMeta.textContent =
    '제1권 · 4부 + 종장 · 공백 포함 ' + totalCharsSp.toLocaleString('ko-KR') + '자 · ' +
    '200자 원고지 약 ' + Math.round(totalCharsSp / 200).toLocaleString('ko-KR') + '매';
  if (chapters.length) {
    el.coverHint.textContent = '1화 ' + chapters[0].title + ' 부터 시작합니다';
  }

  /* ---------------- 목차 ---------------- */
  function buildToc() {
    var html = '';
    var lastVol = null, lastPart = null;
    chapters.forEach(function (c, idx) {
      var part = partsById[c.part] || {};
      if (part.volume !== lastVol) {
        lastVol = part.volume;
        var vol = (N.volumes.filter(function (v) { return v.no === lastVol; })[0]) || {};
        html += '<div class="toc__vol">제' + (lastVol || 1) + '권 ' + (vol.title || '') + '</div>';
      }
      if (c.part !== lastPart) {
        lastPart = c.part;
        html += '<div class="toc__part"><b>' + (part.label || '') + ' ' + (part.title || '') +
                '</b><i>' + (part.hanja || '') + '</i></div>';
      }
      html += '<button class="toc__item" data-idx="' + idx + '" data-t="' + (c.title || '').replace(/"/g, '') + '">' +
              '<span class="toc__no">' + c.no + '화</span>' +
              '<span class="toc__t">' + c.title + '</span>' +
              '<span class="toc__min">' + minutes(c.charsSp) + '분</span>' +
              '<span class="toc__dot"></span></button>';
    });
    el.tocList.innerHTML = html;
  }

  function refreshToc() {
    var items = el.tocList.querySelectorAll('.toc__item');
    Array.prototype.forEach.call(items, function (b) {
      var i = +b.getAttribute('data-idx');
      b.classList.toggle('is-current', i === current);
      b.classList.toggle('is-read', !!readSet[chapters[i].no]);
      if (i === current) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    var readCount = chapters.filter(function (c) { return readSet[c.no]; }).length;
    el.tocStats.textContent = '읽은 화 ' + readCount + ' / ' + chapters.length +
      ' · 전체 약 ' + totalChars.toLocaleString('ko-KR') + '자';
  }

  el.tocList.addEventListener('click', function (e) {
    var b = e.target.closest('.toc__item');
    if (!b) return;
    go(+b.getAttribute('data-idx'));
    closeToc();
  });

  el.tocSearch.addEventListener('input', function () {
    var q = el.tocSearch.value.trim().toLowerCase();
    Array.prototype.forEach.call(el.tocList.querySelectorAll('.toc__item'), function (b) {
      var t = (b.getAttribute('data-t') || '').toLowerCase();
      b.style.display = (!q || t.indexOf(q) > -1) ? '' : 'none';
    });
    Array.prototype.forEach.call(el.tocList.querySelectorAll('.toc__vol,.toc__part'), function (d) {
      d.style.display = q ? 'none' : '';
    });
  });

  /* ---------------- 오버레이 ---------------- */
  var lastFocus = null;

  function openToc() {
    lastFocus = document.activeElement;
    el.scrim.hidden = false;
    requestAnimationFrame(function () { el.scrim.classList.add('is-open'); });
    el.toc.classList.add('is-open');
    el.toc.setAttribute('aria-hidden', 'false');
    el.btnToc.setAttribute('aria-expanded', 'true');
    el.body.classList.add('is-locked');
    var cur = el.tocList.querySelector('.is-current');
    if (cur) cur.scrollIntoView({ block: 'center' });
    /* 키보드 사용자가 바로 목차를 조작할 수 있게 */
    setTimeout(function () { if (el.tocSearch) el.tocSearch.focus(); }, 60);
  }
  function closeToc() {
    el.toc.classList.remove('is-open');
    el.toc.setAttribute('aria-hidden', 'true');
    el.btnToc.setAttribute('aria-expanded', 'false');
    el.body.classList.remove('is-locked');
    hideScrim();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }
  function openSheet() {
    el.sheet.hidden = false;
    requestAnimationFrame(function () { el.sheet.classList.add('is-open'); });
    el.scrim.hidden = false;
    requestAnimationFrame(function () { el.scrim.classList.add('is-open'); });
    el.btnSettings.setAttribute('aria-expanded', 'true');
  }
  function closeSheet() {
    el.sheet.classList.remove('is-open');
    el.btnSettings.setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (!el.sheet.classList.contains('is-open')) el.sheet.hidden = true; }, 240);
    hideScrim();
  }
  function hideScrim() {
    if (el.toc.classList.contains('is-open') || el.sheet.classList.contains('is-open')) return;
    el.scrim.classList.remove('is-open');
    setTimeout(function () { if (!el.scrim.classList.contains('is-open')) el.scrim.hidden = true; }, 240);
  }

  el.btnToc.addEventListener('click', function () {
    el.toc.classList.contains('is-open') ? closeToc() : openToc();
  });
  el.btnTocClose.addEventListener('click', closeToc);
  el.btnSettings.addEventListener('click', function () {
    el.sheet.classList.contains('is-open') ? closeSheet() : openSheet();
  });
  el.scrim.addEventListener('click', function () { closeToc(); closeSheet(); });

  /* ---------------- 화 이동 ---------------- */
  function chapterHtml(c, idx) {
    var part = partsById[c.part] || {};
    var next = chapters[idx + 1];
    var h = '';
    h += '<div class="chead">';
    h += '<p class="chead__part">제' + (part.volume || 1) + '권 · ' + (part.label || '') + ' ' + (part.title || '') + '</p>';
    h += '<p class="chead__no">제 ' + c.no + ' 화</p>';
    h += '<h2 class="chead__title">' + c.title + '</h2>';
    h += '<div class="chead__rule"></div>';
    h += '</div>';

    var photo = PHOTOS[c.no];
    if (photo) {
      h += '<figure class="plate">' +
           '<div class="plate__frame">' + photo.svg + '</div>' +
           (photo.caption ? '<figcaption class="plate__cap">' + photo.caption + '</figcaption>' : '') +
           '</figure>';
    }

    h += '<div class="body">' + render(c.body) + '</div>';
    h += '<div class="chend"><div class="chend__mark">· · ·</div>';
    if (next) {
      h += '<button class="nextcard" data-next="' + (idx + 1) + '">' +
           '<span class="nextcard__k">다음 화 · 제 ' + next.no + ' 화</span>' +
           '<span class="nextcard__t">' + next.title + '</span></button>';
    } else {
      h += '<div class="theend"><b>끝</b><span>제1권 「미현상」 완결 — 읽어 주셔서 고맙습니다.</span></div>';
    }
    h += '</div>';
    return h;
  }

  function go(idx, opts) {
    opts = opts || {};
    if (idx < 0 || idx >= chapters.length) return;
    current = idx;
    var c = chapters[idx];

    el.cover.hidden = true;
    if (el.info) el.info.hidden = true;
    el.reader.hidden = false;
    el.pager.hidden = false;
    el.reader.innerHTML = chapterHtml(c, idx);

    var part = partsById[c.part] || {};
    el.topbarChap.textContent = c.no + '화 ' + c.title;
    document.title = c.no + '화 ' + c.title + ' — 미현상';

    el.btnPrev.disabled = idx === 0;
    el.btnNext.disabled = idx === chapters.length - 1;

    readSet[c.no] = true;
    save(LS_READ, Object.keys(readSet).map(Number));
    refreshToc();

    if (opts.ratio) {
      requestAnimationFrame(function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.max(0, max * opts.ratio));
      });
    } else {
      window.scrollTo(0, 0);
    }

    if (location.hash !== '#' + c.no) {
      history.replaceState(null, '', '#' + c.no);
    }
    savePos();
    el.topbar.classList.remove('is-hidden');
  }

  function showCover() {
    savePos();
    current = -1;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (el.info) el.info.hidden = true;
    el.reader.hidden = true;
    el.pager.hidden = true;
    el.cover.hidden = false;
    el.topbarChap.textContent = '표지';
    document.title = '미현상(未現像) — 아버지의 서른세 번째 여름';
    window.scrollTo(0, 0);
    refreshToc();
  }

  el.reader.addEventListener('click', function (e) {
    var b = e.target.closest('[data-next]');
    if (b) go(+b.getAttribute('data-next'));
  });
  el.btnPrev.addEventListener('click', function () { go(current - 1); });
  el.btnNext.addEventListener('click', function () { go(current + 1); });
  el.btnTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  el.btnStart.addEventListener('click', function () { go(0); });

  /* ---------------- 작품 정보 ---------------- */
  function infoHtml() {
    var parts = N.parts.filter(function (p) { return p.volume === 1; });
    return '' +
      '<div class="info__inner">' +
      '<p class="info__kicker">작품 정보</p>' +
      '<h2 class="info__title">미현상 <span>未現像</span></h2>' +
      '<p class="info__sub">아버지의 서른세 번째 여름</p>' +

      '<dl class="info__list">' +
      '<dt>상태</dt><dd>완결 · 전 ' + chapters.length + '화 (제1권 ' +
        (parts.length - 1) + '부 + 종장)</dd>' +
      '<dt>분량</dt><dd>공백 포함 ' + totalCharsSp.toLocaleString('ko-KR') + '자 · ' +
        '200자 원고지 약 ' + Math.round(totalCharsSp / 200).toLocaleString('ko-KR') + '매 · ' +
        '신국판 약 ' + Math.round(totalCharsSp / 420) + '쪽</dd>' +
      '<dt>예상 독서 시간</dt><dd>약 ' + hhmm(totalCharsSp) +
        ' <span class="info__note">(분당 ' + CPM + '자 기준)</span></dd>' +
      '<dt>구성</dt><dd>' + parts.map(function (p) {
        return p.label + ' ' + p.title + '(' + p.hanja + ')';
      }).join(' · ') + '</dd>' +
      '</dl>' +

      '<h3>작품 노트</h3>' +
      '<p>사진을 현상하는 순서를 그대로 작품의 구조로 썼습니다. 노출에서 잠상, 현상, 정착, 수세로 ' +
      '가는 동안 하나의 상(像)이 나타나고 고정됩니다. 미현상이란 아직 나타나지 않은 상태, ' +
      '있는 것도 아니고 없는 것도 아닌 상태를 가리킵니다.</p>' +
      '<p>이 소설은 죽은 사람을 인공지능으로 되살리는 이야기가 아닙니다. ' +
      '아버지가 평생 남긴 문장은 천백사십 개였고, 주인공이 그 데이터에 몰래 집어넣은 문장은 세 개였습니다. ' +
      '그 세 문장이 십오만 부의 책에서 가장 사랑받는 대목이 됩니다. ' +
      '진짜 질문은 기계가 아니라 그 자리에 있습니다. 위로가 위조된 것이라면 그 위로는 가짜인가. ' +
      '그리고 동의할 수 없는 사람의 이야기를 쓸 권리는 누구에게 있는가.</p>' +

      '<h3>읽는 방법</h3>' +
      '<ul class="info__ul">' +
      '<li>읽던 화와 스크롤 위치가 자동으로 저장됩니다. 표지의 <b>이어서 읽기</b>로 돌아옵니다.</li>' +
      '<li>PC에서는 <b>← →</b> 로 화를 옮기고, <b>T</b> 목차 · <b>D</b> 테마 · <b>C</b> 표지입니다.</li>' +
      '<li>모바일에서는 좌우로 넘기면 화가 바뀝니다.</li>' +
      '<li>오른쪽 위 설정에서 테마 · 글꼴 · 글자 크기 · 줄 간격 · 본문 폭 · 사진 표시를 바꿀 수 있습니다.</li>' +
      '<li>주소 끝에 <b>#12</b> 처럼 붙이면 해당 화로 바로 갑니다.</li>' +
      '</ul>' +

      '<h3>사진에 대하여</h3>' +
      '<p>각 화에 붙은 흑백 사진은 촬영한 것이 아니라 코드로 그린 것입니다. ' +
      '외부 이미지 파일 없이 SVG 필터로 계조를 만들었습니다. 설정에서 숨길 수 있습니다.</p>' +

      '<h3>이 판에 대하여</h3>' +
      '<dl class="info__list">' +
      '<dt>형식</dt><dd>의존성 없는 단일 HTML. 내려받아 오프라인에서도 읽을 수 있습니다.</dd>' +
      '<dt>피드백</dt><dd><a href="https://github.com/SnapSketchWorks/kiro/issues" ' +
        'target="_blank" rel="noopener">GitHub 이슈</a>로 오탈자와 의견을 보내 주세요.</dd>' +
      '<dt>저장소</dt><dd><a href="https://github.com/SnapSketchWorks/kiro" ' +
        'target="_blank" rel="noopener">github.com/SnapSketchWorks/kiro</a></dd>' +
      '</dl>' +

      '<p class="info__disclaimer">등장하는 인물 · 지명 · 단체는 모두 허구입니다.</p>' +

      '<div class="info__actions">' +
      '<button class="btn btn--primary" data-info-start>처음부터 읽기</button>' +
      '<button class="btn" data-info-close>표지로</button>' +
      '</div></div>';
  }

  function showInfo() {
    /* 읽던 위치를 먼저 저장한 뒤 current 를 해제한다.
       해제하지 않으면 작품 정보 페이지의 스크롤 비율이
       읽던 화의 위치로 덮어써진다. */
    savePos();
    current = -1;
    el.info.innerHTML = infoHtml();
    el.cover.hidden = true;
    el.reader.hidden = true;
    el.pager.hidden = true;
    el.info.hidden = false;
    el.topbarChap.textContent = '작품 정보';
    el.topbar.classList.remove('is-hidden');
    document.title = '작품 정보 — 미현상';
    if (location.hash !== '#info') history.replaceState(null, '', '#info');
    window.scrollTo(0, 0);
  }

  if (el.btnInfo) el.btnInfo.addEventListener('click', showInfo);
  if (el.info) {
    el.info.addEventListener('click', function (e) {
      if (e.target.closest('[data-info-start]')) go(0);
      else if (e.target.closest('[data-info-close]')) showCover();
    });
  }

  /* ---------------- 위치 저장 ---------------- */
  function savePos() {
    if (current < 0) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? window.scrollY / max : 0;
    save(LS_POS, { no: chapters[current].no, ratio: Math.min(1, Math.max(0, ratio)) });
  }

  var saveTimer = null;
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? window.scrollY / max : 0;

    if (current >= 0 && !el.reader.hidden) {
      var overall = (current + Math.min(1, Math.max(0, ratio))) / chapters.length;
      el.progressBar.style.width = (overall * 100).toFixed(2) + '%';
    } else {
      el.progressBar.style.width = '0%';
    }

    // 상단바 자동 숨김
    var y = window.scrollY;
    if (y > 180 && y > lastY + 6) el.topbar.classList.add('is-hidden');
    else if (y < lastY - 6 || y < 120) el.topbar.classList.remove('is-hidden');
    lastY = y;

    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePos, 350);
  }
  var lastY = 0;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('beforeunload', savePos);

  /* ---------------- 키보드 ---------------- */
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea')) {
      if (e.key === 'Escape') { el.tocSearch.blur(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case 'ArrowRight':
        if (current >= 0) { go(current + 1); e.preventDefault(); } break;
      case 'ArrowLeft':
        if (current > 0) { go(current - 1); e.preventDefault(); } break;
      case 'Escape':
        if (el.info && !el.info.hidden &&
            !el.toc.classList.contains('is-open') && !el.sheet.classList.contains('is-open')) {
          showCover();
        }
        closeToc(); closeSheet(); break;
      case 't': case 'T':
        el.toc.classList.contains('is-open') ? closeToc() : openToc(); break;
      case 'd': case 'D':
        el.btnTheme.click(); break;
      case 'c': case 'C':
        showCover(); break;
    }
  });

  /* ---------------- 스와이프 ---------------- */
  var tx = 0, ty = 0, tt = 0;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (current < 0 || !e.changedTouches.length) return;
    if (el.toc.classList.contains('is-open') || el.sheet.classList.contains('is-open')) return;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Date.now() - tt > 600) return;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 55) return;
    dx < 0 ? go(current + 1) : go(current - 1);
  }, { passive: true });

  /* ---------------- 초기화 ---------------- */
  applySettings();
  buildToc();
  refreshToc();

  var pos = load(LS_POS, null);
  if (pos && pos.no) {
    var found = -1;
    chapters.forEach(function (c, i) { if (c.no === pos.no) found = i; });
    if (found > -1) {
      el.btnResume.hidden = false;
      el.btnResume.textContent = '이어서 읽기 · ' + pos.no + '화';
      el.btnResume.addEventListener('click', function () { go(found, { ratio: pos.ratio }); });
    }
  }

  if ((location.hash || '') === '#info') {
    showInfo();
  }
  var hashNo = parseInt((location.hash || '').replace('#', ''), 10);
  if (hashNo) {
    var hi = -1;
    chapters.forEach(function (c, i) { if (c.no === hashNo) hi = i; });
    if (hi > -1) go(hi);
  }

  window.addEventListener('hashchange', function () {
    if ((location.hash || '') === '#info') { showInfo(); return; }
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    if (!n) return;
    var i = -1;
    chapters.forEach(function (c, idx) { if (c.no === n) i = idx; });
    if (i > -1 && i !== current) go(i);
  });

  onScroll();
})();
