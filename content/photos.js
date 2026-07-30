/* 각 화의 사진 — 절차적 흑백 사진 (인라인 SVG)
 *
 * 설계 원칙
 *  1) 사진은 UI 테마에 따라 색이 바뀌지 않는다. 고정 그레이스케일로 그리고,
 *     테마 보정은 CSS 에서 .plate__frame 에 filter 로만 적용한다.
 *  2) 평면 색을 쓰지 않는다. 모든 면은 그라디언트, 모든 경계는 소프트.
 *  3) 사진처럼 보이게 하는 장치를 쓴다 —
 *     대기 원근(먼 것은 흐리고 저대비), 피사계심도, 블룸, 캐스트 섀도,
 *     스페큘러 하이라이트, 필름 그레인, 비네팅.
 */
(function () {
  'use strict';

  var W = 720, H = 432, STRIP = 44;

  /* 사진 계조 — 실제 인화지의 톤 스케일 */
  var T = {
    k:  '#0d1013', d1: '#1a1e23', d2: '#272d34', d3: '#374049',
    m1: '#49535d', m2: '#606a75', m3: '#77828d',
    l1: '#929ca6', l2: '#adb6be', l3: '#c8d0d7', l4: '#dfe5ea',
    w:  '#f1f4f6', ww: '#ffffff',
    warm: '#7d2f22'   /* 암실 안전등 */
  };

  /* ---------------- 문자열 헬퍼 ---------------- */
  function at(o) {
    var s = '';
    for (var k in o) if (o[k] !== null && o[k] !== undefined) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function el(name, o, inner) {
    return '<' + name + at(o) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>');
  }

  /* 한 장의 사진 = defs + 본문 */
  function Photo(no) { this.no = no; this.d = []; this.b = []; this.i = 0; }

  Photo.prototype._id = function () { return 'p' + this.no + '_' + (this.i++); };

  /* 선형 그라디언트. stops: [[offset, color, opacity?], ...] */
  Photo.prototype.lg = function (stops, o) {
    o = o || {};
    var id = this._id();
    var body = stops.map(function (s) {
      return el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? null : s[2] });
    }).join('');
    this.d.push(el('linearGradient', {
      id: id,
      x1: o.x1 == null ? 0 : o.x1, y1: o.y1 == null ? 0 : o.y1,
      x2: o.x2 == null ? 0 : o.x2, y2: o.y2 == null ? 1 : o.y2
    }, body));
    return 'url(#' + id + ')';
  };

  /* 방사 그라디언트 */
  Photo.prototype.rg = function (stops, o) {
    o = o || {};
    var id = this._id();
    var body = stops.map(function (s) {
      return el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? null : s[2] });
    }).join('');
    this.d.push(el('radialGradient', {
      id: id,
      cx: o.cx == null ? '50%' : o.cx, cy: o.cy == null ? '50%' : o.cy,
      r: o.r == null ? '50%' : o.r
    }, body));
    return 'url(#' + id + ')';
  };

  Photo.prototype.add = function (s) { this.b.push(s); return this; };

  /* --- 도형 --- */
  Photo.prototype.rect = function (x, y, w, h, fill, o) {
    return this.add(el('rect', Object.assign({ x: x, y: y, width: w, height: h, fill: fill }, o || {})));
  };
  Photo.prototype.ell = function (cx, cy, rx, ry, fill, o) {
    return this.add(el('ellipse', Object.assign({ cx: cx, cy: cy, rx: rx, ry: ry, fill: fill }, o || {})));
  };
  Photo.prototype.circ = function (cx, cy, r, fill, o) {
    return this.add(el('circle', Object.assign({ cx: cx, cy: cy, r: r, fill: fill }, o || {})));
  };
  Photo.prototype.poly = function (pts, fill, o) {
    return this.add(el('polygon', Object.assign({ points: pts, fill: fill }, o || {})));
  };
  Photo.prototype.path = function (d, o) {
    return this.add(el('path', Object.assign({ d: d, fill: 'none' }, o || {})));
  };
  Photo.prototype.line = function (x1, y1, x2, y2, stroke, sw, o) {
    return this.add(el('line', Object.assign({
      x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, 'stroke-width': sw
    }, o || {})));
  };
  Photo.prototype.text = function (x, y, s, size, fill, o) {
    return this.add(el('text', Object.assign({
      x: x, y: y, 'font-size': size, fill: fill,
      'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
      'letter-spacing': '.03em'
    }, o || {}), s));
  };
  Photo.prototype.g = function (inner, o) { return this.add(el('g', o || {}, inner)); };

  /* ---------------- 사진적 장치 ---------------- */

  /* 하늘: 위가 어둡고 지평선이 밝다 */
  Photo.prototype.sky = function (y0, y1, top, horizon) {
    return this.rect(0, y0, W, y1 - y0, this.lg([[0, top], [0.72, horizon], [1, horizon]]));
  };

  /* 안개층 */
  Photo.prototype.fog = function (y, h, op) {
    return this.rect(-40, y, W + 80, h, T.ww, { filter: 'url(#f-fog)', opacity: op == null ? 0.5 : op });
  };

  /* 먼 산등성이 — 흐리고 저대비 (대기 원근) */
  Photo.prototype.ridge = function (pts, tone, blur, op) {
    return this.poly(pts, tone, { filter: 'url(#f-b' + (blur || 5) + ')', opacity: op == null ? 0.85 : op });
  };

  /* 수면: 먼 쪽이 밝고 앞이 어둡다 + 일그러진 반사 + 스페큘러 */
  Photo.prototype.water = function (y, far, near) {
    this.rect(0, y, W, H - y, this.lg([[0, far], [0.35, near], [1, near]], { y1: 0, y2: 1 }));
    /* 반사 스트리크를 난류로 일그러뜨린다 */
    var streaks = '';
    for (var i = 0; i < 26; i++) {
      var yy = y + 4 + Math.pow(i / 26, 1.7) * (H - y);
      var op = (0.26 - i * 0.008).toFixed(3);
      var x0 = 30 + (i * 53) % 180, x1 = W - 40 - (i * 37) % 200;
      streaks += el('line', {
        x1: x0, y1: yy, x2: x1, y2: yy + 0.5,
        stroke: T.l4, 'stroke-width': i < 8 ? 1.1 : 1.8, opacity: op < 0 ? 0 : op
      });
    }
    this.g(streaks, { filter: 'url(#f-ripple)' });
    /* 지평선 바로 아래 밝은 띠 */
    this.rect(0, y, W, 26, this.lg([[0, T.w, 0.42], [1, T.w, 0]]), { filter: 'url(#f-b5)' });
    return this;
  };

  /* 광원 + 블룸 */
  Photo.prototype.lamp = function (cx, cy, r, tone, strength) {
    this.circ(cx, cy, r * 5.2, this.rg([[0, tone, (strength || 1) * 0.3], [1, tone, 0]]));
    this.circ(cx, cy, r * 2.1, this.rg([[0, tone, (strength || 1) * 0.55], [1, tone, 0]]));
    this.circ(cx, cy, r, tone, { opacity: 0.97, filter: 'url(#f-b2)' });
    return this;
  };

  /* 소프트 캐스트 섀도 */
  Photo.prototype.shadow = function (cx, cy, rx, ry, op, blur) {
    return this.ell(cx, cy, rx, ry, T.k, {
      opacity: op == null ? 0.5 : op, filter: 'url(#f-b' + (blur || 10) + ')'
    });
  };

  /* 입체 표면 (측광) */
  Photo.prototype.solid = function (x, y, w, h, lo, hi, o) {
    return this.rect(x, y, w, h, this.lg([[0, hi], [0.55, lo], [1, lo]]), o);
  };

  /* 스페큘러 하이라이트 */
  Photo.prototype.spec = function (cx, cy, rx, ry, op, blur) {
    return this.ell(cx, cy, rx, ry, T.ww, {
      opacity: op == null ? 0.5 : op, filter: 'url(#f-b' + (blur || 5) + ')'
    });
  };

  /* 종이: 미세한 계조 + 그림자 */
  Photo.prototype.paper = function (x, y, w, h, rot) {
    var tr = rot ? 'rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')' : null;
    this.shadow(x + w / 2 + 8, y + h / 2 + 14, w / 2 - 6, h / 2 - 6, 0.55, 10);
    this.rect(x, y, w, h, this.lg([[0, T.ww], [0.5, T.l4], [1, T.l3]], { x2: 0.6, y2: 1 }),
      { transform: tr, rx: 1 });
    return this;
  };

  /* 인쇄된 글줄 (거리감을 위해 살짝 흐림) */
  Photo.prototype.textLines = function (x, y, w, n, gap, tone, op) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var ww = i % 4 === 3 ? w * 0.55 : w * (0.86 + (i % 3) * 0.05);
      s += el('rect', { x: x, y: y + i * gap, width: ww, height: 2.6, fill: tone, opacity: op == null ? 0.72 : op });
    }
    return this.g(s, { filter: 'url(#f-b2)' });
  };

  /* 스크린 (터미널) */
  Photo.prototype.screen = function () {
    this.rect(0, 0, W, H, this.lg([[0, T.d2], [0.5, T.d1], [1, T.k]]));
    this.rect(0, 0, W, H, this.rg([[0, T.m1, 0.5], [1, T.k, 0]], { cx: '38%', cy: '34%', r: '68%' }));
    var sl = '';
    for (var i = 0; i < 108; i++) sl += el('rect', { x: 0, y: i * 4, width: W, height: 1.4, fill: T.k, opacity: 0.16 });
    return this.g(sl);
  };

  /* 발광 텍스트 (블룸 사본을 뒤에 깔고 본체를 올린다) */
  Photo.prototype.glowText = function (x, y, lines, size, gap, tone) {
    var mk = function (fill, o) {
      var s = '';
      for (var i = 0; i < lines.length; i++) {
        if (!lines[i][0]) continue;
        s += el('text', {
          x: x, y: y + i * gap, 'font-size': size, fill: lines[i][1] || fill,
          'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
          'letter-spacing': '.04em', opacity: o
        }, lines[i][0]);
      }
      return s;
    };
    this.g(mk(tone, 0.85), { filter: 'url(#f-b5)' });
    this.g(mk(tone, 1));
    return this;
  };

  /* 마감: 비네팅 + 그레인 */
  Photo.prototype.finish = function (vig, grain, coarse) {
    this.rect(0, 0, W, H, this.rg([[0.52, T.k, 0], [1, T.k, vig == null ? 0.26 : vig]],
      { cx: '50%', cy: '46%', r: '76%' }));
    this.rect(0, 0, W, H, T.ww, {
      filter: 'url(#f-grain' + (coarse ? '-coarse' : '') + ')',
      opacity: grain == null ? 0.13 : grain,
      style: 'mix-blend-mode:overlay'
    });
    return this;
  };

  /* 필름 프레임으로 감싸 최종 SVG 를 만든다 */
  Photo.prototype.out = function () {
    var sp = '';
    for (var x = 16; x < W - 24; x += 42) {
      sp += el('rect', { x: x, y: 12, width: 24, height: 19, rx: 4, fill: '#2a2f35' });
      sp += el('rect', { x: x, y: 12, width: 24, height: 6, rx: 3, fill: '#0e1013', opacity: 0.55 });
      sp += el('rect', { x: x, y: H + STRIP * 2 - 31, width: 24, height: 19, rx: 4, fill: '#2a2f35' });
      sp += el('rect', { x: x, y: H + STRIP * 2 - 31, width: 24, height: 6, rx: 3, fill: '#0e1013', opacity: 0.55 });
    }
    var base = el('linearGradient', { id: 'fb' + this.no, x1: 0, y1: 0, x2: 0, y2: 1 },
      el('stop', { offset: 0, 'stop-color': '#191d22' }) +
      el('stop', { offset: 0.5, 'stop-color': '#12151a' }) +
      el('stop', { offset: 1, 'stop-color': '#191d22' }));

    return '<svg viewBox="0 0 ' + W + ' ' + (H + STRIP * 2) + '" role="img" aria-hidden="true">' +
      '<defs>' + base + this.d.join('') + '</defs>' +
      el('rect', { x: 0, y: 0, width: W, height: H + STRIP * 2, fill: 'url(#fb' + this.no + ')' }) +
      sp +
      el('text', {
        x: 16, y: 40, 'font-size': 11, fill: '#59626c',
        'font-family': 'ui-monospace, monospace', 'letter-spacing': '.14em'
      }, 'KODAK TRI-X 400') +
      el('text', {
        x: W - 16, y: H + STRIP + 30, 'font-size': 14, fill: '#59626c',
        'font-family': 'ui-monospace, monospace', 'text-anchor': 'end'
      }, this.no + 'A') +
      '<g transform="translate(0,' + STRIP + ')">' +
      this.b.join('') +
      el('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, fill: 'none', stroke: '#0a0c0e', 'stroke-width': 1 }) +
      '</g></svg>';
  };

  /* ================= 스물다섯 장 ================= */
  var SCENE = {};

  /* 1 미현상 — 아직 아무 상도 없는 프레임 */
  SCENE[1] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d3], [0.5, T.d2], [1, T.d1]], { x2: 0.35, y2: 1 }));
    /* 고르지 않은 현상 얼룩 — 난류를 쓰면 무늬가 드러나므로 큰 그라디언트로 */
    p.ell(230, 150, 260, 170, p.rg([[0, T.m1, 0.5], [1, T.m1, 0]]));
    p.ell(560, 300, 300, 190, p.rg([[0, T.d1, 0.55], [1, T.d1, 0]]));
    p.ell(420, 90, 220, 120, p.rg([[0, T.m2, 0.28], [1, T.m2, 0]]));
    /* 한쪽 끝의 빛 새어듦 */
    p.rect(W - 190, 0, 190, H, p.lg([[0, T.w, 0], [1, T.w, 0.2]], { x1: 0, x2: 1, y2: 0 }),
      { filter: 'url(#f-b22)' });
    p.rect(0, 0, W, H, p.lg([[0, T.w, 0.09], [0.45, T.w, 0], [1, T.k, 0.1]], { x1: 0, y1: 0, x2: 1, y2: 1 }));
    p.finish(0.2, 0.4, true);
  };

  /* 2 어둠상자 — 안전등 아래 마르는 필름 */
  SCENE[2] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d1], [1, T.k]]));
    p.lamp(608, 62, 17, T.warm, 1.25);
    p.rect(0, 0, W, H, p.rg([[0, T.warm, 0.3], [1, T.k, 0]], { cx: '84%', cy: '14%', r: '86%' }));
    /* 빨랫줄 */
    p.line(0, 126, W, 114, T.m2, 2, { opacity: 0.75 });
    for (var i = 0; i < 3; i++) {
      var x = 138 + i * 172, top = 120 - i * 3;
      /* 집게 */
      p.rect(x - 6, top - 11, 12, 18, p.lg([[0, T.l1], [1, T.m1]]), { rx: 2 });
      /* 필름 스트립 — 오른쪽에서 빛을 받는다 */
      p.rect(x - 31, top + 5, 62, 252,
        p.lg([[0, T.d3, 1], [0.62, T.d1, 1], [1, T.k, 1]], { x1: 0, x2: 1, y1: 0, y2: 0 }));
      for (var k = 0; k < 4; k++) {
        p.rect(x - 25, top + 20 + k * 60, 50, 46,
          p.lg([[0, T.m2, 0.5], [1, T.d2, 0.5]], { x2: 1, y2: 0.4 }));
      }
      /* 젖은 표면의 반사 */
      p.rect(x + 22, top + 5, 5, 252, T.l2, { opacity: 0.3, filter: 'url(#f-b2)' });
      p.spec(x + 24, top + 70, 4, 40, 0.28, 5);
    }
    /* 바닥 트레이 암시 */
    p.ell(360, 424, 300, 40, T.k, { opacity: 0.7, filter: 'url(#f-b22)' });
    p.finish(0.28, 0.14);
  };

  /* 3 카세트 — 정물 */
  SCENE[3] = function (p) {
    p.rect(0, 0, W, H, p.rg([[0, T.m1, 1], [1, T.k, 1]], { cx: '34%', cy: '22%', r: '96%' }));
    p.rect(0, 300, W, 132, p.lg([[0, T.d2, 0.8], [1, T.k, 1]]));
    p.shadow(400, 372, 230, 34, 0.62, 10);
    /* 본체 */
    p.rect(140, 96, 440, 258, p.lg([[0, T.m1], [0.18, T.d3], [1, T.k]]), { rx: 10 });
    p.rect(140, 96, 440, 5, T.l2, { opacity: 0.42, rx: 2 });
    /* 라벨 */
    p.rect(172, 122, 376, 96, p.lg([[0, T.ww], [0.6, T.l4], [1, T.l2]], { x2: 0.4, y2: 1 }), { rx: 2 });
    p.textLines(196, 150, 300, 3, 22, T.m1, 0.55);
    /* 창과 릴 */
    p.rect(196, 240, 328, 88, p.lg([[0, T.k], [1, T.d3]]), { rx: 5, opacity: 0.9 });
    [268, 452].forEach(function (cx) {
      p.circ(cx, 284, 46, p.rg([[0, T.m3], [0.72, T.m1], [1, T.d1]], { cx: '38%', cy: '32%' }));
      p.circ(cx, 284, 30, p.rg([[0, T.d2], [1, T.k]]));
      p.circ(cx, 284, 15, p.lg([[0, T.l1], [1, T.m1]]));
      p.spec(cx - 16, 268, 13, 8, 0.4, 2);
    });
    p.spec(300, 118, 150, 14, 0.3, 5);
    p.finish(0.28, 0.13);
  };

  /* 4 8월 12일 — 물가에 놓인 흰 샌들 */
  SCENE[4] = function (p) {
    p.sky(0, 152, T.m2, T.l4);
    /* 건너편 낮은 능선 — 가늘고 흐리게 (대기 원근) */
    p.g(el('polygon', { points: '0,146 180,136 380,128 560,138 720,130 720,152 0,152', fill: T.m3, opacity: 0.6 }),
      { filter: 'url(#f-b2)' });
    p.water(152, T.l3, T.m1);
    /* 지평선에 얇은 안개만 */
    p.rect(-40, 128, W + 80, 40, T.ww, { filter: 'url(#f-fog)', opacity: 0.42 });
    /* 젖은 앞쪽 흙 */
    p.poly('0,286 720,262 720,432 0,432', p.lg([[0, T.m1], [0.35, T.d2], [1, T.d1]]));
    p.rect(0, 262, W, 170, T.m2, { filter: 'url(#f-rough)', opacity: 0.26 });
    p.rect(0, 272, W, 26, T.l3, { opacity: 0.24, filter: 'url(#f-b5)' });
    /* 샌들 두 짝 — 발끝을 물쪽으로 두고 위에서 비스듬히 본다.
       밑창을 순백으로 두면 흰 끈이 묻혀 도자기처럼 보인다.
       밑창은 중간 밝기, 끈은 흰색 + 끈 아래 그림자로 분리한다. */
    [[268, 350, -12, 1.0], [380, 364, 8, 0.95]].forEach(function (s) {
      var x = s[0], y = s[1], rot = s[2], k = s[3];
      var L = 74 * k;   /* 앞뒤 길이 */
      var Wd = 30 * k;  /* 최대 폭 (앞볼) */

      /* 발 모양 밑창: 둥근 뒤꿈치 -> 좁은 허리 -> 넓은 앞볼 -> 둥근 앞코 */
      function outline(sx, sy) {
        return 'M ' + (sx - Wd * 0.36) + ' ' + (sy + L * 0.40) +                       /* 뒤꿈치 왼쪽 */
          ' C ' + (sx - Wd * 0.60) + ' ' + (sy + L * 0.34) + ' ' + (sx - Wd * 0.58) + ' ' + (sy + L * 0.10) +
          ' ' + (sx - Wd * 0.46) + ' ' + (sy - L * 0.04) +                             /* 허리 */
          ' C ' + (sx - Wd * 0.36) + ' ' + (sy - L * 0.16) + ' ' + (sx - Wd * 0.94) + ' ' + (sy - L * 0.26) +
          ' ' + (sx - Wd * 0.92) + ' ' + (sy - L * 0.36) +                             /* 앞볼 왼쪽 */
          ' C ' + (sx - Wd * 0.90) + ' ' + (sy - L * 0.46) + ' ' + (sx - Wd * 0.30) + ' ' + (sy - L * 0.50) +
          ' ' + (sx + Wd * 0.16) + ' ' + (sy - L * 0.49) +                             /* 앞코 */
          ' C ' + (sx + Wd * 0.72) + ' ' + (sy - L * 0.48) + ' ' + (sx + Wd * 0.94) + ' ' + (sy - L * 0.34) +
          ' ' + (sx + Wd * 0.88) + ' ' + (sy - L * 0.22) +                             /* 앞볼 오른쪽 */
          ' C ' + (sx + Wd * 0.80) + ' ' + (sy - L * 0.08) + ' ' + (sx + Wd * 0.52) + ' ' + (sy + L * 0.10) +
          ' ' + (sx + Wd * 0.44) + ' ' + (sy + L * 0.28) +
          ' C ' + (sx + Wd * 0.38) + ' ' + (sy + L * 0.42) + ' ' + (sx - Wd * 0.08) + ' ' + (sy + L * 0.48) +
          ' ' + (sx - Wd * 0.36) + ' ' + (sy + L * 0.40) + ' Z';
      }

      p.shadow(x + 6, y + L * 0.36, Wd * 1.0, L * 0.16, 0.66, 5);

      p.g(
        /* 밑창 두께 */
        el('path', { d: outline(x, y + 5 * k), fill: T.m2, opacity: 0.95 }) +
        /* 밑창 윗면 — 중간 밝기 (끈과 구분되도록) */
        el('path', { d: outline(x, y), fill: p.lg([[0, T.l3], [0.5, T.l2], [1, T.m3]], { x2: 0.35, y2: 1 }) }) +
        /* 발이 닿던 자리 (약간 어둡게) */
        el('ellipse', {
          cx: x - Wd * 0.06, cy: y - L * 0.08, rx: Wd * 0.52, ry: L * 0.30,
          fill: T.m2, opacity: 0.34
        }) +
        /* 끈 아래 그림자 — 이게 있어야 끈이 밑창에서 떠 보인다 */
        el('path', {
          d: 'M ' + (x - Wd * 0.80) + ' ' + (y - L * 0.18) +
             ' Q ' + (x - Wd * 0.14) + ' ' + (y - L * 0.40) + ' ' + (x + Wd * 0.08) + ' ' + (y - L * 0.46),
          fill: 'none', stroke: T.m1, 'stroke-width': 6.5 * k,
          'stroke-linecap': 'round', opacity: 0.55, transform: 'translate(1.5,3)'
        }) +
        el('path', {
          d: 'M ' + (x + Wd * 0.78) + ' ' + (y - L * 0.10) +
             ' Q ' + (x + Wd * 0.30) + ' ' + (y - L * 0.36) + ' ' + (x + Wd * 0.08) + ' ' + (y - L * 0.46),
          fill: 'none', stroke: T.m1, 'stroke-width': 6.5 * k,
          'stroke-linecap': 'round', opacity: 0.55, transform: 'translate(1.5,3)'
        }) +
        /* V자 끈 */
        el('path', {
          d: 'M ' + (x - Wd * 0.80) + ' ' + (y - L * 0.18) +
             ' Q ' + (x - Wd * 0.14) + ' ' + (y - L * 0.40) + ' ' + (x + Wd * 0.08) + ' ' + (y - L * 0.46),
          fill: 'none', stroke: T.ww, 'stroke-width': 5.4 * k, 'stroke-linecap': 'round'
        }) +
        el('path', {
          d: 'M ' + (x + Wd * 0.78) + ' ' + (y - L * 0.10) +
             ' Q ' + (x + Wd * 0.30) + ' ' + (y - L * 0.36) + ' ' + (x + Wd * 0.08) + ' ' + (y - L * 0.46),
          fill: 'none', stroke: T.ww, 'stroke-width': 5.4 * k, 'stroke-linecap': 'round'
        }) +
        /* 엄지 사이 고정 지점 */
        el('circle', { cx: x + Wd * 0.08, cy: y - L * 0.46, r: 3.4 * k, fill: T.l4 }) +
        /* 뒤꿈치 쪽 밑창 하이라이트 */
        el('ellipse', {
          cx: x + Wd * 0.02, cy: y + L * 0.34, rx: Wd * 0.34, ry: L * 0.07,
          fill: T.ww, opacity: 0.5
        }),
        { transform: 'rotate(' + rot + ' ' + x + ' ' + y + ')' }
      );
    });
    p.finish(0.24, 0.14);
  };

  /* 5 1997 — 물 건너 언덕 위 건물 */
  SCENE[5] = function (p) {
    p.sky(0, 190, T.m1, T.l3);
    /* 언덕 */
    p.g(el('polygon', { points: '0,190 130,166 320,142 470,158 620,140 720,150 720,192 0,192', fill: T.d3, opacity: 0.9 }),
      { filter: 'url(#f-b2)' });
    /* 능선 위 건물 — 작고 저대비, 창 하나만 켜져 있다 */
    p.g(
      el('rect', { x: 436, y: 128, width: 116, height: 34, fill: T.d2 }) +
      el('rect', { x: 431, y: 123, width: 126, height: 6, fill: T.d1 }) +
      el('rect', { x: 508, y: 136, width: 15, height: 12, fill: T.l4, opacity: 0.95 }),
      { filter: 'url(#f-b2)', opacity: 0.95 }
    );
    p.circ(515, 142, 22, p.rg([[0, T.w, 0.45], [1, T.w, 0]]));
    p.water(190, T.l2, T.d2);
    p.rect(-40, 168, W + 80, 44, T.ww, { filter: 'url(#f-fog)', opacity: 0.42 });
    /* 켜진 창의 수면 반사 — 세로로 길게 흔들린다 */
    p.rect(506, 194, 19, 96, p.lg([[0, T.l4, 0.5], [1, T.l4, 0]]), { filter: 'url(#f-ripple-soft)' });
    p.finish(0.26, 0.14);
  };

  /* 6 48×61 픽셀 */
  SCENE[6] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d3], [1, T.d1]]));
    var ox = 132, oy = 34, cw = 38;
    /* 뒤에 흐린 얼굴 (원본이 있었다는 암시) */
    p.g(
      el('ellipse', { cx: ox + 6 * cw, cy: oy + 4.5 * cw, rx: 96, ry: 122, fill: T.l2, opacity: 0.5 }) +
      el('ellipse', { cx: ox + 4.6 * cw, cy: oy + 3.6 * cw, rx: 15, ry: 11, fill: T.k, opacity: 0.5 }) +
      el('ellipse', { cx: ox + 7.4 * cw, cy: oy + 3.6 * cw, rx: 15, ry: 11, fill: T.k, opacity: 0.5 }) +
      el('ellipse', { cx: ox + 6 * cw, cy: oy + 6.1 * cw, rx: 26, ry: 9, fill: T.k, opacity: 0.35 }),
      { filter: 'url(#f-b22)' }
    );
    /* 그 위의 픽셀 격자 */
    var face = [
      '000000000000', '000011110000', '000122221000', '001233332100',
      '001234432100', '001233332100', '000122221000', '000011110000', '000000000000'
    ];
    var tone = [T.d1, T.m1, T.m3, T.l2, T.w], grid = '';
    for (var y = 0; y < 9; y++) {
      for (var x = 0; x < 12; x++) {
        var v = +face[y][x];
        grid += el('rect', {
          x: ox + x * cw, y: oy + y * cw, width: cw, height: cw,
          fill: tone[v], opacity: 0.9
        });
      }
    }
    p.g(grid);
    p.rect(ox, oy, 12 * cw, 9 * cw, 'none', { stroke: T.l3, 'stroke-width': 1, opacity: 0.4 });
    p.text(ox, oy + 9 * cw + 30, '48 x 61 px', 20, T.l3, { opacity: 0.85 });
    p.finish(0.2, 0.12);
  };

  /* 7 계약 — 책상 위 서류와 만년필 */
  SCENE[7] = function (p) {
    p.rect(0, 0, W, H, p.rg([[0, T.m1], [1, T.k]], { cx: '26%', cy: '10%', r: '110%' }));
    p.rect(0, 0, W, H, T.m2, { filter: 'url(#f-wood)', opacity: 0.22 });
    p.paper(146, 44, 300, 372, -4);
    p.paper(178, 56, 322, 372, 0);
    p.textLines(210, 104, 262, 11, 26, T.m1, 0.7);
    /* 서명 */
    p.path('M 214 392 q 26 -16 44 -2 t 34 -10 t 30 4', { stroke: T.d1, 'stroke-width': 3.4, opacity: 0.85 });
    /* 만년필 */
    p.g(
      el('rect', { x: 520, y: 208, width: 196, height: 13, rx: 6, fill: p.lg([[0, T.l1], [0.4, T.d2], [1, T.k]]) }) +
      el('rect', { x: 520, y: 208, width: 196, height: 3, rx: 2, fill: T.l3, opacity: 0.5 }) +
      el('polygon', { points: '520,214 496,220 520,226', fill: p.lg([[0, T.l3], [1, T.m2]]) }),
      { transform: 'rotate(-22 618 214)' }
    );
    p.shadow(626, 232, 96, 10, 0.5, 5);
    p.finish(0.28, 0.13);
  };

  /* 8 환각 — 학습 로그와 내려가는 손실 */
  SCENE[8] = function (p) {
    p.screen();
    p.glowText(74, 96, [
      ['epoch 1/3  loss 1.402', T.l1], ['epoch 2/3  loss 1.115', T.l1],
      ['epoch 3/3  loss 0.981', T.l1], ['', null], ['saved: dad_v10', T.w]
    ], 21, 36, T.l1);
    /* 그래프 */
    p.line(410, 352, 664, 352, T.m2, 1.4, { opacity: 0.6 });
    p.line(410, 352, 410, 118, T.m2, 1.4, { opacity: 0.6 });
    var d = 'M 418 136 C 470 210 520 262 570 292 S 630 310 656 314';
    p.path(d, { stroke: T.w, 'stroke-width': 7, opacity: 0.4, filter: 'url(#f-b5)' });
    p.path(d, { stroke: T.w, 'stroke-width': 2.4, opacity: 0.95 });
    p.text(410, 106, 'loss', 17, T.l2);
    p.finish(0.28, 0.1);
  };

  /* 9 선희, 네 통 — 피사계심도 */
  SCENE[9] = function (p) {
    p.rect(0, 0, W, H, p.rg([[0, T.m1], [1, T.k]], { cx: '30%', cy: '18%', r: '100%' }));
    p.rect(0, 306, W, 126, p.lg([[0, T.d2, 0.85], [1, T.k, 1]]));
    /* 뒤쪽 세 통은 흐리게, 앞의 한 통만 선명하게 */
    function can(x, y, s, blur) {
      var w = 92 * s, h = 176 * s;
      var inner =
        el('ellipse', { cx: x + w / 2, cy: y + h, rx: w / 2, ry: 14 * s, fill: T.k, opacity: 0.6 }) +
        el('rect', { x: x, y: y, width: w, height: h, rx: 10 * s, fill: p.lg([[0, T.m2], [0.22, T.d2], [0.8, T.k], [1, T.d1]], { x2: 1, y2: 0 }) }) +
        el('ellipse', { cx: x + w / 2, cy: y, rx: w / 2, ry: 15 * s, fill: p.lg([[0, T.l2], [1, T.m1]], { x2: 1, y2: 0 }) }) +
        el('ellipse', { cx: x + w / 2, cy: y - 6 * s, rx: w / 2 - 14 * s, ry: 9 * s, fill: T.d2, opacity: 0.8 }) +
        el('text', {
          x: x + w / 2, y: y + 66 * s, 'font-size': 27 * s, fill: T.w,
          'text-anchor': 'middle', 'font-family': '-apple-system, system-ui, sans-serif', opacity: 0.94
        }, '선희') +
        el('rect', { x: x + 12 * s, y: y + 80 * s, width: w - 24 * s, height: 2.6, fill: T.l3, opacity: 0.7 }) +
        el('rect', { x: x + w - 22 * s, y: y + 10 * s, width: 6 * s, height: h - 20 * s, fill: T.l2, opacity: 0.18 });
      return blur
        ? p.g(inner, { filter: 'url(#f-b' + blur + ')', opacity: 0.9 })
        : p.g(inner);
    }
    can(492, 140, 0.9, 5);
    can(374, 136, 0.95, 2);
    can(248, 134, 1, 2);
    can(104, 128, 1.06, 0);
    p.spec(150, 150, 30, 12, 0.28, 5);
    p.finish(0.28, 0.13);
  };

  /* 10 인화 — 검은 표지 위 흰 사각형 */
  SCENE[10] = function (p) {
    p.rect(0, 0, W, H, p.rg([[0, T.m1], [1, T.k]], { cx: '46%', cy: '8%', r: '104%' }));
    p.rect(0, 340, W, 92, p.lg([[0, T.d2, 0.7], [1, T.k, 1]]));
    p.shadow(378, 400, 176, 22, 0.6, 10);
    /* 책등과 표지 */
    p.rect(222, 52, 18, 344, p.lg([[0, T.d3], [1, T.k]], { x2: 1, y2: 0 }));
    p.rect(240, 44, 262, 356, p.lg([[0, T.d3], [0.3, T.d1], [1, T.k]], { x2: 0.7, y2: 1 }), { rx: 2 });
    /* 표지의 사광 반사 */
    p.g(el('rect', { x: 240, y: 44, width: 262, height: 356, fill: p.lg([[0, T.ww, 0.22], [0.42, T.ww, 0.04], [1, T.ww, 0]], { x1: 0, y1: 0, x2: 1, y2: 1 }) }));
    p.rect(304, 140, 136, 136, p.lg([[0, T.ww], [1, T.l3]], { x2: 0.5, y2: 1 }));
    p.spec(340, 150, 54, 12, 0.4, 5);
    p.finish(0.28, 0.12);
  };

  /* 11 마루 — 젖은 발자국 */
  SCENE[11] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.l1], [0.4, T.m2], [1, T.m1]]));
    p.rect(0, 0, W, H, T.l3, { filter: 'url(#f-wood)', opacity: 0.3 });
    for (var i = 0; i < 8; i++) {
      var y = 46 + i * 54;
      p.line(0, y, W, y - 14, T.d1, 3, { opacity: 0.32 });
      p.line(0, y + 3, W, y - 11, T.l4, 1, { opacity: 0.16 });
    }
    p.poly('0,0 240,0 320,432 0,432', p.lg([[0, T.ww, 0.18], [1, T.ww, 0]], { x1: 0, x2: 1, y2: 0 }),
      { filter: 'url(#f-b22)' });
    /* 물기 — 경계가 번진 불규칙한 얼룩. 발 모양은 겨우 알아볼 정도로 */
    [[254, 268, -9], [402, 340, 7]].forEach(function (s) {
      var x = s[0], y = s[1];
      var sole = 'M ' + (x - 30) + ' ' + (y + 46) +
        ' C ' + (x - 52) + ' ' + (y + 10) + ' ' + (x - 44) + ' ' + (y - 30) + ' ' + (x - 22) + ' ' + (y - 48) +
        ' C ' + (x - 2) + ' ' + (y - 64) + ' ' + (x + 28) + ' ' + (y - 58) + ' ' + (x + 38) + ' ' + (y - 34) +
        ' C ' + (x + 48) + ' ' + (y - 8) + ' ' + (x + 28) + ' ' + (y + 20) + ' ' + (x + 24) + ' ' + (y + 46) +
        ' C ' + (x + 20) + ' ' + (y + 66) + ' ' + (x - 26) + ' ' + (y + 68) + ' Z';
      p.g(
        el('path', { d: sole, fill: T.d1, opacity: 0.52 }) +
        el('ellipse', { cx: x - 26, cy: y - 60, rx: 10, ry: 8, fill: T.d1, opacity: 0.36 }) +
        el('ellipse', { cx: x - 6, cy: y - 68, rx: 8, ry: 6, fill: T.d1, opacity: 0.34 }) +
        el('ellipse', { cx: x + 12, cy: y - 67, rx: 7, ry: 5, fill: T.d1, opacity: 0.32 }) +
        el('ellipse', { cx: x + 28, cy: y - 60, rx: 6, ry: 4, fill: T.d1, opacity: 0.3 }),
        { filter: 'url(#f-b2)', transform: 'rotate(' + s[2] + ' ' + x + ' ' + y + ')' }
      );
      /* 젖은 표면의 반사 */
      p.spec(x - 12, y + 4, 16, 30, 0.26, 5);
      p.spec(x + 8, y - 38, 12, 12, 0.2, 2);
    });
    p.finish(0.26, 0.15);
  };

  /* 12 팩트필름 — 재생과 파형 */
  SCENE[12] = function (p) {
    p.screen();
    p.circ(360, 158, 84, p.rg([[0, T.l1, 0.3], [1, T.k, 0]]));
    p.poly('332,122 332,194 398,158', T.w, { opacity: 0.5, filter: 'url(#f-b5)' });
    p.poly('332,122 332,194 398,158', p.lg([[0, T.ww], [1, T.l2]]), { opacity: 0.96 });
    var bars = '', hs = [16, 46, 26, 74, 34, 96, 46, 116, 30, 78, 22, 58, 38, 88, 28, 54, 20, 40];
    for (var i = 0; i < hs.length; i++) {
      bars += el('rect', {
        x: 92 + i * 30, y: 330 - hs[i] / 2, width: 13, height: hs[i], rx: 3,
        fill: p.lg([[0, T.w], [1, T.m2]]), opacity: 0.9
      });
      bars += el('rect', {
        x: 92 + i * 30, y: 330 + hs[i] / 2, width: 13, height: hs[i] * 0.5, rx: 3,
        fill: T.l1, opacity: 0.13
      });
    }
    p.g(bars);
    p.finish(0.28, 0.1);
  };

  /* 13 수내리 — 십일월의 논 */
  SCENE[13] = function (p) {
    p.sky(0, 186, T.m2, T.l4);
    p.lamp(556, 100, 26, T.ww, 0.8);
    p.g(el('polygon', { points: '0,178 150,160 340,150 520,162 720,152 720,196 0,196', fill: T.m2, opacity: 0.55 }),
      { filter: 'url(#f-b5)' });
    p.rect(0, 176, W, H - 176, p.lg([[0, T.l1], [0.35, T.m2], [1, T.d2]]));
    p.rect(0, 176, W, H - 176, T.d1, { filter: 'url(#f-rough)', opacity: 0.3 });
    for (var row = 0; row < 8; row++) {
      var yy = 210 + row * 30, sc = 0.5 + row * 0.14, marks = '';
      for (var i = 0; i < 22; i++) {
        var x = 16 + i * 34 - row * 6;
        marks += el('line', {
          x1: x, y1: yy, x2: x + 4 * sc, y2: yy - 12 * sc,
          stroke: T.k, 'stroke-width': 1.4 * sc, opacity: 0.45
        });
      }
      p.g(marks, row < 3 ? { filter: 'url(#f-b2)' } : {});
    }
    /* 트럭 — 캡 + 적재함 + 바퀴 */
    p.g(
      el('rect', { x: 424, y: 122, width: 132, height: 40, fill: p.lg([[0, T.m1], [1, T.k]]) }) +
      el('rect', { x: 424, y: 118, width: 132, height: 5, fill: T.l2, opacity: 0.4 }) +
      el('polygon', { points: '392,158 392,110 424,104 424,158', fill: p.lg([[0, T.m2], [1, T.d1]]) }) +
      el('rect', { x: 398, y: 114, width: 20, height: 16, fill: T.l3, opacity: 0.5 }) +
      el('rect', { x: 392, y: 152, width: 168, height: 10, fill: T.k, opacity: 0.9 }) +
      el('circle', { cx: 416, cy: 164, r: 14, fill: T.k }) +
      el('circle', { cx: 416, cy: 164, r: 6, fill: T.m1, opacity: 0.7 }) +
      el('circle', { cx: 532, cy: 164, r: 14, fill: T.k }) +
      el('circle', { cx: 532, cy: 164, r: 6, fill: T.m1, opacity: 0.7 })
    );
    p.shadow(474, 176, 100, 8, 0.5, 5);
    p.finish(0.24, 0.14);
  };

  /* 14 면회 기록 — 반복되는 하나의 이름 */
  SCENE[14] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d2], [1, T.k]]));
    /* 펼쳐진 장부 */
    p.rect(24, 18, 672, 400, p.lg([[0, T.ww], [0.42, T.l4], [1, T.l2]], { x2: 0.3, y2: 1 }), { rx: 2 });
    /* 제책부 그림자 */
    p.rect(24, 18, 54, 400, p.lg([[0, T.k, 0.42], [1, T.k, 0]], { x1: 0, x2: 1, y2: 0 }),
      { filter: 'url(#f-b5)' });
    p.line(66, 26, 66, 410, T.m3, 1.2, { opacity: 0.35 });
    p.line(300, 26, 300, 410, T.m3, 1.2, { opacity: 0.3 });
    p.line(64, 74, 664, 74, T.m1, 2, { opacity: 0.6 });
    p.add(el('text', { x: 84, y: 62, 'font-size': 17, fill: T.m1, 'font-family': '-apple-system, system-ui, sans-serif' }, '날짜'));
    p.add(el('text', { x: 318, y: 62, 'font-size': 17, fill: T.m1, 'font-family': '-apple-system, system-ui, sans-serif' }, '면회자'));
    var rows = '';
    for (var i = 0; i < 9; i++) {
      var y = 110 + i * 34;
      rows += el('text', {
        x: 84, y: y, 'font-size': 17, fill: T.d1,
        'font-family': 'ui-monospace, monospace', opacity: 0.86
      }, String(1993 + i) + '. 0' + ((i % 9) + 1) + '. 1' + (i % 4 + 1));
      rows += el('text', {
        x: 318, y: y, 'font-size': 18, fill: T.d1,
        'font-family': '-apple-system, system-ui, sans-serif', opacity: 0.9
      }, '곽명수');
      rows += el('line', { x1: 64, y1: y + 11, x2: 664, y2: y + 11, stroke: T.m3, 'stroke-width': 1, opacity: 0.22 });
    }
    p.g(rows, { filter: 'url(#f-b2)' });
    /* 위에서 비스듬히 떨어지는 빛 */
    p.rect(24, 18, 672, 400, p.lg([[0, T.ww, 0.3], [0.6, T.ww, 0], [1, T.k, 0.12]], { x1: 0, y1: 0, x2: 0.8, y2: 1 }));
    p.finish(0.22, 0.12);
  };

  /* 15 스물한 장 — 라이트박스 위의 콘택트시트 */
  SCENE[15] = function (p) {
    p.rect(0, 0, W, H, p.rg([[0, T.m1], [1, T.k]], { cx: '50%', cy: '46%', r: '82%' }));
    for (var i = 0; i < 21; i++) {
      var col = i % 7, row = (i / 7) | 0;
      var x = 40 + col * 94, y = 56 + row * 110;
      var hz = 32 + ((i * 5) % 5) * 5;
      p.rect(x + 3, y + 5, 80, 92, T.k, { opacity: 0.55, filter: 'url(#f-b2)' });
      p.rect(x, y, 80, hz, p.lg([[0, T.m1], [1, T.l2]]));
      p.rect(x, y + hz, 80, 92 - hz, p.lg([[0, T.m1], [0.45, T.d2], [1, T.k]]));
      p.line(x, y + hz, x + 80, y + hz, T.l3, 1, { opacity: 0.55 });
      p.rect(x, y + hz, 80, 8, T.l3, { opacity: 0.14, filter: 'url(#f-b2)' });
      p.rect(x, y, 80, 92, 'none', { stroke: T.m3, 'stroke-width': 0.8, opacity: 0.3 });
    }
    p.rect(0, 0, W, H, p.lg([[0, T.ww, 0.06], [0.5, T.ww, 0], [1, T.ww, 0.03]], { x1: 0, y1: 0, x2: 1, y2: 1 }));
    p.finish(0.28, 0.12);
  };

  /* 16 검증 — 형광펜이 그어진 페이지 */
  SCENE[16] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d2], [1, T.k]]));
    p.paper(126, 28, 470, 376, 0);
    p.textLines(158, 76, 400, 11, 26, T.m1, 0.72);
    /* 형광펜: 반투명 + 번짐 */
    p.rect(154, 168, 330, 24, p.lg([[0, T.l3, 0.5], [1, T.l3, 0.34]], { x2: 1, y2: 0 }),
      { filter: 'url(#f-b2)' });
    p.textLines(158, 176, 300, 1, 26, T.k, 0.8);
    p.add(el('text', {
      x: 158, y: 348, 'font-size': 19, fill: T.d1,
      'font-family': 'ui-monospace, monospace', opacity: 0.8
    }, '48 x 61 = 2,928 px'));
    /* 페이지 휘어짐 */
    p.rect(126, 28, 470, 376, p.lg([[0, T.k, 0.14], [0.2, T.k, 0], [0.9, T.k, 0], [1, T.k, 0.18]], { x1: 0, x2: 1, y2: 0 }));
    p.finish(0.25, 0.12);
  };

  /* 17 놀이터 — 가로등 하나 */
  SCENE[17] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d2], [0.6, T.d1], [1, T.k]]));
    /* 등이 만드는 바닥 빛 */
    p.ell(150, 330, 330, 150, p.rg([[0, T.l1, 0.5], [1, T.k, 0]]), { filter: 'url(#f-b22)' });
    p.poly('0,272 720,252 720,432 0,432', p.lg([[0, T.m1, 0.9], [1, T.k, 1]]));
    p.rect(0, 252, W, 180, T.d3, { filter: 'url(#f-rough)', opacity: 0.28 });
    p.lamp(150, 60, 18, T.ww, 1.15);
    p.rect(147, 74, 6, 208, p.lg([[0, T.m3], [1, T.d1]], { x2: 1, y2: 0 }));
    /* 벤치 — 등 쪽 모서리에 림 라이트 */
    var bench =
      el('rect', { x: 390, y: 232, width: 238, height: 15, rx: 4, fill: p.lg([[0, T.m2], [1, T.k]]) }) +
      el('rect', { x: 390, y: 232, width: 238, height: 3, rx: 2, fill: T.l2, opacity: 0.5 }) +
      el('rect', { x: 390, y: 196, width: 238, height: 13, rx: 4, fill: p.lg([[0, T.m1], [1, T.k]]) }) +
      el('rect', { x: 390, y: 196, width: 238, height: 2.6, rx: 2, fill: T.l1, opacity: 0.4 }) +
      el('rect', { x: 406, y: 247, width: 13, height: 46, fill: T.k }) +
      el('rect', { x: 600, y: 247, width: 13, height: 46, fill: T.k });
    p.g(bench);
    /* 긴 그림자 — 멀어질수록 번진다 */
    p.g(
      el('polygon', { points: '406,293 232,412 268,420 424,295', fill: T.k, opacity: 0.5 }) +
      el('polygon', { points: '600,293 452,414 486,422 616,295', fill: T.k, opacity: 0.45 }),
      { filter: 'url(#f-b5)' }
    );
    p.g(el('polygon', { points: '150,282 126,432 176,432 154,284', fill: T.k, opacity: 0.55 }),
      { filter: 'url(#f-b5)' });
    p.finish(0.28, 0.16);
  };

  /* 18 마지막 대화 */
  SCENE[18] = function (p) {
    p.screen();
    p.glowText(74, 82, [
      ['> 당신은 누구입니까', T.l1],
      ['', null],
      ['  나는 서동명이다.', T.w],
      ['', null],
      ['> 아닙니다', T.l1],
      ['', null],
      ['  내가 아니면 너는', T.w],
      ['  지금 누구랑', T.w],
      ['  얘기하고 있는 거냐.', T.w]
    ], 21, 36, T.l1);
    p.rect(74, 372, 14, 22, T.w, { opacity: 0.5, filter: 'url(#f-b5)' });
    p.rect(74, 372, 14, 22, T.ww, { opacity: 0.9 });
    p.finish(0.28, 0.1);
  };

  /* 19 손실 함수 — 더 내려가지 않는다 */
  SCENE[19] = function (p) {
    p.screen();
    for (var i = 1; i < 5; i++) p.line(92, 358 - i * 64, 648, 358 - i * 64, T.m1, 1, { opacity: 0.3 });
    p.line(92, 358, 648, 358, T.m2, 1.6, { opacity: 0.7 });
    p.line(92, 358, 92, 56, T.m2, 1.6, { opacity: 0.7 });
    var d = 'M 104 82 C 170 176 240 250 330 288 S 500 312 640 314';
    p.path(d, { stroke: T.w, 'stroke-width': 9, opacity: 0.35, filter: 'url(#f-b5)' });
    p.path(d, { stroke: T.ww, 'stroke-width': 2.6, opacity: 0.95 });
    p.text(104, 52, 'loss', 19, T.l2);
    p.finish(0.28, 0.1);
  };

  /* 20 스물세 명 — 뒤에서 본 객석 */
  SCENE[20] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d2], [0.5, T.d1], [1, T.k]]));
    /* 앞쪽의 밝은 벽 — 뒤통수에 림 라이트를 준다 */
    p.rect(120, 34, 480, 116, p.lg([[0, T.l4], [1, T.m2]]), { rx: 2 });
    p.rect(120, 34, 480, 116, p.rg([[0, T.ww, 0.4], [1, T.ww, 0]], { cx: '50%', cy: '40%' }));
    p.ell(360, 150, 300, 60, p.rg([[0, T.l1, 0.28], [1, T.k, 0]]), { filter: 'url(#f-b22)' });
    /* 다섯 줄, 줄마다 여섯 자리. 뒤로 갈수록 크고 선명하다 */
    var empty = { 2: 1, 9: 1, 14: 1, 19: 1, 23: 1, 27: 1, 29: 1 };
    var n = 0;
    for (var row = 0; row < 5; row++) {
      var y = 178 + row * 54, sc = 0.72 + row * 0.14, blur = row < 2 ? 2 : 0;
      var rowStr = '';
      for (var col = 0; col < 6; col++) {
        var x = 108 + col * 84 + (row % 2) * 18 + 24;
        if (!empty[n]) {
          var hr = 21 * sc;
          rowStr += el('path', {
            d: 'M ' + (x - hr * 2.1) + ' ' + (y + hr * 2.4) +
               ' C ' + (x - hr * 1.9) + ' ' + (y + hr * 0.5) + ' ' + (x - hr * 1.15) + ' ' + (y + hr * 0.1) + ' ' + (x - hr) + ' ' + y +
               ' L ' + (x + hr) + ' ' + y +
               ' C ' + (x + hr * 1.15) + ' ' + (y + hr * 0.1) + ' ' + (x + hr * 1.9) + ' ' + (y + hr * 0.5) + ' ' + (x + hr * 2.1) + ' ' + (y + hr * 2.4) + ' Z',
            fill: p.lg([[0, T.m1], [1, T.k]])
          });
          rowStr += el('circle', { cx: x, cy: y - hr * 0.62, r: hr, fill: p.lg([[0, T.m2], [1, T.d1]]) });
          /* 앞 벽에서 오는 림 라이트 */
          rowStr += el('path', {
            d: 'M ' + (x - hr * 0.9) + ' ' + (y - hr * 1.2) + ' A ' + hr + ' ' + hr + ' 0 0 1 ' + (x + hr * 0.9) + ' ' + (y - hr * 1.2),
            fill: 'none', stroke: T.l3, 'stroke-width': 1.8 * sc, opacity: 0.5
          });
        }
        n++;
      }
      p.g(rowStr, blur ? { filter: 'url(#f-b' + blur + ')' } : {});
    }
    p.finish(0.3, 0.14);
  };

  /* 21 절판 — 쌓인 책과 떨어지는 조각 */
  SCENE[21] = function (p) {
    p.rect(0, 0, W, H, p.rg([[0, T.m1], [1, T.k]], { cx: '20%', cy: '12%', r: '106%' }));
    p.rect(0, 356, W, 76, p.lg([[0, T.d2, 0.7], [1, T.k, 1]]));
    /* 책 여덟 권 — 두께와 기울기를 다르게 */
    var specs = [[68, 372, 268, 30, 0], [74, 340, 252, 26, -1.4], [66, 312, 274, 24, 0.8],
                 [80, 286, 240, 22, 0], [70, 258, 262, 26, -2.2], [78, 232, 246, 22, 1.2],
                 [72, 206, 258, 24, 0], [84, 182, 232, 20, -1.6]];
    specs.forEach(function (b, i) {
      var x = b[0], y = b[1], w = b[2], h = b[3], rot = b[4];
      var cover = h * 0.2;
      var book =
        el('rect', { x: x, y: y, width: w, height: cover, fill: p.lg([[0, T.m2], [1, T.d1]]) }) +
        el('rect', { x: x + 4, y: y + cover, width: w - 8, height: h - cover * 2,
          fill: p.lg([[0, T.l4], [0.35, T.l1], [1, T.m1]], { x1: 1, x2: 0, y2: 0 }), opacity: 0.9 - i * 0.03 }) +
        el('rect', { x: x, y: y + h - cover, width: w, height: cover, fill: p.lg([[0, T.d2], [1, T.k]]) }) +
        el('path', { d: 'M ' + x + ' ' + y + ' Q ' + (x - 7) + ' ' + (y + h / 2) + ' ' + x + ' ' + (y + h) + ' Z',
          fill: p.lg([[0, T.m1], [1, T.k]]) }) +
        el('rect', { x: x, y: y, width: w, height: 1.6, fill: T.l2, opacity: 0.34 });
      p.g(book, rot ? { transform: 'rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')' } : {});
      p.rect(x - 5, y + h, w + 10, 8, T.k, { opacity: 0.42, filter: 'url(#f-b2)' });
    });
    /* 파쇄기 입구 */
    p.rect(452, 334, 232, 74, p.lg([[0, T.d3], [1, T.k]]), { rx: 5 });
    p.rect(470, 348, 196, 14, T.k, { opacity: 0.95, rx: 2 });
    p.spec(556, 344, 96, 4, 0.24, 2);
    /* 떨어지는 조각 */
    var flakes = '';
    [40, 88, 124, 164, 202, 240, 274, 306, 326].forEach(function (y, i) {
      var x = 500 + ((i * 53) % 130) - 24;
      flakes += el('rect', {
        x: x, y: y, width: 34, height: 7, rx: 1, fill: T.l3,
        opacity: 0.66 - i * 0.05,
        transform: 'rotate(' + ((i * 41) % 70 - 35) + ' ' + (x + 17) + ' ' + (y + 3) + ')'
      });
    });
    p.g(flakes, { filter: 'url(#f-b2)' });
    p.finish(0.28, 0.14);
  };

  /* 22 삭제 — total 0 */
  SCENE[22] = function (p) {
    p.screen();
    p.glowText(74, 88, [
      ['$ ls -la checkpoints/', T.l1],
      ['dad_v1  dad_v2  dad_v3', T.m3],
      ['dad_v10  dad_v11  dad_v12', T.m3],
      ['', null],
      ['$ rm -r checkpoints/', T.w],
      ['', null],
      ['$ ls -la checkpoints/', T.l1],
      ['total 0', T.ww]
    ], 22, 38, T.l1);
    p.rect(74, 374, 14, 22, T.w, { opacity: 0.5, filter: 'url(#f-b5)' });
    p.rect(74, 374, 14, 22, T.ww, { opacity: 0.92 });
    p.finish(0.28, 0.1);
  };

  /* 23 닷징 — 인화지 위에서 빛을 가리는 도구 */
  SCENE[23] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d1], [1, T.k]]));
    /* 확대기에서 내려오는 빛 (먼지가 보인다) */
    p.poly('320,0 400,0 664,336 56,336', p.lg([[0, T.ww, 0.16], [1, T.ww, 0.03]]),
      { filter: 'url(#f-b22)' });
    /* 이젤 위 인화지 */
    p.rect(92, 244, 536, 172, p.rg([[0, T.ww], [1, T.l2]], { cx: '48%', cy: '30%', r: '78%' }), { rx: 2 });
    /* 인화되고 있는 상 */
    p.rect(128, 264, 464, 132, p.lg([[0, T.l1], [0.45, T.m2], [1, T.d2]]), { opacity: 0.85 });
    p.line(128, 318, 592, 318, T.ww, 2, { opacity: 0.45 });
    /* 도구의 반음영 그림자 */
    p.ell(352, 338, 96, 34, T.k, { opacity: 0.5, filter: 'url(#f-b10)' });
    p.ell(352, 336, 52, 19, T.k, { opacity: 0.4, filter: 'url(#f-b5)' });
    /* 철사와 원판 */
    p.rect(296, 0, 112, 46, p.lg([[0, T.m1], [1, T.k]]), { rx: 4 });
    p.rect(316, 46, 72, 14, p.lg([[0, T.d2], [1, T.k]]));
    p.line(352, 60, 352, 166, T.m2, 3, { opacity: 0.9 });
    p.circ(352, 190, 40, p.rg([[0, T.m1], [1, T.k]], { cx: '36%', cy: '30%' }));
    p.spec(338, 178, 15, 8, 0.22, 2);
    p.finish(0.28, 0.13);
  };

  /* 24 창 — 사백 미터 아래의 삼각대 */
  SCENE[24] = function (p) {
    p.rect(0, 0, W, H, T.k);
    /* 창밖 풍경 */
    p.rect(104, 30, 512, 358, p.lg([[0, T.m2], [0.38, T.l4], [0.42, T.l2], [1, T.d2]]));
    p.g(el('polygon', {
      points: '104,168 250,140 400,126 512,148 616,134 616,186 104,186',
      fill: T.m3, opacity: 0.55
    }), { filter: 'url(#f-b5)' });
    p.rect(104, 150, 512, 44, T.ww, { filter: 'url(#f-fog)', opacity: 0.5 });
    p.rect(104, 182, 512, 206, p.lg([[0, T.l1], [0.3, T.m1], [1, T.d1]]));
    var st = '';
    for (var i = 0; i < 18; i++) {
      var yy = 190 + Math.pow(i / 18, 1.6) * 190;
      st += el('line', { x1: 110 + i * 6, y1: yy, x2: 610 - i * 8, y2: yy, stroke: T.l4, 'stroke-width': 1.4, opacity: 0.2 - i * 0.008 });
    }
    p.g(st, { filter: 'url(#f-ripple-soft)' });
    p.rect(104, 182, 512, 20, T.ww, { opacity: 0.3, filter: 'url(#f-b5)' });
    /* 둑과 삼각대 */
    p.poly('104,342 616,330 616,388 104,388', p.lg([[0, T.d2], [1, T.k]]));
    p.g(
      el('line', { x1: 300, y1: 300, x2: 300, y2: 344, stroke: T.d1, 'stroke-width': 3 }) +
      el('line', { x1: 300, y1: 344, x2: 284, y2: 366, stroke: T.d1, 'stroke-width': 3 }) +
      el('line', { x1: 300, y1: 344, x2: 316, y2: 366, stroke: T.d1, 'stroke-width': 3 }) +
      el('rect', { x: 289, y: 288, width: 22, height: 14, rx: 2, fill: T.d1 })
    );
    /* 창틀 — 앞이라 살짝 흐리다 (근거리 심도) */
    p.g(
      el('rect', { x: 96, y: 22, width: 528, height: 374, fill: 'none', stroke: T.k, 'stroke-width': 14 }) +
      el('line', { x1: 360, y1: 30, x2: 360, y2: 388, stroke: T.k, 'stroke-width': 7 }) +
      el('line', { x1: 104, y1: 200, x2: 616, y2: 200, stroke: T.k, 'stroke-width': 6 }),
      { filter: 'url(#f-b2)' }
    );
    /* 유리의 먼지와 반사 */
    p.rect(104, 30, 512, 358, p.lg([[0, T.ww, 0.1], [0.45, T.ww, 0], [1, T.ww, 0.04]], { x1: 0, y1: 0, x2: 1, y2: 1 }));
    p.finish(0.28, 0.15);
  };

  /* 25 수세 — 흐르는 물 속의 인화지 */
  SCENE[25] = function (p) {
    p.rect(0, 0, W, H, p.lg([[0, T.d2], [1, T.k]]));
    /* 트레이 */
    p.rect(44, 58, 632, 314, p.lg([[0, T.m2], [1, T.d1]]), { rx: 12 });
    p.rect(56, 70, 608, 290, p.lg([[0, T.m1], [0.5, T.d2], [1, T.d1]]), { rx: 8 });
    p.rect(56, 70, 608, 290, 'none', { stroke: T.l2, 'stroke-width': 2, opacity: 0.3, rx: 8 });
    /* 인화지 아래 그림자 (물 속) */
    p.shadow(372, 232, 176, 100, 0.5, 10);
    /* 잠긴 인화지 — 왜곡 없이 선명하게. 안에 사진이 보인다 */
    p.g(
      el('rect', { x: 192, y: 118, width: 336, height: 194, rx: 1, fill: T.l4 }) +
      el('rect', { x: 200, y: 126, width: 320, height: 82,
        fill: p.lg([[0, T.m3], [1, T.l4]]) }) +
      el('rect', { x: 200, y: 208, width: 320, height: 96,
        fill: p.lg([[0, T.m2], [0.4, T.m1], [1, T.d2]]) }) +
      el('line', { x1: 200, y1: 208, x2: 520, y2: 208, stroke: T.ww, 'stroke-width': 1.8, opacity: 0.7 }) +
      el('rect', { x: 200, y: 208, width: 320, height: 8, fill: T.ww, opacity: 0.14 }),
      { transform: 'rotate(-2.4 360 215)' }
    );
    /* 인화지 위를 덮은 물층 — 얇고 차갑게 */
    p.rect(56, 70, 608, 290, p.lg([[0, T.l1, 0.12], [1, T.d1, 0.26]]), { rx: 8 });
    /* 수면 물결(코스틱) — 위에만 얹는다 */
    var rip = '';
    for (var i = 0; i < 4; i++) {
      rip += el('path', {
        d: 'M 64 ' + (104 + i * 74) + ' Q 236 ' + (84 + i * 74) + ' 396 ' + (106 + i * 74) +
           ' T 660 ' + (92 + i * 74),
        fill: 'none', stroke: T.ww, 'stroke-width': 2.4, opacity: 0.2 - i * 0.035
      });
    }
    p.g(rip, { filter: 'url(#f-b2)' });
    /* 물이 들어오는 쪽 */
    p.rect(556, 58, 120, 314, p.lg([[0, T.ww, 0.24], [1, T.ww, 0]], { x1: 1, x2: 0, y2: 0 }),
      { filter: 'url(#f-b10)' });
    p.spec(618, 130, 34, 96, 0.2, 10);
    p.finish(0.26, 0.13);
  };

  /* ---------------- 캡션 ---------------- */
  var CAP = {
    1: '미현상 — 상이 아직 잠들어 있는 필름',
    2: '암실. 안전등 아래에서 마르는 필름',
    3: '라벨이 없는 카세트',
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
    17: '십이월의 놀이터. 가로등이 만든 그림자',
    18: '마지막 대화 · 2026. 12. 5. 새벽 세 시 사십 분',
    19: '더 내려가지 않는 손실 함수',
    20: '합정동. 의자 서른 개 가운데 스물세 개',
    21: '파주. 삼만 이천 부가 팔 밀리미터로 나뉘던 날',
    22: 'rm -r checkpoints/ · 백사십 기가바이트 · 십일 초',
    23: '닷징 — 인화지의 한 부분에만 빛을 덜 준다',
    24: '2027. 8. 12. 이 층 왼쪽에서 세 번째 창 · 사백 미터',
    25: '수세. 이십 분 동안 흐르는 물에 씻는다'
  };

  var PHOTOS = {};
  Object.keys(SCENE).forEach(function (no) {
    var p = new Photo(no);
    SCENE[no](p);
    PHOTOS[no] = { svg: p.out(), caption: CAP[no] || '' };
  });

  window.PHOTOS = PHOTOS;
})();
