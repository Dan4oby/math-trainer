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
      wrongAction: 'silent',
      
      /* можно раскомментировать, если нужен режим «без подсветки верного» */
      // wrongAction: 'silent',

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

    /* ─────────── фабрика фазы для ввода выражений ─────────── */
  function exprPhase(title, questions) {
    return {
      title:   title,
      total:   questions.length,
      progress: 'group',
      wrongAction: 'silent',
      top:    [{ type: 'example-string', class: 'question' }],
      bottom: [[{ type: 'text', id: 'ans', placeholder: 'например, a+b' }]],

      generate: L.fromArray(questions, function (q) {
        return {
          text:     q.text,
          expected: q.expected
        };
      }),

      check: function (collected, ex) {
        /* нормализация: убираем пробелы, знаки умножения и лишние символы */
        var norm = function (s) {
          return String(s || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[\*·×]/g, '');
        };

        var user    = norm(collected.ans);
        var correct = norm(ex.expected);

        return {
          correct:  user === correct,
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

      /* 88. Составление выражений */
      exprPhase('Задание 88', [
        { text: 'Сумма числа $x$ и произведения чисел $a$ и $b$', expected: 'x+ab' },
        { text: 'Частное от деления числа $a$ на разность чисел $b$ и $c$', expected: 'a/(b-c)' },
        { text: 'Произведение суммы чисел $x$ и $a$ и разности чисел $x$ и $b$', expected: '(x+a)(x-b)' }
      ]),

      L.infoPhase({
        intro: 'Правильно!',
        slides: [
          {
            title: 'Напомню тебе',
            text: 'Иногда легче сначала упростить выражение: раскрыть скобочки, привести подобные, а потом уже подставлять число'
          },
          {
            title: 'Пример',
            text: '$\\boxed{a(2+b)}+2a+2b=\\boxed{2a+b}+2a+2b$'
          }
        ]
      }),
      
      /* 142. Вычисление выражения при разных значениях переменной */
      inputPhase('Задание 142', [
        {
          text: 'Найди значение выражения $8(3 - 3,5m) - 20 + 23m$ при $m = 2,5$',
          expected: '-8.5'
        },
        {
          text: 'Найди значение выражения $8(3 - 3,5m) - 20 + 23m$ при $m = 1,2$',
          expected: '-2'
        },
        {
          text: 'Найди значение выражения $8(3 - 3,5m) - 20 + 23m$ при $m = 40$',
          expected: '-196'
        }
      ]),

      /* 185. Раскрытие скобок и вычисление */
      inputPhase('Задание 185', [
        {
          text: 'Найди значение выражения $-0,5(7b - 12a) - (8,4a - 14b)$ при $a = -10$, $b = -6$',
          expected: '-39'
        }
      ]),

      /* 203. Дроби с переменными */
      inputPhase('Задание 203', [
        {
          text: 'Найди значение выражения $\\frac{m}{m - 1}$ при $m = -\\frac{1}{3}$',
          expected: '0.25'
        },
        {
          text: 'Найди значение выражения $\\frac{2a + 1}{a - 4}$ при $a = 3,5$',
          expected: '-16'
        }
      ]),

      /* 204. Использование известного значения выражения */
      inputPhase('Задание 204', [
        {
          text: 'Известно, что $2(a + b) = -8,1$. Найди значение выражения $3(a + b)$',
          expected: '-12.15'
        },
        {
          text: 'Известно, что $2(a + b) = -8,1$. Найди значение выражения $-0,5(a + b)$',
          expected: '2.025'
        }
      ])

    ]
  });

})();