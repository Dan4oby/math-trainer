(function () {
  'use strict';

  var L = window.GeneratorLib;

  var MAX_VALUE    = 100;   // потолок для разлагаемых чисел
  var PAIRS_TOTAL  = 1;    // верных ответов на фазе «пара множителей»
  var PRIMES_TOTAL = 1;     // верных ответов на фазе «простые множители»

  /* ─────────── сборка заданий ─────────── */

  /* Пара множителей: любое составное число ≤ MAX_VALUE/2. */
  function makeFactorPair() {
    var n = L.randomComposite(Math.trunc(MAX_VALUE / 2));
    var pair = L.smallestFactorPair(n);

    return {
      text:   'Разложи число на два множителя:<br>$' + n + '$',
      number: n,
      answer: pair[0] + '×' + pair[1],
      key:    'pair:' + n
    };
  }

  /* Разложение на простые множители: любое составное число ≤ MAX_VALUE. */
  function makePrimeFactorization() {
    var n = L.randomComposite(MAX_VALUE);
    var factors = L.factorize(n);

    return {
      text:   'Разложи число на простые множители:<br>$' + n + '$',
      number: n,
      answer: factors.join('×'),
      key:    'prime:' + n
    };
  }

  /* ─────────── проверки ─────────── */

  /* Обе задачи используют поле ввода с одним идентификатором — expr. */
  function checkPair(collected, ex) {
    var user = L.parseFactors(collected.expr);
    var ok = !!(user && user.length === 2 && user[0] >= 2 && user[1] >= 2
                && user[0] * user[1] === ex.number);
    return { correct: ok, expected: ex.answer };
  }

  function checkPrimeFactorization(collected, ex) {
    var user = L.parseFactors(collected.expr);
    var ok = false;

    if (user) {
      ok = true;
      for (var i = 0; i < user.length; i++) {
        if (!L.isPrime(user[i])) { ok = false; break; }
      }
      if (ok) {
        var prod = 1;
        for (var j = 0; j < user.length; j++) prod *= user[j];
        if (prod !== ex.number) ok = false;
      }
    }

    return { correct: ok, expected: ex.answer };
  }

  /* ─────────── панели ввода ─────────── */

  var infoPanel = [{ type: 'info-slide' }];

  var answerPanel = [
    [{ type: 'text', id: 'expr', placeholder: '3×4' }],
    [{ type: 'insert', target: 'expr', value: '×', label: '×' }]
  ];

  /* ─────────── регистрация ─────────── */

  L.register('primeFactorization', {
    id:   'primeFactorization',
    name: 'Разложение на множители',

    rules: [
      '✍️ Сначала будет объяснение',
      '🔢 Потом примеры',
      '🎯 Ошибочный пример вернётся к тебе позже'
    ],

    phases: [

      /* ────────── Фаза 0: ознакомление с множителями ────────── */
      {
        key:   'factorIntro',
        kind:  'info',
        label: 'Ознакомление',
        title: 'Разложение на множители',
        total: 3,
        top:   infoPanel,
        theme: 'strict',

        generate: L.slides([
          {
            title: 'Что такое множители',
            text:  'Множители — это числа, которые при перемножении дают исходное число.<br>' +
                   'Например: $12 = 3 \\times 4$.'
          },
          {
            title: 'Разные пары',
            text:  'Одно и то же число можно разложить по-разному.<br>' +
                   '$12 = 2 \\times 6 = 3 \\times 4$.<br>' +
                   'Обычно берут множители больше $1$.'
          },
          {
            title: 'Как искать пару',
            text:  'Проверяй по очереди простые числа: делится ли на $2$? на $3$? на $5$?<br>' +
                   'Как только нашёл делитель, вторым множителем будет результат деления.'
          }
        ])
      },

      /* ────────── Фаза 1: любая пара множителей ────────── */
      {
        key:   'factorPairs',
        label: 'Пара множителей',
        title: 'Разложение на два множителя',
        total: PAIRS_TOTAL,
        intro: 'Переходим к заданиям!',


        hint: [
          'Попробуй разные пары: сначала раздели на $2$, если не подходит — на $3$, потом на $5$.',
          'Множители должны быть больше $1$.',
          'Проверь себя: перемножь свои множители — должно получиться исходное число.'
        ],

        top:    [{ type: 'example-string', class: 'question' }],
        bottom: answerPanel,

        generate: makeFactorPair,
        check:    checkPair
      },

      /* ────────── Фаза 2: ознакомление с простыми множителями ────────── */
      {
        key:   'primeIntro',
        kind:  'info',
        label: 'Ознакомление',
        title: 'Разложение на простые множители',
        total: 3,
        top:   infoPanel,

        generate: L.slides([
          {
            title: 'Что такое простое число',
            text:  'Простое число делится только на $1$ и на само себя.<br>' +
                   'Простые числа: $2, 3, 5, 7, 11, 13, 17, 19, \\ldots$'
          },
          {
            title: 'Как раскладывать',
            text:  'Делим число на простое число, на которое оно делится, ' +
                   'записываем результат и повторяем, пока не получим только простые множители.<br>' +
                   'Например: $36 = 2 \\cdot 18 = 2 \\cdot 2 \\cdot 9 = 2 \\cdot 2 \\cdot 3 \\cdot 3$.'
          },
          {
            title: 'Форма записи',
            text:  'Множители соединяются знаком умножения.<br>' +
                   'Записываем $2 \\times 2 \\times 3$.<br>' +
                   'Порядок множителей не важен.'
          }
        ])
      },

      /* ────────── Фаза 3: простые множители ────────── */
      {
        key:   'primeFactorization',
        label: 'Простые множители',
        title: 'Разложение на простые множители',
        total: PRIMES_TOTAL,
        intro: 'Переходим к заданиям!',

        hint: [
          'Начни с самого маленького простого числа — $2$.',
          'Если на $2$ не делится, попробуй $3$, потом $5$, $7$ и так далее.',
          'Каждый раз записывай множитель и продолжай делить остаток.'
        ],

        top:    [{ type: 'example-string', class: 'question' }],
        bottom: answerPanel,

        generate: makePrimeFactorization,
        check:    checkPrimeFactorization
      }

    ]
  });

})();