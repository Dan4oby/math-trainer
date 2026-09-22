(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  var MIN = 2, MAX = 10;

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.classic = {
    id: 'classic',
    name: 'Умножение и деление (2–10)',
    phases: [

      {
        key: 'multiplication',
        label: 'Умножение',
        title: 'Умножение',
        total: 12,
        inputMode: 'integer',          // ← одно числовое поле
        generate: function () {
          var a = randInt(MIN, MAX);
          var b = randInt(MIN, MAX);
          return {
            text: a + ' × ' + b,
            answer: a * b,
            key: a + 'x' + b
          };
        }
      },

      {
        key: 'division',
        label: 'Деление',
        title: 'Деление',
        total: 12,
        inputMode: 'integer',
        intro: 'Умножение пройдено! 🎉<br>Переходим к делению',
        generate: function () {
          var b = randInt(MIN, MAX);
          var q = randInt(MIN, MAX);
          return {
            text: (b * q) + ' ÷ ' + b,
            answer: q,
            key: (b * q) + '/' + b
          };
        }
      }

    ]
  };
})();