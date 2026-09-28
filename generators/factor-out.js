(function () {
  'use strict';

  var TOTAL = 8;              // сколько верных ответов нужно на фазу
  var K_MIN = 2, K_MAX = 9;   // диапазон общего множителя
  var C_MIN = 2, C_MAX = 9;   // диапазон чисел внутри скобок

  /* ─────────── утилиты ─────────── */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

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

  /* ─────────── сборка одного задания ─────────── */

  /* Возвращает { text, answer, key }.

     Идея: выбираем общий множитель k и коэффициенты coefs так,
     чтобы gcd(coefs) === 1 (тогда k — действительно наибольший
     общий множитель слагаемых k*coefs[i]).
     Знаки: первый коэффициент всегда положительный, остальные —
     случайные. Это исключает случаи вида «-6 + 9», где ответ не
     однозначен (можно вынести 3 или -3). */
  function makeTask() {
    var k = randInt(K_MIN, K_MAX);
    var n = randInt(2, 4);

    var coefs;
    do {
      coefs = [];
      for (var i = 0; i < n; i++) coefs.push(randInt(C_MIN, C_MAX));
    } while (gcdAll(coefs) !== 1);

    var signs = [1];
    for (var j = 1; j < n; j++) {
      signs.push(Math.random() < 0.5 ? 1 : -1);
    }

    /* строка примера: сумма слагаемых k*coefs[i] со знаками */
    var display = '';
    for (var a = 0; a < n; a++) {
      var absVal = k * coefs[a];
      if (a === 0) {
        display += absVal;
      } else {
        display += (signs[a] < 0 ? ' - ' : ' + ') + absVal;
      }
    }

    /* эталонный ответ: k(...) */
    var inner = '';
    for (var b = 0; b < n; b++) {
      if (b === 0) {
        inner += coefs[b];
      } else {
        inner += (signs[b] < 0 ? ' - ' : ' + ') + coefs[b];
      }
    }
    var answer = k + '(' + inner + ')';

    return {
      text:   'Вынеси общий множитель за скобки:<br>$' + display + '$',
      answer: answer,
      key:    display + '=' + answer
    };
  }

  /* ─────────── нормализация ответа ─────────── */

  /* Убираем пробелы, знаки умножения (×, ·, *), приводим разные
     минусы к обычному дефису. Так «3 * (2 + 3)», «3×(2+3)»,
     «3·(2 − 3)» и «3(2+3)» считаются одной строкой. */
  function normalize(s) {
    return String(s)
      .replace(/\s+/g, '')
      .replace(/[×·*]/g, '')
      .replace(/[−–—]/g, '-')
      .replace(/[÷:]/g, '/');
  }

  /* ─────────── регистрация генератора ─────────── */

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.factorOut = {
    id:   'factorOut',
    name: 'Вынесение общего множителя',

    rules: [
      '✍️ В ответе запиши выражение с вынесенным множителем',
      '🔘 Используй кнопки под полем для вставки скобок и знаков',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],

    phases: [
      {
        key:   'intro',
        kind:  'info',                        /* ← ключевое поле */
        label: 'Ознакомление',
        title: 'Как выносить множитель',
        total: 4,
        hint:  '',

        top: [{ type: 'example-string', class: 'question' }],

        /* bottom не нужен — движок сам пропустит нижнюю панель */

        generate: (function () {
          var slides = [
            { text:
              'Что значит «вынести общий множитель»<br>' +
              'Если каждое слагаемое делится на одно и то же число, ' +
              'это число можно вынести за скобки.'
            },
            { text:
              'Порядок слагаемых сохраняется<br>' +
              'Слагаемые внутри скобок записываются в том же порядке, ' +
              'в котором они стояли в исходном выражении.<br>' +
              'Например: $6 + 9 - 3 = 3(2 + 3 - 1)$.'
            },
            { text:
              'Знак умножения опускается<br>' +
              'Между вынесенным числом и скобкой знак умножения не пишется.<br>' +
              'Пишем $5(2 + 3)$, а не $5 \\times (2 + 3)$.'
            },
            { text:
              'Проверка<br>' +
              'Чтобы убедиться, что вынесли верно, раскрой скобки обратно:<br>' +
              '$4(3 + 5) = 12 + 20$.'
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
      
      {
      key:   'factorOut',
      label: 'Вынесение',
      title: 'Вынесение общего множителя',
      total: TOTAL,

      hint: [
        'Найди число, на которое делятся все слагаемые.',
        'Вынеси его за скобки, а внутри запиши результаты деления каждого слагаемого на это число.',
        'Знак каждого слагаемого сохраняется внутри скобок.'
      ],

      /* верхняя панель: текст задания с формулой */
      top: [{ type: 'example-string', class: 'question' }],

      /* нижняя панель: поле выражения и панель кнопок */
      bottom: [
        [{ type: 'text', id: 'expr', placeholder: 'запиши выражение' }],
        [
          { type: 'insert', target: 'expr', value: '(',  label: '(' },
          { type: 'insert', target: 'expr', value: ')',  label: ')' },
          { type: 'insert', target: 'expr', value: '+',  label: '+' },
          { type: 'insert', target: 'expr', value: '-',  label: '−' }
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
        var user    = normalize(collected.expr || '');
        var correct = normalize(ex.answer || '');
        return {
          correct:  user === correct,
          expected: ex.answer
        };
      },

      formatAnswer: function (ex) {
        return ex.answer;
      }
    }]
  };

})();