/* 각 화의 사진 — 필름 프레임 형식의 인라인 SVG
   외부 이미지 파일 없음. 테마 팔레트(--ph-*)를 따라 색조가 바뀐다. */
(function () {
  'use strict';

  var W = 720, H = 432, STRIP = 44;

  var SKY = 'var(--ph-sky)', MID = 'var(--ph-mid)', DK = 'var(--ph-dk)',
      HI = 'var(--ph-hi)', LN = 'var(--ph-line)', WARM = 'var(--ph-warm)',
      FILM = 'var(--ph-film)', HOLE = 'var(--ph-hole)', INK = 'var(--ph-ink)';

  /* ---------- 도형 헬퍼 ---------- */
  function r(x, y, w, h, f, o, ex) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + f + '"' + (o != null ? ' opacity="' + o + '"' : '') + (ex || '') + '/>';
  }
  function c(cx, cy, rad, f, o) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="' + f + '"' +
      (o != null ? ' opacity="' + o + '"' : '') + '/>';
  }
  function e(cx, cy, rx, ry, f, o) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + f + '"' + (o != null ? ' opacity="' + o + '"' : '') + '/>';
  }
  function ln(x1, y1, x2, y2, s, w, o) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + s + '" stroke-width="' + (w || 1) + '"' +
      (o != null ? ' opacity="' + o + '"' : '') + '/>';
  }
  function pg(pts, f, o) {
    return '<polygon points="' + pts + '" fill="' + f + '"' +
      (o != null ? ' opacity="' + o + '"' : '') + '/>';
  }
  function pl(pts, s, w, o) {
    return '<polyline points="' + pts + '" fill="none" stroke="' + s +
      '" stroke-width="' + (w || 1.4) + '"' + (o != null ? ' opacity="' + o + '"' : '') + '/>';
  }
  function tx(x, y, s, size, f, anchor, mono) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + f +
      '" text-anchor="' + (anchor || 'start') + '" font-family="' +
      (mono ? 'ui-monospace, SFMono-Regular, Consolas, monospace' :
        '-apple-system, system-ui, sans-serif') + '" letter-spacing=".04em">' + s + '</text>';
  }
  function box(x, y, w, h, s, sw, o) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="none" stroke="' + s + '" stroke-width="' + (sw || 1) + '"' +
      (o != null ? ' opacity="' + o + '"' : '') + '/>';
  }

  /* ---------- 장면 조각 ---------- */
  function water(y, bands) {
    var s = r(0, y, W, H - y, MID);
    for (var i = 0; i < (bands || 7); i++) {
      var yy = y + 16 + i * ((H - y - 20) / (bands || 7));
      s += ln(30 + i * 9, yy, W - 30 - i * 11, yy, HI, 1, 0.05 + i * 0.012);
    }
    return s;
  }
  function mist(y) {
    var s = '';
    for (var i = 0; i < 4; i++) {
      s += e(200 + i * 120, y - 6 + i * 5, 190 - i * 22, 13, HI, 0.05);
    }
    return s;
  }
  function hill(y) {
    return pg('0,' + y + ' 150,' + (y - 34) + ' 330,' + (y - 52) + ' 520,' + (y - 30) +
      ' 720,' + (y - 46) + ' 720,' + y, DK, 0.75);
  }
  /* 이층 건물, 창문 6개 */
  function bldg(x, y, w, h, litIndex) {
    var s = r(x, y, w, h, DK, 0.9);
    s += r(x - 4, y - 5, w + 8, 6, DK);
    var cw = w / 8, ch = h / 5;
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 3; col++) {
        var wx = x + cw * (0.9 + col * 2.4), wy = y + ch * (0.7 + row * 2.1);
        var lit = (litIndex != null && row === 0 && col === 2);
        s += r(wx, wy, cw * 1.5, ch * 1.4, lit ? HI : MID, lit ? 0.75 : 0.5);
      }
    }
    return s;
  }
  function fig(x, y, h, f, o) {
    var hw = h * 0.17;
    return c(x, y - h + hw, hw, f, o) +
      pg((x - hw * 1.2) + ',' + y + ' ' + (x - hw) + ',' + (y - h + hw * 1.9) + ' ' +
        (x + hw) + ',' + (y - h + hw * 1.9) + ' ' + (x + hw * 1.2) + ',' + y, f, o);
    }
  function grainOverlay() {
    return r(0, 0, W, H, HI, 0.16, ' filter="url(#ph-grain)" style="mix-blend-mode:soft-light"');
  }
  function vignette() {
    return r(0, 0, W, H, 'url(#ph-vig)', 0.5);
  }
  function monoLines(lines, x, y, size, gap) {
    var s = '';
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      s += tx(x, y + i * gap, L[0], size, L[1] || LN, 'start', true);
    }
    return s;
  }

  /* ---------- 필름 프레임 ---------- */
  function film(no, scene) {
    /* 스프로켓 구멍은 각 SVG 안에 직접 그린다.
       다른 SVG 의 <pattern> 안에서 CSS 변수를 쓰면 테마 전환 시
       페인트 서버가 갱신되지 않아 도판 색이 어긋난다. */
    var sp = '';
    for (var x = 16; x < W - 24; x += 42) {
      sp += r(x, 13, 24, 18, HOLE, null, ' rx="4"');
      sp += r(x, H + STRIP * 2 - 31, 24, 18, HOLE, null, ' rx="4"');
    }
    return '<svg viewBox="0 0 ' + W + ' ' + (H + STRIP * 2) + '" role="img" aria-hidden="true">' +
      r(0, 0, W, H + STRIP * 2, FILM) + sp +
      tx(16, 40, 'TRI-X 400', 10, HOLE, 'start', true) +
      tx(W - 16, H + STRIP + 30, String(no), 13, HOLE, 'end', true) +
      '<g transform="translate(0,' + STRIP + ')">' +
      r(0, 0, W, H, SKY) + scene + grainOverlay() + vignette() +
      box(0.5, 0.5, W - 1, H - 1, FILM, 1) +
      '</g></svg>';
  }

  /* ---------- 각 화의 장면 ----------
     원칙: 요소 3~4개 이하 / 주제를 크게 / 실제 흑백처럼 밝은 곳과 어두운 곳을 확실히 */
  var S = {};

  /* 1 미현상 — 아무것도 나타나지 않은 프레임 (고르지 않은 노출만) */
  S[1] = r(0, 0, W, H, MID) +
    e(320, 200, 380, 220, HI, 0.045) + e(320, 200, 210, 120, HI, 0.035) +
    e(600, 392, 260, 120, DK, 0.14);

  /* 2 어둠상자 — 안전등 아래 매달린 필름 */
  S[2] = r(0, 0, W, H, DK, 0.95) +
    c(600, 70, 96, WARM, 0.16) + c(600, 70, 52, WARM, 0.32) + c(600, 70, 20, WARM, 0.9) +
    ln(0, 128, W, 116, LN, 2, 0.85) +
    (function () {
      var s = '';
      [130, 300, 470].forEach(function (x, i) {
        var top = 122 - i * 3;
        s += r(x - 5, top - 9, 10, 16, HI, 0.75, ' rx="2"');
        s += r(x - 30, top + 6, 60, 250, MID, 0.95);
        for (var k = 0; k < 4; k++) {
          s += r(x - 24, top + 22 + k * 60, 48, 44, HI, 0.13 + k * 0.04);
        }
      });
      return s;
    })();

  /* 3 카세트 — 한 개를 크게 */
  S[3] = r(0, 0, W, H, MID, 0.9) +
    r(140, 96, 440, 262, DK, 0.96, ' rx="10"') +
    r(174, 122, 372, 92, HI, 0.9, ' rx="3"') +
    ln(196, 152, 500, 152, DK, 3, 0.35) + ln(196, 180, 430, 180, DK, 3, 0.25) +
    r(196, 240, 328, 86, DK, 0.6, ' rx="4"') +
    c(268, 283, 44, HI, 0.72) + c(268, 283, 15, DK, 0.95) +
    c(452, 283, 44, HI, 0.72) + c(452, 283, 15, DK, 0.95);

  /* 4 8월 12일 — 물가에 놓인 흰 샌들 */
  S[4] = r(0, 0, W, H, SKY) +
    r(0, 0, W, 150, SKY) + ln(0, 150, W, 150, HI, 2, 0.35) + mist(150) +
    water(150, 8) +
    pg('0,296 720,262 720,432 0,432', DK, 0.62) +
    e(292, 368, 38, 14, HI, 0.95) + e(372, 372, 38, 14, HI, 0.95) +
    e(292, 366, 27, 7, MID, 0.7) + e(372, 370, 27, 7, MID, 0.7);

  /* 5 첫 문장 — 물 건너 언덕 위 건물 */
  S[5] = r(0, 0, W, H, SKY) + ln(0, 186, W, 186, HI, 1.5, 0.25) +
    hill(196) + bldg(420, 112, 150, 74, 1) +
    water(196, 7) + mist(196);

  /* 6 미확인 발신자 — 48×61 픽셀 */
  S[6] = r(0, 0, W, H, MID, 0.85) +
    (function () {
      var s = '', cw = 40, chh = 40, ox = 120, oy = 36;
      var face = [
        '000000000000', '000011110000', '000122221000', '001233332100',
        '001234432100', '001233332100', '000122221000', '000011110000', '000000000000'
      ];
      var tone = [DK, MID, LN, SKY, HI], op = [0.95, 0.8, 0.85, 0.9, 0.95];
      for (var y = 0; y < 9; y++) {
        for (var x = 0; x < 12; x++) {
          var v = +face[y][x];
          s += r(ox + x * cw, oy + y * chh, cw - 1, chh - 1, tone[v], op[v]);
        }
      }
      return s + box(ox, oy, 12 * cw, 9 * chh, INK, 1.5, 0.55) +
        tx(ox, oy + 9 * chh + 30, '48 x 61 px', 20, INK, 'start', true);
    })();

  /* 7 계약 — 흰 서류와 만년필 */
  S[7] = r(0, 0, W, H, DK, 0.9) +
    r(150, 40, 300, 380, HI, 0.14, ' rx="2" transform="rotate(-4 300 230)"') +
    r(176, 52, 320, 380, HI, 0.92, ' rx="2"') +
    (function () {
      var s = '';
      for (var i = 0; i < 11; i++) s += ln(208, 100 + i * 26, 208 + (i % 3 ? 250 : 150), 100 + i * 26, DK, 2.6, 0.5);
      return s;
    })() +
    ln(212, 392, 320, 380, DK, 4, 0.8) +
    r(520, 210, 200, 11, HI, 0.85, ' rx="5" transform="rotate(-22 620 215)"') +
    pg('448,262 470,268 452,278', DK, 0.9);

  /* 8 환각 — 학습 로그와 내려가는 손실 */
  S[8] = r(0, 0, W, H, DK, 0.96) +
    monoLines([
      ['epoch 1/3  loss 1.402', LN], ['epoch 2/3  loss 1.115', LN],
      ['epoch 3/3  loss 0.981', LN], ['saved: dad_v10', HI]
    ], 76, 92, 21, 36) +
    ln(410, 356, 660, 356, LN, 1.4, 0.6) + ln(410, 356, 410, 120, LN, 1.4, 0.6) +
    pl('418,138 452,196 492,244 540,278 596,300 654,310', HI, 3, 0.9) +
    tx(410, 108, 'loss', 17, HI, 'start', true);

  /* 9 선희, 네 통 */
  S[9] = r(0, 0, W, H, MID, 0.85) +
    (function () {
      var s = '';
      for (var i = 0; i < 4; i++) {
        var x = 112 + i * 128;
        s += r(x, 132, 92, 176, DK, 0.96, ' rx="10"') +
          e(x + 46, 132, 46, 15, LN, 0.9) + e(x + 46, 126, 30, 9, MID, 0.9) +
          tx(x + 46, 196, '선희', 26, HI, 'middle') +
          ln(x + 12, 214, x + 80, 214, HI, 2, 0.8);
      }
      return s;
    })();

  /* 10 인화 — 검은 표지 위 흰 사각형 */
  S[10] = r(0, 0, W, H, MID, 0.75) +
    r(238, 44, 264, 356, DK, 0.98, ' rx="2"') + r(222, 50, 16, 344, DK, 0.75) +
    r(302, 140, 136, 136, HI, 0.96);

  /* 11 마루 — 밝은 마루에 남은 두 개의 젖은 발자국 */
  S[11] = r(0, 0, W, H, MID, 0.95) +
    (function () {
      var s = '';
      for (var i = 0; i < 8; i++) {
        s += r(0, 20 + i * 54, W, 40, HI, 0.07);
        s += ln(0, 58 + i * 54, W, 44 + i * 54, DK, 3, 0.55);
      }
      return s;
    })() +
    (function () {
      var s = '';
      [[262, 258, -8], [382, 322, 6]].forEach(function (p) {
        var x = p[0], y = p[1], rot = p[2];
        var g = ' transform="rotate(' + rot + ' ' + x + ' ' + y + ')"';
        s += '<g' + g + '>' +
          e(x, y, 42, 54, DK, 0.94) +
          e(x + 2, y - 46, 36, 34, DK, 0.94) +
          e(x + 1, y - 24, 39, 26, DK, 0.94) +
          c(x - 28, y - 74, 9, DK, 0.92) + c(x - 9, y - 82, 8, DK, 0.92) +
          c(x + 9, y - 81, 7, DK, 0.92) + c(x + 25, y - 74, 6, DK, 0.92) +
          '</g>';
      });
      return s;
    })();

  /* 12 팩트필름 — 재생과 파형 */
  S[12] = r(0, 0, W, H, DK, 0.95) +
    c(360, 162, 82, HI, 0.14) + pg('334,128 334,196 396,162', HI, 0.92) +
    (function () {
      var s = '', hs = [16, 44, 26, 70, 34, 92, 46, 110, 30, 74, 22, 56, 38, 84, 28, 52, 20, 40];
      for (var i = 0; i < hs.length; i++) {
        s += r(94 + i * 30, 336 - hs[i] / 2, 13, hs[i], HI, 0.55, ' rx="3"');
      }
      return s;
    })();

  /* 13 수내리 — 십일월의 논 */
  S[13] = r(0, 0, W, H, SKY) + c(560, 104, 40, HI, 0.5) + c(560, 104, 74, HI, 0.12) +
    pg('0,176 720,156 720,432 0,432', MID, 0.95) +
    (function () {
      var s = '';
      for (var row = 0; row < 7; row++) {
        var y = 214 + row * 32;
        for (var i = 0; i < 20; i++) s += ln(24 + i * 36, y, 30 + i * 36, y - 12, DK, 1.6, 0.45);
      }
      return s;
    })() +
    r(400, 112, 168, 50, DK, 0.95, ' rx="4"') + r(366, 128, 40, 34, DK, 0.95) +
    c(404, 168, 15, DK) + c(534, 168, 15, DK);

  /* 14 면회 기록 — 반복되는 하나의 이름 */
  S[14] = r(0, 0, W, H, HI, 0.9) +
    ln(64, 74, 656, 74, DK, 2, 0.6) + ln(300, 34, 300, 400, DK, 1.2, 0.3) +
    tx(80, 62, '날짜', 17, DK, 'start') + tx(318, 62, '면회자', 17, DK, 'start') +
    (function () {
      var s = '';
      for (var i = 0; i < 9; i++) {
        var y = 110 + i * 34;
        s += tx(80, y, String(1993 + i) + '. 0' + ((i % 9) + 1) + '. 1' + (i % 4 + 1), 17, DK, 'start', true);
        s += tx(318, y, '곽명수', 18, DK, 'start');
        s += ln(64, y + 11, 656, y + 11, DK, 1, 0.16);
      }
      return s;
    })();

  /* 15 스물한 장 — 모두 같은 물 (콘택트시트) */
  S[15] = r(0, 0, W, H, DK, 0.95) +
    (function () {
      var s = '';
      for (var i = 0; i < 21; i++) {
        var col = i % 7, row = (i / 7) | 0;
        var x = 40 + col * 94, y = 58 + row * 110;
        var h = 42 + (i % 3) * 2;
        s += r(x, y, 80, 92, HI, 0.82) +
          r(x, y + h, 80, 92 - h, DK, 0.9) +
          ln(x, y + h, x + 80, y + h, HI, 2, 0.95) +
          ln(x + 6, y + h + 14, x + 74, y + h + 14, HI, 1, 0.2) +
          box(x, y, 80, 92, HI, 1, 0.35);
      }
      return s;
    })();

  /* 16 검증 — 형광펜 그어진 페이지 */
  S[16] = r(0, 0, W, H, DK, 0.9) + r(130, 34, 460, 364, HI, 0.92, ' rx="2"') +
    (function () {
      var s = '';
      for (var i = 0; i < 11; i++) {
        var y = 80 + i * 26;
        s += ln(160, y, 160 + (i % 3 ? 396 : 260), y, DK, 2.6, i === 4 ? 0.14 : 0.5);
      }
      return s;
    })() +
    r(158, 176, 320, 22, WARM, 0.55) +
    tx(160, 344, '48 x 61 = 2,928 px', 19, DK, 'start', true);

  /* 17 놀이터 — 가로등 하나, 벤치 하나, 긴 그림자 */
  S[17] = r(0, 0, W, H, DK, 0.97) +
    pg('0,268 720,250 720,432 0,432', MID, 0.9) +
    c(150, 62, 104, HI, 0.09) + c(150, 62, 50, HI, 0.2) + c(150, 62, 20, HI, 0.97) +
    ln(150, 80, 150, 276, LN, 6, 0.95) +
    pg('150,276 128,432 176,432 154,278', DK, 0.7) +
    r(388, 232, 240, 16, DK, 0.98, ' rx="4"') +
    r(388, 196, 240, 13, DK, 0.92, ' rx="4"') +
    r(404, 248, 13, 46, DK, 0.98) + r(600, 248, 13, 46, DK, 0.98) +
    pg('404,294 236,412 268,418 420,296', DK, 0.45) +
    pg('600,294 452,414 484,420 616,296', DK, 0.45);

  /* 18 마지막 대화 */
  S[18] = r(0, 0, W, H, DK, 0.96) +
    monoLines([
      ['> 당신은 누구입니까', LN],
      ['', LN],
      ['  나는 서동명이다.', HI],
      ['', LN],
      ['> 아닙니다', LN],
      ['', LN],
      ['  내가 아니면 너는', HI],
      ['  지금 누구랑', HI],
      ['  얘기하고 있는 거냐.', HI]
    ], 74, 78, 21, 36) +
    r(74, 374, 14, 22, HI, 0.85);

  /* 19 손실 함수 — 더 내려가지 않는다 */
  S[19] = r(0, 0, W, H, DK, 0.96) +
    ln(92, 358, 648, 358, LN, 1.6, 0.7) + ln(92, 358, 92, 56, LN, 1.6, 0.7) +
    (function () {
      var s = '';
      for (var i = 1; i < 5; i++) s += ln(92, 358 - i * 64, 648, 358 - i * 64, LN, 1, 0.18);
      return s;
    })() +
    pl('104,80 156,148 214,212 276,258 344,288 416,304 494,310 570,312 640,313', HI, 3.2, 0.95) +
    tx(104, 50, 'loss', 19, HI, 'start', true);

  /* 20 스물세 명 — 서른 자리 중 */
  S[20] = r(0, 0, W, H, MID, 0.85) +
    r(112, 44, 496, 14, DK, 0.9, ' rx="4"') +
    (function () {
      var s = '', n = 0;
      for (var row = 0; row < 5; row++) {
        for (var col = 0; col < 6; col++) {
          var x = 122 + col * 82, y = 104 + row * 64;
          s += r(x, y - 18, 48, 18, DK, 0.55, ' rx="3"') + r(x, y, 48, 32, DK, 0.7, ' rx="3"');
          if (n < 23) s += c(x + 24, y + 6, 15, HI, 0.9);
          n++;
        }
      }
      return s;
    })();

  /* 21 절판 — 쌓인 책과 떨어지는 조각 */
  S[21] = r(0, 0, W, H, MID, 0.85) +
    (function () {
      var s = '';
      for (var i = 0; i < 13; i++) {
        var w = 268 - (i % 3) * 16, x = 70 + (i % 3) * 8;
        s += r(x, 372 - i * 27, w, 21, DK, 0.96, ' rx="2"');
        s += ln(x + w - 5, 376 - i * 27, x + 5, 376 - i * 27, HI, 2.2, 0.3);
      }
      return s;
    })() +
    r(470, 340, 210, 62, DK, 0.95, ' rx="5"') +
    r(486, 352, 178, 12, HI, 0.16) +
    (function () {
      var s = '', ys = [40, 86, 118, 158, 196, 232, 268, 300, 322];
      ys.forEach(function (y, i) {
        var x = 520 + ((i * 53) % 110) - 20;
        s += r(x, y, 30, 8, HI, 0.62 - i * 0.045,
          ' rx="1" transform="rotate(' + ((i * 41) % 70 - 35) + ' ' + (x + 15) + ' ' + (y + 4) + ')"');
      });
      return s;
    })();

  /* 22 삭제 — total 0 */
  S[22] = r(0, 0, W, H, DK, 0.97) +
    monoLines([
      ['$ ls -la checkpoints/', LN],
      ['dad_v1  dad_v2  dad_v3', LN],
      ['dad_v10  dad_v11  dad_v12', LN],
      ['', LN],
      ['$ rm -r checkpoints/', HI],
      ['', LN],
      ['$ ls -la checkpoints/', LN],
      ['total 0', HI]
    ], 74, 84, 22, 38) +
    r(74, 372, 14, 22, HI, 0.9);

  /* 23 닷징 — 인화지 위에서 빛을 가리는 닷징 툴 */
  S[23] = r(0, 0, W, H, DK, 0.97) +
    r(0, 0, W, 120, HI, 0.05) +
    r(96, 248, 528, 168, HI, 0.92, ' rx="2"') +
    r(132, 268, 456, 128, DK, 0.18) +
    ln(132, 322, 588, 322, DK, 2, 0.28) +
    e(352, 344, 78, 26, DK, 0.5) +
    ln(352, 0, 352, 168, LN, 3, 0.9) +
    c(352, 190, 40, DK, 0.98) +
    e(340, 178, 16, 9, HI, 0.13);

  /* 24 창 — 사백 미터 아래의 삼각대 */
  S[24] = r(0, 0, W, H, DK, 0.97) +
    r(104, 30, 512, 358, SKY, 1) +
    r(104, 30, 512, 132, HI, 0.34) +
    ln(104, 162, 616, 162, HI, 1.6, 0.5) +
    pg('104,168 240,142 392,128 512,150 616,136 616,182', DK, 0.5) +
    r(104, 182, 512, 206, MID, 0.98) +
    ln(104, 182, 616, 182, HI, 2.4, 0.75) +
    (function () {
      var s = '';
      for (var i = 0; i < 5; i++) s += ln(120 + i * 12, 208 + i * 34, 600 - i * 14, 208 + i * 34, HI, 1.4, 0.16);
      return s;
    })() +
    r(104, 344, 512, 44, DK, 0.5) +
    (function () {
      var x = 300, y = 344;
      return ln(x, y - 44, x, y, HI, 3, 0.95) +
        ln(x, y, x - 16, y + 22, HI, 3, 0.95) +
        ln(x, y, x + 16, y + 22, HI, 3, 0.95) +
        ln(x, y, x + 2, y + 24, HI, 3, 0.8) +
        r(x - 11, y - 56, 22, 14, HI, 0.95, ' rx="2"');
    })() +
    r(98, 24, 524, 370, 'none', null, ' stroke="' + DK + '" stroke-width="11"') +
    ln(360, 30, 360, 388, DK, 5, 1) + ln(104, 200, 616, 200, DK, 4.5, 1);

  /* 25 수세 — 흐르는 물 속의 인화지 */
  S[25] = r(0, 0, W, H, DK, 0.95) +
    r(52, 66, 616, 300, MID, 0.95, ' rx="10"') +
    box(52, 66, 616, 300, HI, 2.5, 0.45) +
    '<g transform="rotate(-3 360 216)">' +
      r(188, 122, 344, 188, HI, 0.9, ' rx="2"') +
      r(188, 122, 344, 96, HI, 0.5) +
      ln(188, 218, 532, 218, DK, 2.5, 0.45) +
      r(188, 218, 344, 92, DK, 0.16) +
    '</g>' +
    r(52, 66, 616, 300, HI, 0.07, ' rx="10"') +
    (function () {
      var s = '';
      for (var i = 0; i < 5; i++) {
        s += '<path d="M 70 ' + (110 + i * 58) + ' Q 240 ' + (94 + i * 58) + ' 400 ' +
          (112 + i * 58) + ' T 650 ' + (104 + i * 58) +
          '" fill="none" stroke="' + HI + '" stroke-width="2" opacity="' + (0.3 - i * 0.04) + '"/>';
      }
      return s;
    })();

  /* ---------- 캡션 ---------- */
  var CAP = {
    1: '미현상 — 상이 아직 잠들어 있는 필름',
    2: '암실. 붉은 안전등과 마르고 있는 필름',
    3: '라벨이 없는 카세트 두 개',
    4: '1992. 8. 12. 수내 저수지 · 물가에 놓인 흰 샌들',
    5: '1997. 프레임에 건너편 건물이 들어온 첫해',
    6: '48 × 61 픽셀 — 이 안에 얼굴 정보는 없다',
    7: '서교동, 계단으로 올라가는 사층 건물 삼층',
    8: 'epoch 3/3 · loss 0.981 · saved: dad_v10',
    9: '날짜가 없는 네 통. 뚜껑에는 이름만 있었다',
    10: '『아버지의 답장』 초판 — 검은 표지 위 흰 사각형',
    11: '1992. 8. 12. 밤 열 시. 마루에 남은 두 개의 젖은 자리',
    12: '조회수 41만 · 재생 시간 17분',
    13: '십일월의 논둑. 트럭은 시동을 걸어 둔 채였다',
    14: '면회 기록부 · 1993 – 2013 · 곽명수 241회',
    15: '스물한 장. 모두 같은 물이었다',
    16: '이백일 쪽 — 형광펜이 그어진 자리',
    17: '십이월의 놀이터. 가로등이 만든 두 개의 그림자',
    18: '마지막 대화 · 2026. 12. 5. 새벽 세 시 사십 분',
    19: '더 내려가지 않는 손실 함수',
    20: '합정동. 의자 서른 개 가운데 스물세 개',
    21: '파주. 삼만 이천 부가 팔 밀리미터로 나뉘던 날',
    22: 'rm -r checkpoints/ · 백사십 기가바이트 · 십일 초',
    23: '닷징 — 왼쪽 얼굴에 삼 초 동안 빛을 덜 준다',
    24: '2027. 8. 12. 이 층 왼쪽에서 세 번째 창 · 사백 미터',
    25: '수세. 이십 분 동안 흐르는 물에 씻는다'
  };

  var PHOTOS = {};
  Object.keys(S).forEach(function (no) {
    PHOTOS[no] = { svg: film(no, S[no]), caption: CAP[no] || '' };
  });

  window.PHOTOS = PHOTOS;
})();
