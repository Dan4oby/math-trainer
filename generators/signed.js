(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  /* отрицательные числа печатаем в скобках, как в учебнике */
  function signChar(n) {
    return n < 0 ? '(−' + Math.abs(n) + ')' : String(n);
  }

  var MIN = 2, MAX = 10;

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.signed = {
    id: 'signed',
    name: 'Умножение и деление со знаками',

    rules: [
      '➕➖ Примеры содержат положительные и отрицательные числа',
      '✖️ 12 верных ответов на умножение, затем 12 на деление',
      '🎯 Ошибочный пример вернётся к тебе позже',
      '🖊 Отрицательный ответ — не забудь нажать «±»'
    ],

    phases: [

      /* ── Умножение со знаками ─────────────────────── */
      {
        key: 'signed-multiplication',
        label: 'Умножение ±',
        title: 'Умножение (с отрицательными числами)',
        total: 12,

        hint: [
          'Сначала посчитай умножение без знака, потом определи знак.',
          'Минус на минус даёт плюс.',
          'Знак ответа: плюс, если минусов чётное число, иначе — минус.',
          'Считай как обычно, а знак поставь в конце.'
        ],

        /* верхняя панель: строка примера */
        top: [{ type: 'example-string' }],

        /* нижняя панель: одна строка — [±] [число] */
        bottom: [
          [
            { type: 'sign',   id: 'sign' },
            { type: 'number', id: 'mag', placeholder: '?' }
          ]
        ],

        generate: function () {
          var a = randInt(MIN, MAX);
          var b = randInt(MIN, MAX);

          var variant = pick(['pos-pos', 'mixed', 'neg-neg']);
          if (variant === 'mixed')        { if (Math.random() < 0.5) a = -a; else b = -b; }
          else if (variant === 'neg-neg') { a = -a; b = -b; }

          return {
            text:   '$' + signChar(a) + ' * ' + signChar(b) + '$',
            answer: a * b,
            key:    'm:' + a + 'x' + b
          };
        },

        /* проверка ответа: собираем знак и модуль и сравниваем с answer */
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
        total: 12,
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
          var b = randInt(MIN, MAX);
          var q = randInt(MIN, MAX);
          var a = b * q;

          var variant = pick(['pos-pos', 'mixed', 'neg-neg']);
          if (variant === 'mixed')        { if (Math.random() < 0.5) a = -a; else b = -b; }
          else if (variant === 'neg-neg') { a = -a; b = -b; }

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