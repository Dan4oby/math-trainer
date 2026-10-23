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
      /* ── Доказательство (-1)(a+b) = -a - b ── */
      L.singleChoicePhase({
        title: 'Доказательство',
        strictOrder: true,
        wrongAction: 'silent', // Отключаем подсветку верного ответа
        questions: [
          {
            text: 'Что получится, если расписать умножение $-1$ на $(a+b)$ как сложение?',
            options: [
              '$\\underbrace{(-1)+(-1)+...+(-1)}_{a+b}$',
              '$-1 + a + b$',
              '$\\underbrace{(-1)+(-1)+...+(-1)}_{a \\cdot b}$'
            ],
            correct: 0
          },
          {
            text: 'Что получится, если разделить эти слагаемые на $a$ единиц и $b$ единиц?',
            options: [
              '$\\underbrace{(-1)+...+(-1)}_{a} + \\underbrace{(-1)+...+(-1)}_{b}$',
              '$\\underbrace{(-1)+...+(-1)}_{a} \\cdot \\underbrace{(-1)+...+(-1)}_{b}$',
              '$\\underbrace{(-1)+...+(-1)}_{b} + a$'
            ],
            correct: 0
          },
          {
            text: 'Что получится, если теперь превратить $\\underbrace{(-1)+...+(-1)}_{a} + \\underbrace{(-1)+...+(-1)}_{b}$ обратно в умножение?',
            options: [
              '$(-1)a + (-1)b$',
              '$(-1)(a) \\cdot (-1)(b)$',
              '$(-1) + a + (-1) + b$'
            ],
            correct: 0
          }
        ]
      }),

      L.infoPhase({
        intro: 'Правильно!',
        slides: [
          {
            title: 'Отлично!',
            text: 'Ты доказал, что $(-1)(a+b) = (-1)a+(-1)b$ с помощью простого разложения умножения на сложение.'
          },
          {
            title: 'Упрощённая запись',
            text: 'Обычно $(-1) \\cdot (\\dots)$ перед скобкой и буквами с числами не записывают, а пишут в упрощённом виде: $-(\\dots)$.<br>' +
                  'Поэтому: $(-1) \\cdot (a+b) = -(a+b) = (-1)a+(-1)b = -a-b$.'
          },
          {
            title: 'То есть',
            text: '$-(a+b)=-a-b$. Получили тождество. Верно для любых чисел'
          },
          {
            title: 'Точно также для вычитания',
            text: '$-(a-b)=-a-(-b)=-a+b=b-a$'
          },
        ]
      }),
      inputPhase('Задание 40', [
        { text: 'Найди значение $x + y$, если $x = 1,2$, $y = -2,5$', expected: '-1.3' },
        { text: 'Найди значение $x + y$, если $x = -0,8$, $y = 3$', expected: '2.2' },
        { text: 'Найди значение $x + y$, если $x = 0,1$, $y = 0,2$', expected: '0.3' },
        { text: 'Найди значение $x + y$, если $x = -1,4$, $y = -1,6$', expected: '-3' },
      ]),

      inputPhase('Задание 41', [
        { text: 'Найди значение $5m - 3n$, если $m = -\\frac{2}{5}$, $n = \\frac{2}{3}$', expected: '-4' },
        { text: 'Найди значение $5m - 3n$, если $m = 0,2$, $n = -1,4$', expected: '5.2' }
      ]),

      inputPhase('Задание 42', [
        { text: 'Найди значение $\\frac{1}{2}x - y$, если $x = 2,4$, $y = 0,8$', expected: '0.4' },
        { text: 'Найди значение $\\frac{1}{2}x - y$, если $x = -3,6$, $y = 5$', expected: '-6.8' }
      ]),

      inputPhase('Задание 44', [
        { text: 'Известно, что $x - y = 1$. Найди значение выражения $5(x - y)$', expected: '5' },
        { text: 'Известно, что $x - y = 1$. Найди значение выражения $y - x$', expected: '-1' },
        { text: 'Известно, что $x - y = 1$. Найди значение выражения $\\frac{x - y}{y - x}$', expected: '-1' }
      ]),

            /* 45. Сложное выражение через известное значение */
      inputPhase('Задание 45', [
        {
          text: 'Известно, что $a - b = 4$. Найди значение выражения $\\frac{12}{b - a} + \\frac{16}{(b - a)^2}$',
          expected: '-2'
        }
      ]),

      /* 46. Вычисление выражений с параметрами */
      inputPhase('Задание 46', [
        {
          text: 'Найди значение $ax - 3y$, если $a = 10$, $x = -5$, $y = -\\frac{1}{3}$',
          expected: '-49'
        },
        {
          text: 'Найди значение $ax + bx + c$, если $a = \\frac{1}{2}$, $x = 2$, $b = -3$, $c = 5,8$',
          expected: '0.8'
        }
      ]),

      /* 56. Составление выражений */
      exprPhase('Задание 56', [
        { text: 'Запиши сумму чисел $b$ и $c$', expected: 'b+c' },
        { text: 'Запиши разность чисел $a$ и $m$', expected: 'a-m' },
        { text: 'Запиши квадрат числа $x$', expected: 'x^2' },
        { text: 'Запиши куб числа $y$', expected: 'y^3' },
        { text: 'Сумма числа $x$ и произведения чисел $a$ и $b$', expected: 'x+ab' },
        { text: 'Разность числа $m$ и частного чисел $x$ и $y$', expected: 'm-x/y' },
        { text: 'Произведение суммы чисел $a$ и $b$ и числа $c$', expected: '(a+b)c' },
        { text: 'Произведение числа $a$ и суммы чисел $x$ и $y$', expected: 'a(x+y)' }
      ]),

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