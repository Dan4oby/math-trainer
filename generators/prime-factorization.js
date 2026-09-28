(function () {
  'use strict';

  var MAX_VALUE    = 200;   // потолок для разлагаемых чисел
  var PAIRS_TOTAL  = 12;    // верных ответов на фазе «пара множителей»
  var PRIMES_TOTAL = 9;     // верных ответов на фазе «простые множители»

  /* ─────────── утилиты ─────────── */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

  /* Все простые множители числа (по возрастанию). */
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

  /* Минимальная нетривиальная пара множителей: [d, n/d], где d — самое
     маленькое число ≥ 2, делящее n. Для составных чисел всегда находится. */
  function smallestFactorPair(n) {
    for (var d = 2; d * d <= n; d++) {
      if (n % d === 0) return [d, n / d];
    }
    return null;
  }

  /* Случайное составное число из [4, MAX_VALUE]. */
  function randomComposite() {
    var n;
    do {
      n = randInt(4, MAX_VALUE);
    } while (isPrime(n));
    return n;
  }

  /* Принимает строку вида «2×2×3», «2*2*3», «2 · 2 · 3»,
     возвращает массив целых чисел или null, если формат неверен. */
  function parseFactors(s) {
    if (!s) return null;
    var cleaned = String(s).replace(/\s+/g, '');
    var parts = cleaned.split(/[×·*]/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^\d+$/.test(parts[i])) return null;
      var v = parseInt(parts[i], 10);
      if (!isFinite(v)) return null;
      out.push(v);
    }
    return out.length ? out : null;
  }

  /* ─────────── регистрация ─────────── */

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.primeFactorization = {
    id:   'primeFactorization',
    name: 'Разложение на множители',

    rules: [
      '✍️ Сначала разложи число на любые два множителя',
      '🔢 Затем — на простые множители',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],

    phases: [

      /* ────────── Фаза 0: ознакомление ────────── */
      {
        key:   'intro',
        kind:  'info',
        label: 'Ознакомление',
        title: 'Разложение на множители',
        total: 3,
        hint:  '',

        top: [{ type: 'example-string', class: 'question' }],

        generate: (function () {
          var slides = [
            { text:
              'Что такое множители<br>' +
              'Множители — это числа, которые при перемножении дают исходное число.<br>' +
              'Например: $12 = 3 \\times 4$, значит $3$ и $4$ — множители числа $12$.'
            },
            { text:
              'Разные пары<br>' +
              'Одно и то же число можно разложить по-разному.<br>' +
              '$12 = 2 \\times 6 = 3 \\times 4$.<br>' +
              'Обычно берут множители больше $1$.'
            },
            { text:
              'Простые множители<br>' +
              'Если продолжать раскладывать, пока все множители не станут простыми, ' +
              'получим разложение на простые множители. Оно единственно с точностью до порядка.<br>' +
              'Например: $12 = 2 \\times 2 \\times 3$.'
            }
          ];
          var i = 0;
          return function () {
            if (i >= slides.length) return null;
            var s = slides[i++];
            return { text: s.text, answer: null, key: 'intro-' + i };
          };
        })()
      },

      /* ────────── Фаза 1: любая пара множителей ────────── */
      {
        key:   'factorPairs',
        label: 'Пара множителей',
        title: 'Разложение на два множителя',
        total: PAIRS_TOTAL,
        intro: 'Переходим к заданиям!',

        hint: [
          'Попробуй разные пары: сначала раздели на $2$, если не подходит — на $3$, потом на $5$.',
          'Множители должны быть больше $1$.',
          'Проверь себя: перемножь свои множители — должно получиться исходное число.'
        ],

        top: [{ type: 'example-string', class: 'question' }],

        bottom: [
          [{ type: 'text', id: 'expr', placeholder: '3×4' }],
          [
            { type: 'insert', target: 'expr', value: '×', label: '×' }
          ]
        ],

        generate: (function () {
          var i = 0;
          return function () {
            if (i++ >= PAIRS_TOTAL) return null;
            var n = randomComposite();
            var pair = smallestFactorPair(n);

            return {
              text:   'Разложи число на два множителя:<br>$' + n + '$',
              number: n,
              answer: pair[0] + '×' + pair[1],
              key:    'pair:' + n
            };
          };
        })(),

        check: function (collected, ex) {
          var user = parseFactors(collected.expr);
          if (!user || user.length !== 2) {
            return { correct: false, expected: ex.answer };
          }
          /* оба множителя должны быть больше 1 */
          if (user[0] < 2 || user[1] < 2) {
            return { correct: false, expected: ex.answer };
          }
          return {
            correct:  user[0] * user[1] === ex.number,
            expected: ex.answer
          };
        },

        formatAnswer: function (ex) { return ex.answer; }
      },

      /* ────────── Фаза 2: простые множители ────────── */
      {
        key:   'primeFactorization',
        label: 'Простые множители',
        title: 'Разложение на простые множители',
        total: PRIMES_TOTAL,
        intro: 'Теперь — на простые множители!',

        hint: [
          'Начни с самого маленького простого числа — $2$.',
          'Если на $2$ не делится, попробуй $3$, потом $5$, $7$ и так далее.',
          'Каждый раз записывай множитель и продолжай делить остаток.'
        ],

        top: [{ type: 'example-string', class: 'question' }],

        bottom: [
          [{ type: 'text', id: 'expr', placeholder: '2×2×3' }],
          [
            { type: 'insert', target: 'expr', value: '×', label: '×' }
          ]
        ],

        generate: (function () {
          var i = 0;
          return function () {
            if (i++ >= PRIMES_TOTAL) return null;
            var n = randomComposite();
            var factors = factorize(n);

            return {
              text:   'Разложи число на простые множители:<br>$' + n + '$',
              number: n,
              answer: factors.join('×'),
              key:    'prime:' + n
            };
          };
        })(),

        check: function (collected, ex) {
          var user = parseFactors(collected.expr);
          if (!user) {
            return { correct: false, expected: ex.answer };
          }

          /* каждый введённый множитель должен быть простым */
          for (var i = 0; i < user.length; i++) {
            if (!isPrime(user[i])) {
              return { correct: false, expected: ex.answer };
            }
          }

          /* произведение должно совпасть с исходным числом */
          var prod = 1;
          for (var j = 0; j < user.length; j++) prod *= user[j];

          return {
            correct:  prod === ex.number,
            expected: ex.answer
          };
        },

        formatAnswer: function (ex) { return ex.answer; }
      }

    ]
  };

})();