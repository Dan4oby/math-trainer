(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  var MIN = 2, MAX = 12;

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.classic = {
    id: 'classic',
    name: 'Умножение и деление (2–12)',

    rules: [
      '✖️ 12 верно решённых примеров на умножение',
      '➗ 12 верно решённых примеров на деление',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],
    
    phases: [

      /* ── Умножение ─────────────────────────────── */
      {
        key: 'multiplication',
        label: 'Умножение',
        title: 'Умножение',
        total: 12,

        hint: [
          'Попробуй переставить множители местами — иногда так легче.',
          'Разложи один из множителей: 8 × 7 = 8 × 5 + 8 × 2.',
          'Округли до десятка, потом отними лишнее: 9 × 7 = 10 × 7 − 7.',
          'Если один множитель чётный, посчитай половину и умножь на два.'
        ],

        /* верхняя панель: одна строка — текст примера */
        top: [{ type: 'example-string' }],

        /* нижняя панель: одна строка, одно числовое поле */
        bottom: [
          [{ type: 'number', id: 'ans', placeholder: '?' }]
        ],

        generate: function () {
          var a = randInt(MIN, MAX);
          var b = randInt(MIN, MAX);
          return {
            text:   '$' + a + ' * ' + b + '$',
            answer: a * b,
            key:    a + 'x' + b
          };
        },

        check: function (collected, ex) {
          return collected.ans === ex.answer;
        },

        formatAnswer: function (ex) {
          return String(ex.answer);
        }
      },

      /* ── Деление ───────────────────────────────── */
      {
        key: 'division',
        label: 'Деление',
        title: 'Деление',
        total: 12,
        intro: 'Умножение пройдено! 🎉<br>Переходим к делению',

        hint: [
          'Вспомни таблицу умножения: какое число умножить на делитель, чтобы получить делимое?',
          'Деление — это умножение наоборот.',
          'Проверь себя: умножь получившийся ответ на делитель — должно получиться делимое.'
        ],

        top: [{ type: 'example-string' }],
        bottom: [
          [{ type: 'number', id: 'ans', placeholder: '?' }]
        ],

        generate: function () {
          var b = randInt(MIN, MAX);
          var q = randInt(MIN, MAX);
          return {
            text:   '$\\frac{' + (b * q) + '}{' + b + '}$',
            answer: q,
            key:    (b * q) + '/' + b
          };
        },

        check: function (collected, ex) {
          return collected.ans === ex.answer;
        },

        formatAnswer: function (ex) {
          return String(ex.answer);
        }
      }

    ]
  };
})();