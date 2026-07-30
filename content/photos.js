/* 각 화의 사진 — 필름 프레임 형식의 인라인 SVG
   외부 이미지 파일 없음. 테마 팔레트(--ph-*)를 따라 색조가 바뀐다. */
(function () {
  'use strict';

  var W = 720, H = 432, STRIP = 44;

  var SKY = 'var(--ph-sky)', MID = 'var(--ph-mid)', DK = 'var(--ph-dk)',
      HI = 'var(--ph-hi)', LN = 'var(--ph-line)', WARM = 'var(--ph-warm)',
      FILM = 'var(--ph-film)', HOLE = 'var(--ph-hole)';

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
    /* 스프로켓 구멍은 공용 패턴(#ph-sprocket)으로 타일링한다.
       그룹 transform 이 패턴 좌표계에도 적용되므로 위아래 정렬이 유지된다. */
    var strip = r(0, 0, W, STRIP, 'url(#ph-sprocket)');
    var sp = '<g>' + strip + '</g>' +
             '<g transform="translate(0,' + (H + STRIP) + ')">' + strip + '</g>';
    return '<svg viewBox="0 0 ' + W + ' ' + (H + STRIP * 2) + '" role="img" aria-hidden="true">' +
      r(0, 0, W, H + STRIP * 2, FILM) + sp +
      tx(16, 40, 'TRI-X 400', 10, HOLE, 'start', true) +
      tx(W - 16, H + STRIP + 30, String(no), 13, HOLE, 'end', true) +
      '<g transform="translate(0,' + STRIP + ')">' +
      r(0, 0, W, H, SKY) + scene + grainOverlay() + vignette() +
      box(0.5, 0.5, W - 1, H - 1, FILM, 1) +
      '</g></svg>';
  }

  /* ---------- 각 화의 장면 ---------- */
  var S = {};

  /* 1 미현상 — 아무것도 나타나지 않은 프레임 */
  S[1] = r(0, 0, W, H, MID) + e(360, 216, 300, 170, HI, 0.03) + e(360, 216, 160, 90, HI, 0.02);

  /* 2 어둠상자 — 암실, 안전등, 매달린 필름 */
  S[2] = r(0, 0, W, H, DK, 0.92) + c(596, 84, 30, WARM, 0.5) + c(596, 84, 13, WARM, 0.8) +
    ln(40, 150, 680, 138, LN, 1.2, 0.5) +
    (function () {
      var s = '';
      for (var i = 0; i < 5; i++) {
        var x = 96 + i * 112;
        s += r(x - 4, 132, 8, 12, LN, 0.7) + r(x - 14, 144, 28, 150, MID, 0.55) +
          box(x - 14, 144, 28, 150, LN, 0.8, 0.35);
      }
      return s;
    })() +
    r(70, 340, 180, 52, MID, 0.5) + r(270, 340, 180, 52, MID, 0.45) + r(470, 340, 180, 52, MID, 0.4);

  /* 3 아버지를 학습시키다 — 라벨 없는 카세트 두 개 */
  S[3] = r(0, 0, W, H, MID, 0.85) +
    (function () {
      var s = '';
      [[150, 120], [400, 210]].forEach(function (p, k) {
        var x = p[0], y = p[1];
        s += r(x, y, 210, 132, DK, 0.9, ' rx="6"') + r(x + 16, y + 14, 178, 52, HI, k ? 0.14 : 0.22, ' rx="2"') +
          c(x + 66, y + 96, 22, SKY, 0.5) + c(x + 66, y + 96, 9, DK, 0.9) +
          c(x + 146, y + 96, 22, SKY, 0.5) + c(x + 146, y + 96, 9, DK, 0.9) +
          box(x + 46, y + 78, 120, 38, LN, 1, 0.4);
      });
      return s;
    })();

  /* 4 8월 12일 — 물가에 놓인 흰 샌들 두 짝 */
  S[4] = r(0, 0, W, H, SKY) + water(150, 8) + mist(150) +
    pg('0,300 720,268 720,432 0,432', DK, 0.5) +
    e(300, 372, 30, 11, HI, 0.85) + e(360, 374, 30, 11, HI, 0.85) +
    e(300, 372, 22, 6, SKY, 0.5) + e(360, 374, 22, 6, SKY, 0.5);

  /* 5 첫 문장 — 물 건너 언덕 위 건물이 들어오기 시작한 해 */
  S[5] = r(0, 0, W, H, SKY) + hill(196) + bldg(430, 128, 132, 62) + water(196, 7) + mist(196);

  /* 6 미확인 발신자 — 48×61 픽셀 */
  S[6] = r(0, 0, W, H, MID, 0.7) +
    (function () {
      var s = '', cols = 12, rows = 9, cw = 34, chh = 34, ox = 156, oy = 60;
      var face = [
        '000000000000', '000011110000', '000122221000', '001233332100',
        '001234432100', '001233332100', '000122221000', '000011110000', '000000000000'
      ];
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var v = +face[y][x];
          s += r(ox + x * cw, oy + y * chh, cw - 1, chh - 1, [DK, MID, SKY, HI, HI][v],
            [0.85, 0.6, 0.5, 0.35, 0.5][v]);
        }
      }
      s += box(ox, oy, cols * cw, rows * chh, LN, 1, 0.5);
      s += tx(ox, oy + rows * chh + 26, '48 x 61 px', 15, LN, 'start', true);
      return s;
    })();

  /* 7 계약 — 책상 위 계약서 두 장과 만년필 */
  S[7] = r(0, 0, W, H, MID, 0.8) +
    r(88, 60, 250, 320, HI, 0.14, ' rx="2" transform="rotate(-3 213 220)"') +
    r(120, 76, 250, 320, HI, 0.2, ' rx="2"') +
    (function () {
      var s = '';
      for (var i = 0; i < 9; i++) s += ln(150, 120 + i * 26, 150 + (i % 3 ? 190 : 120), 120 + i * 26, DK, 2, 0.3);
      return s;
    })() +
    ln(150, 352, 250, 344, DK, 3, 0.55) +
    r(430, 250, 180, 9, DK, 0.85, ' rx="4" transform="rotate(-24 520 254)"') +
    c(462, 288, 6, LN, 0.6) + e(540, 130, 44, 44, DK, 0.35) + e(540, 130, 34, 34, MID, 0.5);

  /* 8 환각 — 학습 로그와 손실 곡선 */
  S[8] = r(0, 0, W, H, DK, 0.92) + box(60, 50, 600, 332, LN, 1, 0.4) +
    monoLines([
      ['epoch 1/3  loss 1.402'], ['epoch 2/3  loss 1.115'],
      ['epoch 3/3  loss 0.981'], ['saved: dad_v10', HI]
    ], 92, 108, 20, 34) +
    pl('110,330 190,296 270,272 350,258 430,250 510,246 590,244', HI, 2, 0.55) +
    ln(110, 340, 610, 340, LN, 1, 0.4) + ln(110, 340, 110, 230, LN, 1, 0.4);

  /* 9 선희, 네 통 — 필름통 네 개 */
  S[9] = r(0, 0, W, H, MID, 0.75) +
    (function () {
      var s = '';
      for (var i = 0; i < 4; i++) {
        var x = 118 + i * 130;
        s += r(x, 150, 84, 160, DK, 0.9, ' rx="8"') + e(x + 42, 150, 42, 13, SKY, 0.55) +
          e(x + 42, 310, 42, 13, DK, 0.95) +
          tx(x + 42, 200, '선희', 20, HI, 'middle') + ln(x + 14, 214, x + 70, 214, HI, 1.4, 0.5);
      }
      return s;
    })();

  /* 10 인화 — 검은 표지 위 흰 사각형 */
  S[10] = r(0, 0, W, H, MID, 0.6) +
    r(232, 56, 256, 340, DK, 0.95, ' rx="3"') + r(220, 56, 12, 340, DK, 0.7) +
    r(304, 158, 112, 112, HI, 0.9) +
    tx(360, 356, '아버지의 답장', 19, HI, 'middle') + ln(320, 372, 400, 372, HI, 1, 0.4);

  /* 11 그날 밤의 마루 — 젖은 발자국과 수건 */
  S[11] = r(0, 0, W, H, DK, 0.88) +
    (function () {
      var s = '';
      for (var i = 0; i < 7; i++) s += ln(0, 120 + i * 46, W, 112 + i * 46, LN, 1, 0.25);
      return s;
    })() +
    e(276, 292, 21, 34, HI, 0.13) + e(340, 320, 21, 34, HI, 0.13) +
    e(276, 292, 13, 22, HI, 0.09) + e(340, 320, 13, 22, HI, 0.09) +
    r(452, 250, 150, 92, MID, 0.5, ' rx="4"') + ln(452, 282, 602, 282, LN, 1, 0.4) +
    r(60, 72, 600, 26, MID, 0.3);

  /* 12 팩트필름 — 재생 버튼과 파형 */
  S[12] = r(0, 0, W, H, DK, 0.9) + c(360, 176, 74, MID, 0.55) + c(360, 176, 74, LN, 0.001) +
    pg('338,146 338,206 392,176', HI, 0.8) +
    (function () {
      var s = '', hs = [18, 40, 26, 62, 34, 78, 44, 92, 30, 66, 22, 52, 36, 74, 28, 48, 20, 38];
      for (var i = 0; i < hs.length; i++) {
        s += r(96 + i * 30, 340 - hs[i] / 2, 12, hs[i], HI, 0.35, ' rx="3"');
      }
      return s + ln(60, 340, 660, 340, LN, 1, 0.35);
    })();

  /* 13 수내리 — 십일월의 빈 논 */
  S[13] = r(0, 0, W, H, SKY) + c(566, 112, 34, HI, 0.16) +
    pg('0,168 720,150 720,432 0,432', MID, 0.75) +
    (function () {
      var s = '';
      for (var row = 0; row < 8; row++) {
        var y = 200 + row * 30;
        for (var i = 0; i < 22; i++) s += ln(20 + i * 33, y, 24 + i * 33, y - 9, LN, 1, 0.3);
      }
      return s;
    })() +
    r(430, 118, 150, 46, DK, 0.85, ' rx="4"') + r(400, 132, 40, 32, DK, 0.85) +
    c(432, 168, 13, DK) + c(552, 168, 13, DK);

  /* 14 면회 기록 — 이십일 년의 기록부 */
  S[14] = r(0, 0, W, H, HI, 0.1) + box(70, 40, 580, 352, LN, 1, 0.5) +
    ln(70, 78, 650, 78, LN, 1, 0.5) + ln(290, 40, 290, 392, LN, 1, 0.35) +
    ln(470, 40, 470, 392, LN, 1, 0.35) +
    tx(88, 66, '날짜', 15, LN) + tx(308, 66, '면회자', 15, LN) + tx(488, 66, '관계', 15, LN) +
    (function () {
      var s = '';
      for (var i = 0; i < 9; i++) {
        var y = 108 + i * 32;
        s += tx(88, y, '19' + (93 + i) + '. 0' + ((i % 9) + 1) + '. 1' + (i % 4 + 1), 14, DK, 'start', true);
        s += tx(308, y, '곽명수', 15, DK);
        s += tx(488, y, '지인', 14, LN);
        s += ln(70, y + 10, 650, y + 10, LN, 1, 0.18);
      }
      return s;
    })();

  /* 15 어머니의 방 — 스물한 장의 같은 물 */
  S[15] = r(0, 0, W, H, MID, 0.55) +
    (function () {
      var s = '';
      for (var i = 0; i < 21; i++) {
        var col = i % 7, row = (i / 7) | 0;
        var x = 44 + col * 94, y = 66 + row * 108;
        s += r(x, y, 78, 88, SKY, 0.75, ' rx="1"') +
          r(x, y + 44, 78, 44, DK, 0.4) +
          ln(x + 8, y + 58, x + 70, y + 58, HI, 1, 0.25) +
          box(x, y, 78, 88, LN, 1, 0.4);
      }
      return s;
    })();

  /* 16 검증 — 형광펜 그어진 페이지 */
  S[16] = r(0, 0, W, H, MID, 0.5) + r(140, 40, 440, 352, HI, 0.16, ' rx="2"') +
    (function () {
      var s = '';
      for (var i = 0; i < 12; i++) {
        var y = 82 + i * 26;
        s += ln(168, y, 168 + (i % 3 ? 380 : 250), y, DK, 2.4, i === 5 ? 0.12 : 0.3);
      }
      return s;
    })() +
    r(166, 196, 300, 20, WARM, 0.4) +
    tx(168, 356, '48 x 61 = 2,928 px', 16, DK, 'start', true) +
    tx(168, 380, '-> 얼굴 정보 없음', 15, WARM, 'start', true);

  /* 17 허락 — 십이월의 놀이터 */
  S[17] = r(0, 0, W, H, DK, 0.9) +
    ln(150, 60, 150, 300, LN, 3, 0.6) + c(150, 56, 17, HI, 0.55) + c(150, 56, 30, HI, 0.12) +
    pg('150,300 470,432 30,432', HI, 0.05) +
    r(360, 268, 210, 12, MID, 0.7, ' rx="3"') + r(374, 280, 10, 44, MID, 0.6) + r(546, 280, 10, 44, MID, 0.6) +
    r(360, 240, 210, 9, MID, 0.5, ' rx="3"') +
    fig(410, 268, 78, DK, 0.85) + fig(520, 268, 62, DK, 0.85) +
    pg('410,270 300,400 340,400 424,272', DK, 0.5) +
    pg('520,270 620,410 656,410 534,272', DK, 0.5);

  /* 18 당신은 누구입니까 — 마지막 대화 */
  S[18] = r(0, 0, W, H, DK, 0.94) + box(52, 44, 616, 344, LN, 1, 0.35) +
    monoLines([
      ['> 당신은 누구입니까', LN],
      ['', LN],
      ['  나는 서동명이다.', HI],
      ['', LN],
      ['> 아닙니다', LN],
      ['', LN],
      ['  진우야. 내가 아니면', HI],
      ['  너는 지금 누구랑', HI],
      ['  얘기하고 있는 거냐.', HI]
    ], 86, 96, 19, 33) +
    r(86, 356, 13, 20, HI, 0.7);

  /* 19 손실 함수 — 더 내려가지 않는 곡선 */
  S[19] = r(0, 0, W, H, DK, 0.9) +
    ln(96, 356, 640, 356, LN, 1.2, 0.5) + ln(96, 356, 96, 64, LN, 1.2, 0.5) +
    (function () {
      var s = '';
      for (var i = 1; i < 5; i++) s += ln(96, 356 - i * 62, 640, 356 - i * 62, LN, 1, 0.15);
      return s;
    })() +
    pl('110,92 160,150 214,206 270,250 330,280 396,296 466,302 540,304 620,305', HI, 2.4, 0.65) +
    tx(624, 292, 'plateau', 15, LN, 'end', true) +
    tx(110, 62, 'loss', 15, LN, 'start', true);

  /* 20 스물세 명 — 서른 개 중 스물세 개 */
  S[20] = r(0, 0, W, H, MID, 0.6) +
    (function () {
      var s = '', n = 0;
      for (var row = 0; row < 5; row++) {
        for (var col = 0; col < 6; col++) {
          var x = 130 + col * 78, y = 108 + row * 62;
          s += r(x, y, 44, 30, LN, 0.35, ' rx="3"') + r(x, y - 16, 44, 16, LN, 0.25, ' rx="3"');
          if (n < 23) s += c(x + 22, y + 6, 13, HI, 0.6);
          n++;
        }
      }
      return s;
    })() +
    r(120, 52, 480, 12, DK, 0.6, ' rx="3"');

  /* 21 절판 — 파쇄장의 팰릿 */
  S[21] = r(0, 0, W, H, DK, 0.88) +
    (function () {
      var s = '';
      for (var p = 0; p < 3; p++) {
        var bx = 60 + p * 150, by = 150 + p * 26;
        for (var i = 0; i < 7; i++) s += r(bx, by + i * 26, 116, 22, MID, 0.5 - p * 0.08, ' rx="1"');
        s += r(bx - 8, by + 182, 132, 12, LN, 0.4);
      }
      return s;
    })() +
    r(516, 96, 168, 236, MID, 0.35, ' rx="4"') + r(534, 130, 132, 26, DK, 0.95) +
    (function () {
      var s = '';
      for (var i = 0; i < 14; i++) s += r(538 + (i % 7) * 19, 210 + ((i / 7) | 0) * 40, 9, 26, HI, 0.2);
      return s;
    })();

  /* 22 삭제 — total 0 */
  S[22] = r(0, 0, W, H, DK, 0.95) +
    monoLines([
      ['$ ls -la checkpoints/', LN],
      ['dad_v1  dad_v2  dad_v3', LN],
      ['dad_v10  dad_v11  dad_v12', LN],
      ['', LN],
      ['$ rm -r checkpoints/', HI],
      ['', LN],
      ['$ ls -la checkpoints/', LN],
      ['total 0', HI]
    ], 78, 96, 19, 36) +
    r(78, 356, 13, 20, HI, 0.75);

  /* 23 닷징과 버닝 — 확대기 아래 손 */
  S[23] = r(0, 0, W, H, DK, 0.9) +
    r(300, 20, 120, 76, MID, 0.6, ' rx="4"') +
    pg('318,96 402,96 620,346 100,346', HI, 0.1) +
    r(120, 346, 480, 66, HI, 0.16) +
    pg('330,180 392,166 412,196 386,232 336,226 316,200', DK, 0.75) +
    pg('316,200 300,246 322,252 336,226', DK, 0.75) +
    e(300, 380, 62, 20, DK, 0.35) +
    tx(600, 400, '3s', 16, LN, 'end', true);

  /* 24 서른네 번째 여름 — 창에서 본 사백 미터 */
  S[24] = r(0, 0, W, H, DK, 0.95) +
    r(112, 40, 496, 340, SKY, 1) +
    (function () {
      var s = r(112, 40, 496, 152, SKY, 1);
      s += pg('112,192 260,166 400,152 520,170 608,158 608,192', DK, 0.5);
      s += r(112, 192, 496, 188, MID, 0.9);
      for (var i = 0; i < 6; i++) s += ln(130 + i * 8, 214 + i * 26, 590 - i * 10, 214 + i * 26, HI, 1, 0.07);
      s += ln(300, 336, 300, 356, HI, 1.6, 0.5) + ln(292, 356, 308, 356, HI, 1.6, 0.5) +
        c(300, 332, 4, HI, 0.6);
      return s;
    })() +
    r(96, 24, 528, 372, 'none', null, ' stroke="' + DK + '" stroke-width="26"') +
    ln(360, 40, 360, 380, DK, 12, 1) + ln(112, 210, 608, 210, DK, 10, 1) +
    r(64, 396, 592, 22, DK, 1);

  /* 25 수세 — 흐르는 물 속의 인화지 */
  S[25] = r(0, 0, W, H, MID, 0.7) +
    r(70, 90, 580, 268, DK, 0.5, ' rx="6"') + box(70, 90, 580, 268, LN, 1.4, 0.5) +
    r(190, 138, 330, 190, HI, 0.22, ' rx="2"') +
    r(190, 232, 330, 96, HI, 0.1) +
    (function () {
      var s = '';
      for (var i = 0; i < 9; i++) {
        s += e(360, 130 + i * 26, 250 - i * 6, 7, HI, 0.07);
      }
      return s;
    })() +
    ln(120, 110, 600, 110, HI, 1, 0.12) + ln(140, 344, 580, 344, HI, 1, 0.1);

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
