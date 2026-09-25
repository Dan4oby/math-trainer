(function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function minDistToNumber(a, b, number) {
    a = Number(a)
    b = Number(b)
    if (a > b) return minDistToNumber(b, a, number)
    
    var aDist = (a % number < number / 2) ? 
            a % number : number - a % number
    var bDist = (b % number < number / 2) ? 
            b % number : number - b % number
    
    if (aDist > bDist) return b

    return a
  }

  function typer(a, b, operation_symbol, revert) {
    if (revert) return `${b} ${operation_symbol} ${a}`

    return `${a} ${operation_symbol} ${b}`
  }

  var MIN = 2, MAX = 12;

  window.ExampleGenerators = window.ExampleGenerators || {};

  window.ExampleGenerators.classic = {
    id: 'classic',
    name: 'Умножение и деление (2–12)',
    phases: [

      {
        key: 'multiplication',
        label: 'Умножение',
        title: 'Умножение',
        //hint: [
        //  'Попробуй переставить числа местами — иногда так легче.',
        //  'Округли до десятка, потом отними лишнее: 9 × 7 = 10 × 7 − 7',
        //  'Разложи один из множителей: 8 × 7 = 8 × 5 + 8 × 2.',
        //  'Если один множитель чётный, посчитай половину и умножь на два'
        //],
        hint: function (ex) {
          // ex — это объект примера: { text, answer, key }
          var a = ex.text.split('×')[0].trim()
          var b = ex.text.split('×')[1].trim()

          var minimumDistNumber = minDistToNumber(a, b, 10)
          var anotherNumber
          var revert = false
          if (minimumDistNumber == a) anotherNumber = b
          else {
            anotherNumber = a
            revert = true
          }

          if (minimumDistNumber % 10 <= 3 && minimumDistNumber > 10) {
            var totalPlus = typer(minimumDistNumber - minimumDistNumber % 10, anotherNumber, '×', revert)
            var plus = typer(minimumDistNumber % 10, anotherNumber, '×', revert)
            return [`${ex.text} = ${totalPlus} + ${plus}`]
          }
            
          if (minimumDistNumber % 10 >= 7) {
            var totalMinus = typer(minimumDistNumber + 10 - minimumDistNumber % 10, anotherNumber, '×', revert)
            var minus = typer(10 - minimumDistNumber % 10, anotherNumber, '×', revert)
            return [`${ex.text} = ${totalMinus} - ${minus}`]
          }
            
          return [
            'Разложи один из множителей: 8 × 7 = 8 × 5 + 8 × 2',
            'Если один множитель чётный, посчитай половину и умножь на два'
          ];
        },
        total: 12,
        inputMode: 'integer',          
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
        hint: [
          'Деление — это умножение наоборот: ищи, сколько раз делитель «укладывается» в делимое.',
          'Разложи делимое на удобные части и раздели каждую отдельно. 36/4 = 20/4 + 16/4',
          'Попробуй округлить делимое до того, что ты знаешь и вычесть разницу. 36/4 = 40/4 - 1'
        ],
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