(function () {
  'use strict';

  var TEST_URL = 'tests/test.json';

  window.ExampleGenerators = window.ExampleGenerators || {};

  var gen = {
    id:   'test',
    name: 'Загрузка…',
    ready: null,
    phases: [],
    rules: function () { return []; }
  };
  window.ExampleGenerators.test = gen;

  gen.ready = fetch(TEST_URL)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' для ' + TEST_URL);
      return r.json();
    })
    .then(function (data) {
      fillGenerator(gen, data);
      return gen;
    })
    .catch(function (e) {
      console.error('[test.js] не удалось загрузить тест:', e);
      throw e;
    });

  function fillGenerator(gen, data) {
    var questions = Array.isArray(data.questions) ? data.questions : [];

    gen.name = data.title || 'Тест';

    gen.rules = function () {
      return [
        '📋 Вопросов в тесте: ' + questions.length,
        '☑️ У каждого вопроса один правильный вариант',
        '🎯 Ошибочный вопрос вернётся к тебе позже'
      ];
    };

    gen.phases = [{
      key:   'test',
      label: data.title || 'Тест',
      title: data.title || 'Тест',
      total: questions.length,
      hint:  data.hint || '',
      top:   [{ type: 'example-string', class: 'question'  }],
      bottom: function (ex) {
        return [
          ex.options.map(function (label, i) {
            return {
              type:  'checkbox',
              id:    'opt' + i,
              label: label,
              group: 'answer'
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
      check: function (collected, ex) {
        var chosen = null;
        for (var id in collected) {
          if (collected[id] === true) { chosen = id; break; }
        }
        if (chosen === null) {
          return { correct: false, expected: ex.options[ex.answer] };
        }
        var idx = parseInt(chosen.slice(3), 10);
        return {
          correct:  idx === ex.answer,
          expected: ex.options[ex.answer]
        };
      },
      formatAnswer: function (ex) {
        return ex.options[ex.answer];
      }
    }];
  }

})();