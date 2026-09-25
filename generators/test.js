(function () {
  'use strict';

  var TEST_URL = 'tests/test.json';

  /* ── читаем JSON и после этого регистрируем генератор ── */
  fetch(TEST_URL)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' для ' + TEST_URL);
      return r.json();
    })
    .then(function (data) {
      registerTest(data);
    })
    .catch(function (e) {
      console.error('Не удалось загрузить тест из JSON:', e);
    });

  function registerTest(data) {
    var questions = Array.isArray(data.questions) ? data.questions : [];

    window.ExampleGenerators = window.ExampleGenerators || {};

    window.ExampleGenerators.test = {
      id: 'test',
      name: data.title || 'Тест',

      phases: [{
        key: 'test',
        label: data.title|| 'Тест',
        title: data.title || 'Тест',
        total: questions.length,          // сколько верных ответов нужно
        hint: data.hint || '',

        /* верхняя панель: строка вопроса */
        top: [{ type: 'example-string' }],

        /* нижняя панель: одна горизонтальная строка из чекбоксов.
           bottom — функция, потому что варианты у каждого вопроса свои. */
        bottom: function (ex) {
          return [
            ex.options.map(function (label, i) {
              return {
                type:  'checkbox',
                id:    'opt' + i,
                label: label,
                group: 'answer'           // radio-поведение: только один выбор
              };
            })
          ];
        },

        generate: (function () {
          var i = 0;
          return function () {
            if (i >= questions.length) return null;
            var q = questions[i++];
            return {
              text:    q.text,
              options: q.options,
              answer:  q.correct - 1,
              key:     q.text
            };
          };
        })(),

        /* проверка ответа — здесь и живёт вся специфика теста */
        check: function (collected, ex) {
          var chosen = null;
          for (var id in collected) {
            if (collected[id] === true) { chosen = id; break; }
          }

          /* ничего не отмечено — движок не должен сюда попасть,
             но на всякий случай считаем ответ неверным */
          if (chosen === null) {
            return { correct: false, expected: ex.options[ex.answer] };
          }

          var idx = parseInt(chosen.slice(3), 10);   // "opt2" → 2
          return {
            correct:  idx === ex.answer,
            expected: ex.options[ex.answer]
          };
        },

        /* как правильный ответ выглядит на финальном экране */
        formatAnswer: function (ex) {
          return ex.options[ex.answer];
        }
      }]
    };
  }

  /* ── выбираем случайный вопрос, не повторяя уже заданные ── */
  function pickQuestion(questions) {
    var asked = pickQuestion._asked = pickQuestion._asked || [];
    var remaining = questions.filter(function (q) { return asked.indexOf(q.text) === -1; });
    if (!remaining.length) {
      asked.length = 0;
      remaining = questions.slice();
    }
    var q = remaining[Math.floor(Math.random() * remaining.length)];
    asked.push(q.text);
    return q;
  }

})();