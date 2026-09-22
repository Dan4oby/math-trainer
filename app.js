(function () {
  'use strict';

  /* ───────────── DOM ───────────── */
  var els = {
    screens: {
      start:  document.getElementById('screen-start'),
      task:   document.getElementById('screen-task'),
      result: document.getElementById('screen-result')
    },
    phaseLabel:    document.getElementById('phase-label'),
    progressLabel: document.getElementById('progress-label'),
    progressFill:  document.getElementById('progress-fill'),
    card:          document.getElementById('task-card'),
    example:       document.getElementById('example'),
    answerFields:  document.getElementById('answer-fields'),
    btnCheck:      document.getElementById('btn-check'),
    btnGotIt:      document.getElementById('btn-got-it'),
    feedback:      document.getElementById('feedback'),
    overlay:       document.getElementById('overlay'),
    overlayIcon:   document.getElementById('overlay-icon'),
    banner:        document.getElementById('banner'),
    results:       document.getElementById('results'),
    resultSummary: document.getElementById('result-summary'),
    btnStart:      document.getElementById('btn-start'),
    btnRestart:    document.getElementById('btn-restart'),

    // заполняется динамически в renderAnswerFields():
    input:     null,   // <input> для режимов integer / signed-integer
    answerNum: null,   // числитель (только для режима fraction)
    answerDen: null    // знаменатель (только для режима fraction)
  };

  /* ───────────── состояние ───────────── */
  var state = {
    generator:     null,
    phaseIndex:    0,
    phase:         null,
    queue:         [],
    current:       null,
    solved:        0,
    allExamples:   [],
    locked:        false,
    signNegative:  false   // текущее состояние кнопки «±»
  };

  /* ───────────── вспомогательные ───────────── */

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      els.screens[k].classList.toggle('active', k === name);
    });
    window.scrollTo(0, 0);
  }

  function pickGenerator() {
    var registry = window.ExampleGenerators || {};
    var ids = Object.keys(registry);
    if (!ids.length) {
      alert('Не подключено ни одного генератора примеров.\n' +
            'Подключите файл генератора в index.html до app.js.');
      return null;
    }
    var wanted = null;
    try { wanted = new URLSearchParams(location.search).get('g'); } catch (e) {}

    return (wanted && registry[wanted]) ? registry[wanted] : registry[ids[0]];
  }

  function phaseMode(phase) {
    return phase.inputMode || 'integer';
  }

  /* ───────────── генерация очереди ───────────── */

  function buildQueue(phase) {
    var used = {}, list = [], guard = 0;
    while (list.length < phase.total && guard++ < 20000) {
      var ex = phase.generate();
      if (!ex) break;
      var key = ex.key || ex.text;
      if (used[key]) continue;
      used[key] = true;

      list.push({
        text:       ex.text,
        answer:     ex.answer,
        phaseKey:   phase.key,
        phaseTitle: phase.title || phase.label,
        phaseMode:  phaseMode(phase),
        hadError:   false
      });
    }
    return list;
  }

  function updateHeader() {
    els.phaseLabel.textContent    = state.phase.label;
    els.progressLabel.textContent = 'Решено: ' + state.solved + ' / ' + state.phase.total;
    els.progressFill.style.width  = (state.solved / state.phase.total * 100) + '%';
  }

  /* ───────────── построение полей ответа ───────────── */

  function renderAnswerFields(mode) {
    var c = els.answerFields;
    c.innerHTML = '';
    state.signNegative = false;

    if (mode === 'signed-integer' || mode === 'fraction') {
      c.appendChild(createSignToggle());
    }

    if (mode === 'fraction') {
      c.appendChild(createFractionInput());
    } else {
      c.appendChild(createIntegerInput());
    }
  }

  function createSignToggle() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sign-toggle';
    b.textContent = '−';
    b.title = 'Переключить знак';
    b.setAttribute('aria-label', 'Переключить знак');
    b.addEventListener('click', function () {
      state.signNegative = !state.signNegative;
      b.classList.toggle('active', state.signNegative);
    });
    return b;
  }

  function createIntegerInput() {
    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.id = 'answer-input';
    input.placeholder = '?';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); }
    });
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });
    els.input = input;
    els.answerNum = null;
    els.answerDen = null;
    return input;
  }

  function createFractionInput() {
    var wrap = document.createElement('div');
    wrap.className = 'fraction-input';

    var num = makeFractionPart('answer-num', '?');
    var bar = document.createElement('div');
    bar.className = 'fraction-bar';
    var den = makeFractionPart('answer-den', '?');

    wrap.appendChild(num);
    wrap.appendChild(bar);
    wrap.appendChild(den);

    els.input = null;
    els.answerNum = num;
    els.answerDen = den;
    return wrap;
  }

  function makeFractionPart(id, placeholder) {
    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.id = id;
    input.placeholder = placeholder;
    input.className = 'fraction-part';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); }
    });
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });
    return input;
  }

  function resetAnswerFields() {
    var mode = phaseMode(state.phase);
    state.signNegative = false;
    var toggle = document.querySelector('.sign-toggle');
    if (toggle) {
      toggle.classList.remove('active');
      toggle.disabled = false;
    }

    if (mode === 'fraction') {
      els.answerNum.value = '';
      els.answerNum.disabled = false;
      els.answerDen.value = '';
      els.answerDen.disabled = false;
      els.answerNum.focus();
    } else if (els.input) {
      els.input.value = '';
      els.input.disabled = false;
      els.input.focus();
    }
  }

  function lockAnswerFields() {
    var mode = phaseMode(state.phase);
    if (mode === 'fraction') {
      els.answerNum.disabled = true;
      els.answerDen.disabled = true;
    } else if (els.input) {
      els.input.disabled = true;
    }
    var toggle = document.querySelector('.sign-toggle');
    if (toggle) toggle.disabled = true;
  }

  /* ───────────── чтение и сравнение ответов ───────────── */

  function readAnswer(mode) {
    if (mode === 'fraction') {
      var nRaw = els.answerNum.value.trim();
      var dRaw = els.answerDen.value.trim();
      if (nRaw === '' || dRaw === '') return null;
      var n = parseInt(nRaw, 10);
      var d = parseInt(dRaw, 10);
      if (!isFinite(n) || !isFinite(d) || d === 0) return null;
      if (state.signNegative) n = -n;
      return { num: n, den: d };
    }

    if (!els.input) return null;
    var raw = els.input.value.trim();
    if (raw === '') return null;
    var v = parseInt(raw, 10);
    if (!isFinite(v)) return null;
    if (mode === 'signed-integer' && state.signNegative) v = -v;
    return v;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    while (b) { var t = b; b = a % b; a = t; }
    return a || 1;
  }

  function normalizeFraction(f) {
    if (f === null || f === undefined) return null;
    if (typeof f === 'number') f = { num: f, den: 1 };
    var num = f.num, den = f.den;
    if (!den) return null;
    if (den < 0) { num = -num; den = -den; }
    if (num === 0) return { num: 0, den: 1 };
    var g = gcd(num, den);
    return { num: num / g, den: den / g };
  }

  function answersEqual(mode, user, correct) {
    if (mode === 'fraction') {
      var u = normalizeFraction(user);
      var c = normalizeFraction(correct);
      if (!u || !c) return false;
      return u.num === c.num && u.den === c.den;
    }
    return user === correct;
  }

  function formatAnswer(mode, a) {
    if (mode === 'fraction') {
      var f = normalizeFraction(a);
      if (!f) return String(a);
      return f.den === 1 ? String(f.num) : f.num + '/' + f.den;
    }
    return String(a);
  }

  /* ───────────── ход игры ───────────── */

  function startGame() {
    var gen = pickGenerator();
    if (!gen) return;
    state.generator   = gen;
    state.allExamples = [];
    startPhase(0);
  }

  function startPhase(index) {
    state.phaseIndex = index;
    state.phase      = state.generator.phases[index];
    state.solved     = 0;
    state.locked     = false;
    state.queue      = buildQueue(state.phase);
    state.allExamples = state.allExamples.concat(state.queue);

    updateHeader();
    showScreen('task');
    renderAnswerFields(phaseMode(state.phase));

    if (state.phase.intro && index > 0) {
      showBanner(state.phase.intro, nextExample);
    } else {
      nextExample();
    }
  }

  function nextExample() {
    if (state.queue.length === 0) { finishPhase(); return; }

    var ex = state.queue.shift();
    state.current = ex;
    state.locked  = false;

    els.example.textContent  = ex.text;
    els.feedback.textContent = '';
    els.feedback.className   = 'feedback';
    els.btnGotIt.hidden      = true;
    els.card.classList.remove('correct', 'wrong');
    els.btnCheck.disabled    = false;

    resetAnswerFields();
  }

  function checkAnswer() {
    if (state.locked || !state.current) return;

    var mode = phaseMode(state.phase);
    var user = readAnswer(mode);
    if (user === null) {
      // фокус туда, где пусто
      if (mode === 'fraction') {
        if (!els.answerNum.value) els.answerNum.focus();
        else els.answerDen.focus();
      } else if (els.input) {
        els.input.focus();
      }
      return;
    }

    var ex = state.current;
    state.locked = true;
    lockAnswerFields();
    els.btnCheck.disabled = true;

    if (answersEqual(mode, user, ex.answer)) {
      /* ─── ВЕРНО ─── */
      state.solved++;
      els.card.classList.add('correct');
      playOverlay('✓', 'ok');
      els.feedback.textContent = 'Верно!';
      els.feedback.className   = 'feedback ok';
      updateHeader();

      setTimeout(function () {
        if (state.queue.length === 0) finishPhase();
        else nextExample();
      }, 850);

    } else {
      /* ─── НЕВЕРНО ─── */
      ex.hadError = true;
      els.card.classList.add('wrong');
      playOverlay('✗', 'bad');
      els.feedback.textContent = 'Правильный ответ: ' + formatAnswer(mode, ex.answer);
      els.feedback.className   = 'feedback bad';
      els.btnGotIt.hidden      = false;
      els.btnGotIt.focus();
    }
  }

  function onGotIt() {
    if (!state.locked || !state.current) return;
    state.queue.push(state.current);
    nextExample();
  }

  function finishPhase() {
    var next = state.phaseIndex + 1;
    if (next < state.generator.phases.length) startPhase(next);
    else showResults();
  }

  /* ───────────── финальный экран ───────────── */

  function showResults() {
    showScreen('result');

    var total  = state.allExamples.length;
    var errors = state.allExamples.filter(function (e) { return e.hadError; }).length;

    els.resultSummary.textContent =
      'Примеров: ' + total +
      ' · без ошибок: ' + (total - errors) +
      ' · с ошибками: ' + errors;

    els.results.innerHTML = '';

    state.generator.phases.forEach(function (phase) {
      var items = state.allExamples.filter(function (e) { return e.phaseKey === phase.key; });
      if (!items.length) return;

      var h = document.createElement('h2');
      h.textContent = phase.title || phase.label;
      els.results.appendChild(h);

      var grid = document.createElement('div');
      grid.className = 'results-grid';

      items.forEach(function (e) {
        var div = document.createElement('div');
        div.className = 'result-item ' + (e.hadError ? 'bad' : 'ok');
        div.textContent = e.text + ' = ' + formatAnswer(e.phaseMode, e.answer);

        if (e.hadError) {
          var note = document.createElement('span');
          note.className = 'note';
          note.textContent = 'решён с ошибкой';
          div.appendChild(note);
        }
        grid.appendChild(div);
      });

      els.results.appendChild(grid);
    });
  }

  /* ───────────── анимации ───────────── */

  function playOverlay(symbol, kind) {
    els.overlayIcon.textContent = symbol;
    els.overlayIcon.className   = 'overlay-icon ' + kind;
    els.overlay.classList.remove('show');
    void els.overlay.offsetWidth;
    els.overlay.classList.add('show');
  }

  function showBanner(html, cb) {
    els.banner.innerHTML = html;
    els.banner.classList.add('show');
    setTimeout(function () {
      els.banner.classList.remove('show');
      setTimeout(cb, 320);
    }, 1600);
  }

  /* ───────────── события ───────────── */

  els.btnStart.addEventListener('click',   startGame);
  els.btnRestart.addEventListener('click', startGame);
  els.btnCheck.addEventListener('click',   checkAnswer);
  els.btnGotIt.addEventListener('click',   onGotIt);

})();