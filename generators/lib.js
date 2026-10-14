(function () {
  'use strict';

  /* ─────────── Реестр генераторов ─────────── */

  function register(id, def) {
    window.ExampleGenerators = window.ExampleGenerators || {};
    window.ExampleGenerators[id] = def;
    return def;
  }

  /* ─────────── Случайные числа и выбор ─────────── */

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

  /* ─────────── Теория чисел ─────────── */

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

  /* ─────────── Форматирование ─────────── */

  function signChar(n) {
    return n < 0 ? '(−' + Math.abs(n) + ')' : String(n);
  }

  function formatSigned(n) {
    return n < 0 ? '−' + Math.abs(n) : String(n);
  }

  /* ─────────── Нормализация и разбор ответа ─────────── */

  /* Приводит разные минусы к «-», убирает пробелы.
     Опции:
       dropMultiplication — если true, знаки × · * удаляются (для ответов
                            вида «3(2+3)», где «3*(2+3)» эквивалентно «3(2+3)»).
                            По умолчанию false — знаки умножения сохраняются. */
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

  /* ─────────── Помощники для фаз ─────────── */

  /* generate, который выдаёт ровно total задач, затем null. */
  function sequential(total, producer) {
    var i = 0;
    return function () {
      if (i >= total) return null;
      return producer(i++);
    };
  }

  /* generate для слайдов ознакомления.
     items — массив { title, text }. Каждый слайд оборачивается в example. */
  function slides(items) {
    var i = 0;
    return function () {
      if (i >= items.length) return null;
      var s = items[i++];
      var out = { answer: null, key: 'slide-' + i };
      for (var k in s) {
        if (s.hasOwnProperty(k)) out[k] = s[k];
      }
      return out;
    };
  }

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

  function answerAsIs(ex) { return ex.answer; }

  /* ─────────── Экспорт ─────────── */

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

    sequential:         sequential,
    slides:             slides,
    answerAsIs:         answerAsIs,

    checkSingleChoice:  checkSingleChoice,
    singleChoicePanel:  singleChoicePanel,
    formatSingleChoice: formatSingleChoice
  };

})();