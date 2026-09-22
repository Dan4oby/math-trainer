(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  function signChar(n) { return n < 0 ? '(−' + Math.abs(n) + ')' : String(n); }

  var MIN = 2, MAX = 12;

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.signed = {
    id: 'signed',
    name: 'Умножение и деление с отрицательными числами',
    phases: [

      /* ── Фаза 1: умножение со знаками ─────────────────── */
      {
        key: 'signed-multiplication',
        label: 'Умножение ±',
        title: 'Умножение (с отрицательными числами)',
        total: 12,
        inputMode: 'signed-integer',
        generate: function () {
          var a = randInt(MIN, MAX);
          var b = randInt(MIN, MAX);

          // распределяем знаки:
          //  1/3 случаев — оба положительные,
          //  1/3 — один отрицательный,
          //  1/3 — оба отрицательные
          var variant = pick(['pos-pos', 'mixed', 'neg-neg']);
          if (variant === 'mixed')      { if (Math.random() < 0.5) a = -a; else b = -b; }
          else if (variant === 'neg-neg') { a = -a; b = -b; }

          return {
            text: signChar(a) + ' × ' + signChar(b),
            answer: a * b,
            key: 'm:' + a + 'x' + b
          };
        }
      },

      /* ── Фаза 2: деление со знаками ────────────────────── */
      {
        key: 'signed-division',
        label: 'Деление ±',
        title: 'Деление (с отрицательными числами)',
        total: 12,
        inputMode: 'signed-integer',
        intro: 'Умножение со знаками пройдено! 🎉<br>Переходим к делению',
        generate: function () {
          var b = randInt(MIN, MAX);       // делитель (по модулю)
          var q = randInt(MIN, MAX);       // частное (по модулю)
          var a = b * q;                   // делимое (по модулю)

          // знаки: делимое и делитель независимо могут быть отрицательными,
          // но частное — целое, поэтому знак частного = знак(a) XOR знак(b)
          var variant = pick(['pos-pos', 'mixed', 'neg-neg']);
          if (variant === 'mixed')        { if (Math.random() < 0.5) a = -a; else b = -b; }
          else if (variant === 'neg-neg') { a = -a; b = -b; }

          // итоговый ответ — частное с учётом знаков
          var answer = (a < 0) === (b < 0) ? q : -q;

          return {
            text: signChar(a) + ' ÷ ' + signChar(b),
            answer: answer,
            key: 'd:' + a + '/' + b
          };
        }
      }

    ]
  };
})();