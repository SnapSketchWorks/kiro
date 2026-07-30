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
    coverMeta: $('coverMeta')
  };

  /* ---------------- 설정 ---------------- */
  var DEFAULTS = { theme: 'auto', font: 'serif', size: '3', leading: 'normal', width: 'normal' };
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
    syncSegs();
    save(LS_SET, settings);
  }

  var SEGS = { setTheme: 'theme', setFont: 'font', setSize: 'size', setLeading: 'leading', setWidth: 'width' };

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

  var totalChars = 0;
  chapters.forEach(function (c) {
    c.chars = String(c.body).replace(/\s/g, '').length;
    totalChars += c.chars;
  });

  var readSet = {};
  (load(LS_READ, []) || []).forEach(function (n) { readSet[n] = true; });

  var current = -1; // -1 = 표지

  function minutes(chars) { return Math.max(1, Math.round(chars / 700)); }

  el.coverMeta.textContent =
    '전 ' + chapters.length + '화 · 약 ' + totalChars.toLocaleString('ko-KR') + '자 · 예상 독서 ' +
    Math.round(totalChars / 700 / 60 * 10) / 10 + '시간';

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
  function openToc() {
    el.scrim.hidden = false;
    requestAnimationFrame(function () { el.scrim.classList.add('is-open'); });
    el.toc.classList.add('is-open');
    el.toc.setAttribute('aria-hidden', 'false');
    el.btnToc.setAttribute('aria-expanded', 'true');
    el.body.classList.add('is-locked');
    var cur = el.tocList.querySelector('.is-current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function closeToc() {
    el.toc.classList.remove('is-open');
    el.toc.setAttribute('aria-hidden', 'true');
    el.btnToc.setAttribute('aria-expanded', 'false');
    el.body.classList.remove('is-locked');
    hideScrim();
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
    current = -1;
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

    if (current >= 0) {
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

  var hashNo = parseInt((location.hash || '').replace('#', ''), 10);
  if (hashNo) {
    var hi = -1;
    chapters.forEach(function (c, i) { if (c.no === hashNo) hi = i; });
    if (hi > -1) go(hi);
  }

  window.addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    if (!n) return;
    var i = -1;
    chapters.forEach(function (c, idx) { if (c.no === n) i = idx; });
    if (i > -1 && i !== current) go(i);
  });

  onScroll();
})();
