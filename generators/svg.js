(function () {
  'use strict';

  var DEFAULT_COLOR = '#7c3aed';
  var LINE_COLOR    = '#0f172a';
  var LABEL_COLOR   = '#0f172a';

  /* ─────────── утилиты ─────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function num(v) { return Number(v) || 0; }

  function attrs(obj) {
    var parts = [];
    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      if (obj[k] == null) continue;
      parts.push(k + '="' + esc(obj[k]) + '"');
    }
    return parts.join(' ');
  }

  /* Склеивает несколько «рисовальщиков» в один. */
  function compose(drawers) {
    return function (ctx) {
      var out = '';
      for (var i = 0; i < drawers.length; i++) {
        var d = drawers[i];
        if (typeof d === 'function') out += d(ctx);
        else if (d != null) out += String(d);
      }
      return out;
    };
  }

  /* ─────────── контекст (математика → пиксели) ─────────── */

  function makeCtx(opts) {
    var width   = num(opts.width)  || 600;
    var height  = num(opts.height) || 300;
    var unit    = num(opts.unit)   || 40;
    var originX = opts.originX != null ? num(opts.originX) : width  / 2;
    var originY = opts.originY != null ? num(opts.originY) : height / 2;
    var yUp     = opts.yUp !== false;   /* по умолчанию ось Y смотрит вверх, как в математике */

    return {
      width:   width,
      height:  height,
      unit:    unit,
      originX: originX,
      originY: originY,
      yUp:     yUp,
      x: function (mx) { return originX + mx * unit; },
      y: function (my) { return yUp ? originY - my * unit : originY + my * unit; }
    };
  }

  /* ─────────── примитивы ─────────── */
  /* Каждый примитив возвращает функцию(ctx) → строка SVG.
     Эти функции складываются в canvas.children и вызываются
     движком рисования с общим контекстом. */

  /* Отрезок прямой между двумя точками (в математических координатах). */
  function line(x1, y1, x2, y2, opts) {
    opts = opts || {};
    return function (ctx) {
      return '<line ' + attrs({
        x1: ctx.x(x1), y1: ctx.y(y1),
        x2: ctx.x(x2), y2: ctx.y(y2),
        stroke: opts.color || DEFAULT_COLOR,
        'stroke-width': opts.width || 2,
        'stroke-linecap': 'round',
        'stroke-dasharray': opts.dash || null
      }) + '/>';
    };
  }

  /* Текстовая метка в заданной точке. */
  function label(x, y, text, opts) {
    opts = opts || {};
    return function (ctx) {
      return '<text ' + attrs({
        x: ctx.x(x) + (opts.dx || 0),
        y: ctx.y(y) + (opts.dy || 0),
        'text-anchor': opts.anchor || 'middle',
        'font-size': opts.size || 16,
        'font-weight': opts.weight || 600,
        'font-family': 'inherit',
        fill: opts.color || LABEL_COLOR
      }) + '>' + esc(text) + '</text>';
    };
  }

  /* Точка. Опционально — с подписью. */
  function point(x, y, opts) {
    opts = opts || {};
    var drawers = [];

    drawers.push(function (ctx) {
      return '<circle ' + attrs({
        cx: ctx.x(x), cy: ctx.y(y),
        r: opts.radius || 5,
        fill: opts.color || DEFAULT_COLOR,
        stroke: opts.stroke || null,
        'stroke-width': opts.strokeWidth || null
      }) + '/>';
    });

    if (opts.label != null) {
      var r    = opts.radius || 5;
      var side = opts.labelSide || 'top';
      var pad  = r + 8;
      var dx = 0, dy = 0, anchor = 'middle';

      if (side === 'top')         { dy = -pad; }
      else if (side === 'bottom') { dy =  pad; }
      else if (side === 'left')   { dx = -pad; anchor = 'end'; }
      else if (side === 'right')  { dx =  pad; anchor = 'start'; }

      drawers.push(label(x, y, opts.label, {
        dx: dx + (opts.labelDx || 0),
        dy: dy + (opts.labelDy || 0),
        anchor: anchor,
        color:  opts.labelColor,
        size:   opts.labelSize
      }));
    }

    return compose(drawers);
  }

  /* Вектор — стрелка из (x1,y1) в (x2,y2). Опционально с подписью. */
  function vector(x1, y1, x2, y2, opts) {
    opts = opts || {};
    var drawers = [];

    var color = opts.color || DEFAULT_COLOR;
    var width = opts.width || 2.5;
    var head  = opts.headSize || 10;

    drawers.push(function (ctx) {
      var px1 = ctx.x(x1), py1 = ctx.y(y1);
      var px2 = ctx.x(x2), py2 = ctx.y(y2);

      var dx = px2 - px1, dy = py2 - py1;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return '';

      var ux = dx / len, uy = dy / len;

      /* конец линии слегка обрезаем, чтобы не торчал из-под стрелки */
      var lx2 = px2 - ux * head;
      var ly2 = py2 - uy * head;

      /* две боковые точки стрелки */
      var ax = lx2 + uy * head * 0.5, ay = ly2 - ux * head * 0.5;
      var bx = lx2 - uy * head * 0.5, by = ly2 + ux * head * 0.5;

      return '<line ' + attrs({
        x1: px1, y1: py1, x2: lx2, y2: ly2,
        stroke: color, 'stroke-width': width,
        'stroke-linecap': 'round'
      }) + '/>' +
      '<polygon ' + attrs({
        points: px2 + ',' + py2 + ' ' + ax + ',' + ay + ' ' + bx + ',' + by,
        fill: color
      }) + '/>';
    });

    if (opts.label != null) {
      var mx = (x1 + x2) / 2 + (opts.labelAtX != null ? opts.labelAtX - (x1 + x2) / 2 : 0);
      var my = (y1 + y2) / 2 + (opts.labelAtY != null ? opts.labelAtY - (y1 + y2) / 2 : 0);
      drawers.push(label(mx, my, opts.label, {
        dx: opts.labelDx != null ? opts.labelDx : 0,
        dy: opts.labelDy != null ? opts.labelDy : -14,
        anchor: opts.labelAnchor || 'middle',
        color:  opts.labelColor,
        size:   opts.labelSize
      }));
    }

    return compose(drawers);
  }

  /* Координатная прямая с делениями и подписями. */
  function numberLine(opts) {
    opts = opts || {};
    var from        = opts.from      != null ? opts.from      : -10;
    var to          = opts.to        != null ? opts.to        :  10;
    var yLine       = opts.y         != null ? opts.y         :  0;
    var tickStep    = opts.tickStep  || 1;
    var labelStep   = opts.labelStep || tickStep;
    var color       = opts.color     || LINE_COLOR;
    var tickSize    = opts.tickSize  || 8;
    var labelSize   = opts.labelSize || 14;
    var labelsAbove = !!opts.labelsAbove;
    var showZero    = opts.showZero !== false;
    var arrow       = opts.arrow || 'right';   /* false | 'right' | 'both' */
    var leftArrow   = arrow === 'both';
    var rightArrow  = arrow === 'right' || arrow === 'both';

    return function (ctx) {
      var out = '';
      var yPx = ctx.y(yLine);

      /* основная линия, с запасом под стрелки */
      var xL = ctx.x(from) - (leftArrow  ? 12 : 0);
      var xR = ctx.x(to)   + (rightArrow ? 12 : 0);

      out += '<line ' + attrs({
        x1: xL, y1: yPx, x2: xR, y2: yPx,
        stroke: color, 'stroke-width': 2,
        'stroke-linecap': 'round'
      }) + '/>';

      /* стрелки */
      var head = 7;
      if (rightArrow) {
        out += '<polygon ' + attrs({
          points: xR + ',' + yPx + ' ' +
                  (xR - head) + ',' + (yPx - head / 1.4) + ' ' +
                  (xR - head) + ',' + (yPx + head / 1.4),
          fill: color
        }) + '/>';
      }
      if (leftArrow) {
        out += '<polygon ' + attrs({
          points: xL + ',' + yPx + ' ' +
                  (xL + head) + ',' + (yPx - head / 1.4) + ' ' +
                  (xL + head) + ',' + (yPx + head / 1.4),
          fill: color
        }) + '/>';
      }

      /* деления и подписи */
      for (var v = from; v <= to + 1e-9; v += tickStep) {
        var rounded = Math.round(v * 1e6) / 1e6;
        var px = ctx.x(rounded);

        out += '<line ' + attrs({
          x1: px, y1: yPx - tickSize / 2,
          x2: px, y2: yPx + tickSize / 2,
          stroke: color, 'stroke-width': 1.5,
          'stroke-linecap': 'round'
        }) + '/>';

        var mod = Math.abs(rounded % labelStep);
        if (mod < 1e-6 || Math.abs(mod - labelStep) < 1e-6) {
          if (!showZero && Math.abs(rounded) < 1e-6) continue;

          var ly = labelsAbove
            ? yPx - tickSize / 2 - 6
            : yPx + tickSize / 2 + labelSize;

          out += '<text ' + attrs({
            x: px, y: ly,
            'text-anchor': 'middle',
            'font-size': labelSize,
            'font-weight': 600,
            'font-family': 'inherit',
            fill: color
          }) + '>' + esc(rounded) + '</text>';
        }
      }

      return out;
    };
  }

  /* ─────────── canvas ─────────── */

  function canvas(opts) {
    opts = opts || {};
    var ctx = makeCtx(opts);
    var children = (opts.children || [])
      .map(function (c) { return typeof c === 'function' ? c(ctx) : String(c); })
      .join('');

    return '<svg ' + attrs({
      viewBox: '0 0 ' + ctx.width + ' ' + ctx.height,
      preserveAspectRatio: 'xMidYMid meet',
      class: opts.className || null,
      xmlns: 'http://www.w3.org/2000/svg'
    }) + '>' + children + '</svg>';
  }

  /* Иллюстрация «перемещение по числовой прямой»: от точки x1 к точке x2.
   opts: {
     from, to,           // координаты на прямой
     labelFrom, labelTo, // подписи под точками (необязательно)
     arrow,              // подпись над стрелкой (необязательно)
     range: [min, max],  // диапазон прямой (по умолчанию -4..5)
     width, height, unit // размеры холста (по умолчанию 500/160/40)
   } */
  function numberLineMove(opts) {
    opts = opts || {};
    var range = opts.range || [-4, 5];
    var width  = opts.width  || 500;
    var height = opts.height || 160;
    var unit   = opts.unit   || 40;
    return canvas({
      width: width, height: height, unit: unit,
      originY: height - 60,
      children: [
        numberLine({ from: range[0], to: range[1], arrow: 'right', labelSize: 14 }),
        point(opts.from, 0, { color: '#2563eb', label: opts.labelFrom, labelSide: 'top' }),
        point(opts.to,   0, { color: '#16a34a', label: opts.labelTo,   labelSide: 'top' }),
        vector(opts.from, 0, opts.to, 0, {
          color: '#ef4444', label: opts.arrow, labelDy: -28
        })
      ]
    });
  }
  /* ─────────── экспорт ─────────── */

  window.Svg = {
    canvas:         canvas,
    numberLine:     numberLine,
    point:          point,
    vector:         vector,
    line:           line,
    label:          label,
    numberLineMove: numberLineMove
  };

})();