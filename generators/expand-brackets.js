(function () {
  'use strict';

  var TOTAL = 10;   // верных ответов на фазу заданий

  /* ─────────── утилиты ─────────── */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* Разбирает строку вида «6 + 12 - 15» в массив чисел со знаками.
     Принимает разные минусы и пробелы, отвергает всё остальное. */
  function parseSignedTerms(s) {
    if (!s) return null;

    var cleaned = String(s)
      .replace(/\s+/g, '')
      .replace(/[−–—]/g, '-');

    /* допустимые формы: число, возможно со знаком, и цепочка +число / -число */
    if (!/^[+\-]?\d+([+\-]\d+)*$/.test(cleaned)) return null;

    var out = [];
    var m = /^([+\-]?)(\d+)/.exec(cleaned);
    if (!m) return null;
    out.push((m[1] === '-' ? -1 : 1) * parseInt(m[2], 10));

    var i = m[0].length;
    while (i < cleaned.length) {
      var mm = /^([+\-])(\d+)/.exec(cleaned.slice(i));
      if (!mm) return null;
      out.push((mm[1] === '-' ? -1 : 1) * parseInt(mm[2], 10));
      i += mm[0].length;
    }
    return out;
  }

  /* ─────────── сборка задания ─────────── */

  /* k(a1 ± a2 ± …). k положительный, первый коэффициент внутри скобок
     тоже положительный, остальные — со случайными знаками. Ответ —
     поэлементные произведения, в том же порядке, без приведения. */
  function makeTask() {
    var k = randInt(2, 9);
    var n = randInt(2, 4);

    var coeffs = [];
    for (var i = 0; i < n; i++) coeffs.push(randInt(2, 9));

    var signs = [1];
    for (var j = 1; j < n; j++) {
      signs.push(Math.random() < 0.5 ? 1 : -1);
    }

    /* как выглядит выражение со скобками */
    var inner = '';
    for (var a = 0; a < n; a++) {
      if (a === 0) {
        inner += coeffs[a];
      } else {
        inner += (signs[a] < 0 ? ' - ' : ' + ') + coeffs[a];
      }
    }

    /* эталонный ответ: каждое слагаемое умножаем на k, порядок тот же */
    var terms = [];
    var ans = '';
    for (var b = 0; b < n; b++) {
      var val = signs[b] * coeffs[b] * k;
      terms.push(val);
      if (b === 0) {
        ans += val;
      } else {
        ans += (val < 0 ? ' - ' : ' + ') + Math.abs(val);
      }
    }

    return {
      text:   'Раскрой скобки:<br>$' + k + '(' + inner + ')$',
      terms:  terms,          // массив чисел для проверки
      answer: ans,            // эталон для показа
      key:    'exp:' + k + '(' + inner + ')'
    };
  }

  /* ─────────── регистрация ─────────── */

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.expandBrackets = {
    id:   'expandBrackets',
    name: 'Раскрытие скобок',

    rules: [
      '✍️ Умножь каждое слагаемое в скобках на множитель перед скобкой',
      '🚫 Не складывай полученные числа между собой',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],

    phases: [

      /* ────────── Фаза 0: ознакомление ────────── */
      {
        key:   'expandIntro',
        kind:  'info',
        label: 'Ознакомление',
        title: 'Раскрытие скобок',
        total: 3,
        hint:  '',

        top: [{ type: 'example-string', class: 'question' }],

        generate: (function () {
          var slides = [
            { text:
              'Что значит раскрыть скобки<br>' +
              'В примере ниже мы можем как сложить тройку 3 2+4 раз (6 раз), так и сложить тройку 2 раза и еще 4 раза<br>' +
              'То есть: $3(2 + 4) = (3 + 3) + (3 + 3 + 3 + 3)$.<br>' +
              'Или: $3(2 + 4) = 3 \\cdot 2 + 3 \\cdot 4$'
            },
            { text:
              'Порядок и знаки сохраняются<br>' +
              'Слагаемые записываются в том же порядке, в котором стояли в скобках.<br>' +
              'Если внутри был минус, он сохраняется: ' +
              '$3(2 - 5) = 6 - 15$.'
            },
            { text:
              'Не складывай числа после раскрытия<br>' +
              'Полученные слагаемые нужно оставить как есть — каждое со своим знаком.<br>' +
              'Ответ $6 + 12 - 15$ верный, а ответ $3$ — нет.'
            }
          ];
          var i = 0;
          return function () {
            if (i >= slides.length) return null;
            var s = slides[i++];
            return { text: s.text, answer: null, key: 'expandIntro-' + i };
          };
        })()
      },

      /* ────────── Фаза 1: задания ────────── */
      {
        key:   'expandTasks',
        label: 'Раскрытие',
        title: 'Раскрытие скобок',
        total: TOTAL,
        intro: 'Переходим к заданиям!',

        hint: [
          'Умножь множитель на первое слагаемое, потом на второе, и так далее.',
          'Если внутри был минус, произведение тоже будет отрицательным.',
          'Перечисляй результаты через $+$ или $-$ в том же порядке.'
        ],

        top: [{ type: 'example-string', class: 'question' }],

        bottom: [
          [{ type: 'text', id: 'expr', placeholder: '6 + 12 - 15' }],
          [
            { type: 'insert', target: 'expr', value: '+', label: '+' },
            { type: 'insert', target: 'expr', value: '-', label: '−' }
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
          var user = parseSignedTerms(collected.expr);
          if (!user || user.length !== ex.terms.length) {
            return { correct: false, expected: ex.answer };
          }
          for (var i = 0; i < user.length; i++) {
            if (user[i] !== ex.terms[i]) {
              return { correct: false, expected: ex.answer };
            }
          }
          return { correct: true, expected: ex.answer };
        },

        formatAnswer: function (ex) { return ex.answer; }
      }

    ]
  };

})();