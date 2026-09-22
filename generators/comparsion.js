(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.comparison = {
    id: 'comparison',
    name: 'Сравнение выражений с буквой',
    phases: [
      {
        key: 'compare',
        label: 'Сравнение',
        title: 'Сравнение выражений',
        total: 10,
        inputMode: 'choice',
        options: [
          { value: '<', label: '<' },
          { value: '>', label: '>' },
          { value: '=', label: '=' }
        ],
        hint: 'Сначала подставь x и посчитай каждое выражение, потом сравни результаты.',
        generate: function () {
          var x = randInt(2, 6);
          var a = randInt(2, 9);
          var form = pick(['simple', 'linear', 'distribute']);

          var left, right, lv, rv;

          if (form === 'simple') {
            /* ax + b  ?  c */
            var b = randInt(1, 10);
            lv = a * x + b;
            rv = lv + randInt(-3, 3);
            left  = a + 'x + ' + b;
            right = String(rv);
          } else if (form === 'linear') {
            /* ax + b  ?  cx + d */
            var c = randInt(2, 9);
            var b2 = randInt(1, 9);
            var d  = randInt(1, 9);
            lv = a * x + b2;
            rv = c * x + d;
            left  = a + 'x + ' + b2;
            right = c + 'x + ' + d;
          } else {
            /* a(x + b)  ?  ax + ab — всегда равно (распределительный закон) */
            var b3 = randInt(2, 6);
            lv = a * (x + b3);
            rv = a * x + a * b3;
            left  = a + '(x + ' + b3 + ')';
            right = a + 'x + ' + a * b3;
          }

          var answer = lv < rv ? '<' : lv > rv ? '>' : '=';

          return {
            text: 'x = ' + x + ':   ' + left + '  ?  ' + right,
            answer: answer,
            key: form + ':' + left + '|' + right + '|x' + x
          };
        }
      }
    ]
  };
})();