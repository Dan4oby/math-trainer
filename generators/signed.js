(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* Генерация с перекосом в сторону больших чисел (сложнее) */
  function randIntHard(min, max) {
    var r = Math.pow(Math.random(), 0.6); // ближе к 1 → числа ближе к max
    return Math.floor(r * (max - min + 1)) + min;
  }

  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  /* Выбор с весами: items = [[значение, вес], ...] */
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

  /* отрицательные числа печатаем в скобках, как в учебнике */
  function signChar(n) {
    return n < 0 ? '(−' + Math.abs(n) + ')' : String(n);
  }

  var MIN = 2, MAX = 13;

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.signed = {
    id: 'signed',
    name: 'Умножение и деление со знаками',

    rules: [
      '➕➖ Примеры содержат положительные и отрицательные числа',
      '🎯 Ошибочный пример вернётся к тебе позже',
      '🖊 Отрицательный ответ — не забудь нажать «±»'
    ],

    phases: [

      /* ── Умножение со знаками ─────────────────────── */
      {
        key: 'signed-multiplication',
        label: 'Умножение ±',
        title: 'Умножение (с отрицательными числами)',
        total: 7,

        hint: [
          'Сначала посчитай умножение без знака, потом определи знак.',
          'Минус на минус даёт плюс.',
          'Знак ответа: плюс, если минусов чётное число, иначе — минус.',
          'Считай как обычно, а знак поставь в конце.'
        ],

        top: [{ type: 'example-string' }],

        bottom: [
          [
            { type: 'sign',   id: 'sign' },
            { type: 'number', id: 'mag', placeholder: '?' }
          ]
        ],

        generate: function () {
          /* чаще берём большие множители */
          var a = randIntHard(MIN, MAX);
          var b = randIntHard(MIN, MAX);

          /* pos-pos реже, mixed и neg-neg — чаще */
          var variant = pickWeighted([
            ['pos-pos', 1],
            ['mixed',   3],
            ['neg-neg', 1]
          ]);

          if (variant === 'mixed') {
            if (Math.random() < 0.5) a = -a;
            else b = -b;
          } else if (variant === 'neg-neg') {
            a = -a;
            b = -b;
          }

          return {
            text:   '$' + signChar(a) + ' * ' + signChar(b) + '$',
            answer: a * b,
            key:    'm:' + a + 'x' + b
          };
        },

        check: function (collected, ex) {
          if (collected.mag === null) {
            return { correct: false, expected: formatSigned(ex.answer) };
          }
          var user = collected.sign * collected.mag;
          return {
            correct:  user === ex.answer,
            expected: formatSigned(ex.answer)
          };
        },

        formatAnswer: function (ex) {
          return formatSigned(ex.answer);
        }
      },

      /* ── Деление со знаками ───────────────────────── */
      {
        key: 'signed-division',
        label: 'Деление ±',
        title: 'Деление (с отрицательными числами)',
        total: 9,
        intro: 'Умножение со знаками пройдено! 🎉<br>Переходим к делению',

        hint: [
          'Знак ответа определяй по правилу знаков, а числа дели как обычно.',
          'Минус на минус даёт плюс.',
          'Проверь себя: умножь ответ на делитель — должно получиться делимое.'
        ],

        top: [{ type: 'example-string' }],

        bottom: [
          [
            { type: 'sign',   id: 'sign' },
            { type: 'number', id: 'mag', placeholder: '?' }
          ]
        ],

        generate: function () {
          /* делитель и частное чаще ближе к 13 */
          var b = randIntHard(MIN, MAX);
          var q = randIntHard(MIN, MAX);
          var a = b * q;

          /* pos-pos реже, mixed и neg-neg — чаще */
          var variant = pickWeighted([
            ['pos-pos', 1],
            ['mixed',   3],
            ['neg-neg', 1]
          ]);

          if (variant === 'mixed') {
            if (Math.random() < 0.5) a = -a;
            else b = -b;
          } else if (variant === 'neg-neg') {
            a = -a;
            b = -b;
          }

          /* частное целое, его знак = знак(a) XOR знак(b) */
          var answer = (a < 0) === (b < 0) ? q : -q;

          return {
            text:   '$\\frac{' + signChar(a) + '}{' + signChar(b) + '}$',
            answer: answer,
            key:    'd:' + a + '/' + b
          };
        },

        check: function (collected, ex) {
          if (collected.mag === null) {
            return { correct: false, expected: formatSigned(ex.answer) };
          }
          var user = collected.sign * collected.mag;
          return {
            correct:  user === ex.answer,
            expected: formatSigned(ex.answer)
          };
        },

        formatAnswer: function (ex) {
          return formatSigned(ex.answer);
        }
      }

    ]
  };

  /* ── вспомогательная: как показывать знаковый ответ ── */
  function formatSigned(n) {
    return n < 0 ? '−' + Math.abs(n) : String(n);
  }

})();