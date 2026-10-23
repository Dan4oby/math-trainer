(function () {
  'use strict';

  /* ─────────── регистрация генераторов ─────────── */

  function register(id, def) {
    /* присваиваем ключи фазам, у которых их нет */
    if (def && Array.isArray(def.phases)) {
      for (var i = 0; i < def.phases.length; i++) {
        if (!def.phases[i].key) def.phases[i].key = 'phase-' + i;
      }
    }
    window.ExampleGenerators = window.ExampleGenerators || {};
    window.ExampleGenerators[id] = def;
    return def;
  }

  /* ─────────── случайные числа ─────────── */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* Перекос в сторону max: power < 1 смещает к max, power > 1 — к min. */
  function randIntHard(min, max, power) {
    power = power == null ? 0.6 : power;
    var r = Math.pow(Math.random(), power);
    return Math.floor(r * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  /* Взвешенный выбор: items = [[значение, вес], ...] */
  function pickWeighted(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) total += items[i][1];
    var r = Math.random() * total;
    for (var j = 0; j < items.length; j++) {
      r -= items[j][1];
      if (r < 0) return items[j][0];
    }
    return items[items.length - 1][0];
  }

  /* ─────────── теория чисел ─────────── */

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a || 1;
  }

  function gcdAll(arr) {
    var g = 0;
    for (var i = 0; i < arr.length; i++) g = gcd(g, arr[i]);
    return g;
  }

  function isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (var i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  function factorize(n) {
    var result = [];
    var d = 2;
    while (d * d <= n) {
      while (n % d === 0) {
        result.push(d);
        n /= d;
      }
      d++;
    }
    if (n > 1) result.push(n);
    return result;
  }

  function smallestFactorPair(n) {
    for (var d = 2; d * d <= n; d++) {
      if (n % d === 0) return [d, n / d];
    }
    return null;
  }

  function randomComposite(max) {
    var n;
    do {
      n = randInt(4, max);
    } while (isPrime(n));
    return n;
  }

  /* ─────────── форматирование ─────────── */

  function signChar(n) {
    return n < 0 ? '(−' + Math.abs(n) + ')' : String(n);
  }

  function formatSigned(n) {
    return n < 0 ? '−' + Math.abs(n) : String(n);
  }

  /* ─────────── разбор ответа ─────────── */

  function normalize(s, options) {
    options = options || {};
    var out = String(s)
      .replace(/\s+/g, '')
      .replace(/[−–—]/g, '-');
    if (options.dropMultiplication) out = out.replace(/[×·*]/g, '');
    return out;
  }

  function parseFactors(s, separators) {
    if (!s) return null;
    var sepRegex = separators ? new RegExp('[' + separators + ']') : /[×·*]/;
    var cleaned = String(s).replace(/\s+/g, '');
    var parts = cleaned.split(sepRegex);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^\d+$/.test(parts[i])) return null;
      var v = parseInt(parts[i], 10);
      if (!isFinite(v)) return null;
      out.push(v);
    }
    return out.length ? out : null;
  }

  function parseSignedTerms(s) {
    if (!s) return null;
    var cleaned = String(s)
      .replace(/\s+/g, '')
      .replace(/[−–—]/g, '-');

    if (!/^[+\-]?\d+([+\-]\d+)*$/.test(cleaned)) return null;

    var out = [];
    var m = /^([+\-]?)(\d+)/.exec(cleaned);
    if (!m) return null;
    out.push((m[1] === '-' ? -1 : 1) * parseInt(m[2], 10));

    var i = m[0].length;
    while (i < cleaned.length) {
      var mm = /^([+\-])(\d+)/.exec(cleaned.slice(i));
      if (!mm) return null;
      out.push((mm[1] === '-' ? -1 : 1) * parseInt(mm[2], 10));
      i += mm[0].length;
    }
    return out;
  }

  /* ─────────── помощники для generate ─────────── */

  /* Идёт по массиву строго по порядку, пока элементы не кончатся.
     mapper(item, index) превращает элемент в объект примера. */
  function fromArray(items, mapper) {
    var i = 0;
    return function () {
      if (i >= items.length) return null;
      return mapper(items[i], i++);
    };
  }

  /* Слайды ознакомления. Принимает массив объектов { title, text, svg?, ... }
     и пропускает через себя все поля слайда, кроме служебных. */
  function slides(items) {
    var i = 0;
    return function () {
      if (i >= items.length) return null;
      var s = items[i++];
      var out = { answer: null, key: 'slide-' + i };
      for (var k in s) {
        if (Object.prototype.hasOwnProperty.call(s, k)) out[k] = s[k];
      }
      return out;
    };
  }

  function answerAsIs(ex) { return ex.answer; }

  /* ─────────── single choice ─────────── */

  function checkSingleChoice(collected, ex) {
    var chosen = null;
    for (var id in collected) {
      if (collected[id] === true) { chosen = id; break; }
    }

    if (chosen === null) {
      if (ex.userAnswerText == null) ex.userAnswerText = 'нет ответа';
      return { correct: false, expected: ex.options[ex.correct] };
    }

    var idx = parseInt(chosen.slice(3), 10);
    var ok  = idx === ex.correct;

    if (!ok && ex.userAnswerText == null) {
      ex.userAnswerText = ex.options[idx];
    }

    return { correct: ok, expected: ex.options[ex.correct] };
  }

  function singleChoicePanel(ex) {
    return [
      ex.options.map(function (label, i) {
        return {
          type:  'checkbox',
          id:    'opt' + i,
          label: label,
          group: 'answer'
        };
      })
    ];
  }

  function formatSingleChoice(ex) {
    return ex.options[ex.correct];
  }

  /* ─────────── фабрики фаз ─────────── */

  /* Фаза-вопрос с одним правильным вариантом.
     opts: {
       title,
       key?, hint?, progress?, label?,
       total?,
       generate      — функция, возвращающая объект вопроса, ИЛИ
       questions     — массив объектов вопросов, ИЛИ
       question      — один объект вопроса
     }
     Объект вопроса: { text, options, correct } */
  function singleChoicePhase(opts) {
    var generate = opts.generate;

    if (!generate) {
      var list = opts.questions ||
                 (opts.question ? [opts.question] : []);

      /* замораживаем ссылку и делаем пошаговый итератор */
      generate = (function (items) {
        var i = 0;
        return function () {
          if (i >= items.length) return null;
          return items[i++];
        };
      })(list);
    }

    var total = opts.total;
    if (total == null) {
      if (opts.questions)      total = opts.questions.length;
      else if (opts.question)  total = 1;
      else                     total = 1;
    }

    return {
      key:          opts.key,
      label:        opts.label || 'Вопрос',
      title:        opts.title,
      intro:        opts.intro,
      total:        total,
      strictOrder:  opts.strictOrder, 
      wrongAction:  opts.wrongAction,
      progress:     opts.progress || 'group',
      hint:         opts.hint,
      top:          [{ type: 'example-string', class: 'question' }],
      bottom:       singleChoicePanel,
      generate:     generate,
      check:        checkSingleChoice,
      formatAnswer: formatSingleChoice
    };
  }

  /* Фаза ознакомления со слайдами.
     opts: { key, slides, label?, title?, progress? }
     Каждый слайд — { title, text, svg? } */
  function infoPhase(opts) {
    return {
      key:      opts.key,
      kind:     'info',
      label:    opts.label || 'Ознакомление',
      title:    opts.title || opts.label || 'Ознакомление',
      intro:    opts.intro,
      total:    opts.slides.length,
      progress: opts.progress || 'group',
      top:      [{ type: 'info-slide' }],
      generate: slides(opts.slides)
    };
  }

  /* То же, но с SVG-картинкой под текстом слайда. */
  function svgInfoPhase(opts) {
    var p = infoPhase(opts);
    p.top = [{ type: 'info-slide' }, { type: 'svg' }];
    return p;
  }

    /* Фаза-задание с SVG-иллюстрацией над полем ввода.
     opts: {
       title,
       key?, label?, hint?, progress?, total?,
       questions     — массив объектов вопроса, ИЛИ
       question      — один объект, ИЛИ
       generate      — функция, возвращающая объект,
       bottom?       — описание нижней панели (по умолчанию singleChoicePanel),
       check?        — функция проверки (по умолчанию checkSingleChoice),
       formatAnswer? — как показать верный ответ (по умолчанию formatSingleChoice)
     }
     Каждый вопрос — { text, svg, ...свои поля }.
     Формат ответа зависит от выбранных bottom/check. */
  function svgTaskPhase(opts) {
    var generate = opts.generate;

    if (!generate) {
      var list = opts.questions ||
                 (opts.question ? [opts.question] : []);

      generate = (function (items) {
        var i = 0;
        return function () {
          if (i >= items.length) return null;
          return items[i++];
        };
      })(list);
    }

    var total = opts.total;
    if (total == null) {
      if (opts.questions)     total = opts.questions.length;
      else if (opts.question) total = 1;
      else                    total = 1;
    }

    return {
      key:          opts.key,
      label:        opts.label || 'Вопрос',
      title:        opts.title,
      total:        total,
      wrongAction:  opts.wrongAction,
      progress:     opts.progress || 'group',
      hint:         opts.hint,
      top: [
        { type: 'example-string', class: 'question' },
        { type: 'svg' }
      ],
      bottom:       opts.bottom       || singleChoicePanel,
      generate:     generate,
      check:        opts.check        || checkSingleChoice,
      formatAnswer: opts.formatAnswer || formatSingleChoice
    };
  }
  /* ─────────── экспорт ─────────── */

  window.GeneratorLib = {
    register:           register,

    randInt:            randInt,
    randIntHard:        randIntHard,
    pick:               pick,
    pickWeighted:       pickWeighted,

    gcd:                gcd,
    gcdAll:             gcdAll,
    isPrime:            isPrime,
    factorize:          factorize,
    smallestFactorPair: smallestFactorPair,
    randomComposite:    randomComposite,

    signChar:           signChar,
    formatSigned:       formatSigned,

    normalize:          normalize,
    parseFactors:       parseFactors,
    parseSignedTerms:   parseSignedTerms,

    fromArray:          fromArray,
    slides:             slides,
    answerAsIs:         answerAsIs,

    checkSingleChoice:  checkSingleChoice,
    singleChoicePanel:  singleChoicePanel,
    formatSingleChoice: formatSingleChoice,

    singleChoicePhase:  singleChoicePhase,
    infoPhase:          infoPhase,
    svgInfoPhase:       svgInfoPhase,
    svgTaskPhase:       svgTaskPhase
  };

})();