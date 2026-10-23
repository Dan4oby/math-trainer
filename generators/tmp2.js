(function () {
  'use strict';

  var L = window.GeneratorLib;

  /* ─────────── парсер числового ответа ─────────── */
  /* Понимает: "0.5", "0,5", "3/4", "1 3/4", "-10/7" */
  function parseNum(str) {
    if (!str) return NaN;
    str = String(str).trim().replace(/,/g, '.');

    /* смешанная дробь: "1 3/7" */
    var mixed = str.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
      var sign = mixed[1].startsWith('-') ? -1 : 1;
      return Math.abs(parseFloat(mixed[1])) +
             (parseFloat(mixed[2]) / parseFloat(mixed[3])) * sign;
    }

    /* обыкновенная дробь: "10/7" */
    var frac = str.match(/^(-?\d+)\/(\d+)$/);
    if (frac) {
      return parseFloat(frac[1]) / parseFloat(frac[2]);
    }

    /* десятичная */
    return parseFloat(str);
  }

  /* ─────────── фабрика фазы с вводом ─────────── */
  function inputPhase(title, questions) {
    return {
      title:   title,
      total:   questions.length,
      progress: 'group',
      
      /* можно раскомментировать, если нужен режим «без подсветки верного» */
      // correctAction: 'silent',

      top:    [{ type: 'example-string', class: 'question' }],
      bottom: [[{ type: 'text', id: 'ans', placeholder: 'ответ' }]],

      generate: L.fromArray(questions, function (q) {
        return {
          text:     q.text,
          expected: q.expected
        };
      }),

      check: function (collected, ex) {
        var user    = parseNum(collected.ans);
        var correct = parseNum(ex.expected);

        if (isNaN(user)) {
          return { correct: false, expected: ex.expected };
        }

        /* допускаем небольшую погрешность для дробей */
        var ok = Math.abs(user - correct) < 1e-5;

        return {
          correct:  ok,
          expected: ex.expected
        };
      },

      formatAnswer: function (ex) {
        return ex.expected;
      }
    };
  }

  /* ─────────── регистрация ─────────── */

  L.register('variableExpressions', {
    id:   'variableExpressions',
    name: 'Выражения с переменными',

    rules: [
      '📝 Вычисление значений выражений',
      '🔢 Десятичные дроби можно вводить через точку или запятую',
      '➗ Обыкновенные дроби: 3/4 или 1 3/4',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],

    phases: [

      inputPhase('Задание 40', [
        { text: 'Найди значение $x + y$, если $x = 1,2$, $y = -2,5$', expected: '-1.3' },
        { text: 'Найди значение $xy$, если $x = 1,2$, $y = -2,5$', expected: '-3' },
        { text: 'Найди значение $x + y$, если $x = -0,8$, $y = 3$', expected: '2.2' },
        { text: 'Найди значение $xy$, если $x = -0,8$, $y = 3$', expected: '-2.4' },
        { text: 'Найди значение $x + y$, если $x = 0,1$, $y = 0,2$', expected: '0.3' },
        { text: 'Найди значение $xy$, если $x = 0,1$, $y = 0,2$', expected: '0.02' },
        { text: 'Найди значение $x + y$, если $x = -1,4$, $y = -1,6$', expected: '-3' },
        { text: 'Найди значение $xy$, если $x = -1,4$, $y = -1,6$', expected: '2.24' }
      ]),

      inputPhase('Задание 41', [
        { text: 'Найди значение $5m - 3n$, если $m = -\\frac{2}{5}$, $n = \\frac{2}{3}$', expected: '-4' },
        { text: 'Найди значение $5m - 3n$, если $m = 0,2$, $n = -1,4$', expected: '5.2' }
      ]),

      inputPhase('Задание 42', [
        { text: 'Найди значение $\\frac{1}{2}x - y$, если $x = 2,4$, $y = 0,8$', expected: '0.4' },
        { text: 'Найди значение $\\frac{1}{2}x - y$, если $x = -3,6$, $y = 5$', expected: '-6.8' },
        { text: 'Найди значение $\\frac{1}{2}x - y$, если $x = 4,8$, $y = -2,1$', expected: '4.5' },
        { text: 'Найди значение $\\frac{1}{2}x - y$, если $x = -4,4$, $y = -3$', expected: '0.8' }
      ]),

      inputPhase('Задание 44', [
        { text: 'Известно, что $x - y = 0,7$. Найди значение выражения $5(x - y)$', expected: '3.5' },
        { text: 'Известно, что $x - y = 0,7$. Найди значение выражения $y - x$', expected: '-0.7' },
        { text: 'Известно, что $x - y = 0,7$. Найди значение выражения $\\frac{1}{x - y}$', expected: '10/7' },
        { text: 'Известно, что $x - y = 0,7$. Найди значение выражения $\\frac{x - y}{y - x}$', expected: '-1' }
      ])

    ]
  });

})();