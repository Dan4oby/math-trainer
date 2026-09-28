(function () {
  'use strict';

  var TOTAL     = 12;      // сколько верных ответов нужно на фазу
  var MAX_VALUE = 100;    // потолок для разлагаемого числа

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

  /* Разложение числа на простые множители (по возрастанию). */
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

  /* ─────────── сборка задания ─────────── */

  /* Берём случайное число от 4 до MAX_VALUE, отбрасываем простые —
     остаются только составные. Эталон — разложение на простые. */
  function makeTask() {
    var n;
    do {
      n = randInt(4, MAX_VALUE);
    } while (isPrime(n));

    var factors = factorize(n);

    return {
      text:   'Разложи число на простые множители:<br>$' + n + '$',
      number: n,
      answer: factors.join('×'),
      key:    'p:' + n
    };
  }

  /* ─────────── разбор ответа ─────────── */

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

  /* ─────────── регистрация генератора ─────────── */

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.primeFactorization = {
    id:   'primeFactorization',
    name: 'Разложение на простые множители',

    rules: [
      '✍️ Запиши число в виде произведения простых множителей',
      '🔢 Каждый множитель — простое число: 2, 3, 5, 7, 11, …',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],

    phases: [

      /* ── Фаза 0: ознакомление ── */
      {
        key:   'intro',
        kind:  'info',
        label: 'Ознакомление',
        title: 'Разложение на простые множители',
        total: 3,
        hint:  '',

        top: [{ type: 'example-string', class: 'question' }],

        generate: (function () {
          var slides = [
            { text:
              'Что такое простое число<br>' +
              'Простое число делится только на $1$ и на само себя.<br>' +
              'Простые числа: $2, 3, 5, 7, 11, 13, 17, 19, \\ldots$'
            },
            { text:
              'Как раскладывать<br>' +
              'Делим число на самое маленькое простое, на которое оно делится, ' +
              'записываем результат и повторяем, пока не получим простое число.<br>' +
              'Например: $36 = 2 \\cdot 18 = 2 \\cdot 2 \\cdot 9 = 2 \\cdot 2 \\cdot 3 \\cdot 3$.'
            },
            { text:
              'Форма записи<br>' +
              'Множители соединяются знаком умножения.<br>' +
              'Записываем $2 \\times 2 \\times 3$.<br>' +
              'Порядок множителей не важен.'
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

      /* ── Фаза 1: задания ── */
      {
        key:   'factorization',
        label: 'Разложение',
        title: 'Разложение на простые множители',
        total: TOTAL,
        intro: 'Переходим к заданиям!',

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
            if (i++ >= TOTAL) return null;
            return makeTask();
          };
        })(),

        check: function (collected, ex) {
          var user = parseFactors(collected.expr);
          if (!user) {
            return { correct: false, expected: ex.answer };
          }

          /* все введённые числа должны быть простыми */
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