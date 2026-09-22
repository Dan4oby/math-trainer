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
    hint:          document.getElementById('hint'),
    overlay:       document.getElementById('overlay'),
    overlayIcon:   document.getElementById('overlay-icon'),
    banner:        document.getElementById('banner'),
    results:       document.getElementById('results'),
    resultSummary: document.getElementById('result-summary'),
    btnStart:      document.getElementById('btn-start'),
    btnRestart:    document.getElementById('btn-restart')
  };

  /* ───────────── состояние ───────────── */
  var state = {
    generator:   null,
    phaseIndex:  0,
    phase:       null,
    queue:       [],
    current:     null,
    solved:      0,
    allExamples: [],
    locked:      false,
    widget:      null,   // handle текущего виджета
    widgetDef:   null    // определение текущего виджета (для format/compare)
  };

  /* ───────────── утилиты ───────────── */
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
      alert('Не подключено ни одного генератора примеров.');
      return null;
    }
    var wanted = null;
    try { wanted = new URLSearchParams(location.search).get('g'); } catch (e) {}
    return (wanted && registry[wanted]) ? registry[wanted] : registry[ids[0]];
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

  /* ───────────── реестр виджетов ввода ───────────── */
  var AnswerInputs = window.AnswerInputs = window.AnswerInputs || {};

  /* вспомогательные конструкторы полей */
  function makeNumericInput(id, placeholder) {
    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.id = id;
    input.placeholder = placeholder;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); }
    });
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });
    return input;
  }

  function makeSignToggle(signState) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sign-toggle';
    b.textContent = '−';
    b.title = 'Переключить знак';
    b.setAttribute('aria-label', 'Переключить знак');
    b.addEventListener('click', function () {
      signState.negative = !signState.negative;
      b.classList.toggle('active', signState.negative);
    });
    return b;
  }

  function makeFractionPart(id, placeholder) {
    var input = makeNumericInput(id, placeholder);
    input.className = 'fraction-part';
    return input;
  }

  /* ── integer ── */
  AnswerInputs.integer = {
    build: function (container) {
      var input = makeNumericInput('answer-input', '?');
      container.appendChild(input);
      return {
        read:  function () {
          var raw = input.value.trim();
          if (raw === '') return null;
          var v = parseInt(raw, 10);
          return isFinite(v) ? v : null;
        },
        lock:  function () { input.disabled = true; },
        reset: function () { input.value = ''; input.disabled = false; },
        focus: function () { input.focus(); }
      };
    },
    format: function (v) { return String(v); }
  };

  /* ── signed-integer ── */
  AnswerInputs['signed-integer'] = {
    build: function (container) {
      var signState = { negative: false };
      var toggle = makeSignToggle(signState);
      var input  = makeNumericInput('answer-input', '?');
      container.appendChild(toggle);
      container.appendChild(input);
      return {
        read: function () {
          var raw = input.value.trim();
          if (raw === '') return null;
          var v = parseInt(raw, 10);
          if (!isFinite(v)) return null;
          return signState.negative ? -v : v;
        },
        lock: function () {
          input.disabled = true;
          toggle.disabled = true;
        },
        reset: function () {
          input.value = '';
          input.disabled = false;
          toggle.disabled = false;
          signState.negative = false;
          toggle.classList.remove('active');
        },
        focus: function () { input.focus(); }
      };
    },
    format: function (v) { return String(v); }
  };

  /* ── fraction ── */
  AnswerInputs.fraction = {
    build: function (container) {
      var signState = { negative: false };
      var toggle = makeSignToggle(signState);
      var wrap = document.createElement('div');
      wrap.className = 'fraction-input';
      var num = makeFractionPart('answer-num', '?');
      var bar = document.createElement('div');
      bar.className = 'fraction-bar';
      var den = makeFractionPart('answer-den', '?');
      wrap.appendChild(num);
      wrap.appendChild(bar);
      wrap.appendChild(den);
      container.appendChild(toggle);
      container.appendChild(wrap);
      return {
        read: function () {
          var ns = num.value.trim(), ds = den.value.trim();
          if (ns === '' || ds === '') return null;
          var n = parseInt(ns, 10), d = parseInt(ds, 10);
          if (!isFinite(n) || !isFinite(d) || d === 0) return null;
          if (signState.negative) n = -n;
          return { num: n, den: d };
        },
        lock: function () {
          num.disabled = true;
          den.disabled = true;
          toggle.disabled = true;
        },
        reset: function () {
          num.value = ''; den.value = '';
          num.disabled = false; den.disabled = false;
          toggle.disabled = false;
          signState.negative = false;
          toggle.classList.remove('active');
        },
        focus: function () { num.focus(); }
      };
    },
    format: function (v) {
      var f = normalizeFraction(v);
      if (!f) return String(v);
      return f.den === 1 ? String(f.num) : f.num + '/' + f.den;
    },
    compare: function (user, correct) {
      var u = normalizeFraction(user), c = normalizeFraction(correct);
      if (!u || !c) return false;
      return u.num === c.num && u.den === c.den;
    }
  };

  /* ── choice — кнопки-варианты ── */
  AnswerInputs.choice = {
    build: function (container, phase) {
      var options = (phase && phase.options) || [];
      var selected = { value: null };
      var buttons = [];

      options.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice-btn';
        b.textContent = opt.label != null ? opt.label : String(opt.value);
        b.addEventListener('click', function () {
          if (b.disabled) return;
          selected.value = opt.value;
          buttons.forEach(function (x) { x.classList.remove('selected'); });
          b.classList.add('selected');
        });
        b.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); }
        });
        buttons.push(b);
        container.appendChild(b);
      });

      return {
        read:  function () { return selected.value; },
        lock:  function () { buttons.forEach(function (b) { b.disabled = true; }); },
        reset: function () {
          selected.value = null;
          buttons.forEach(function (b) {
            b.disabled = false;
            b.classList.remove('selected');
          });
        },
        focus: function () { if (buttons[0]) buttons[0].focus(); }
      };
    },
    format: function (v) { return v == null ? '—' : String(v); }
  };

  /* ───────────── выбор виджета для фазы ───────────── */
  function widgetDefinitionFor(phase) {
    if (phase.inputWidget) return phase.inputWidget;
    var name = phase.inputMode || 'integer';
    return AnswerInputs[name] || AnswerInputs.integer;
  }

  function formatValue(def, v) {
    if (def && typeof def.format === 'function') return def.format(v);
    return String(v);
  }

  function answersEqual(user, correct) {
    if (state.phase && typeof state.phase.compare === 'function') {
      return state.phase.compare(user, correct);
    }
    if (state.widgetDef && typeof state.widgetDef.compare === 'function') {
      return state.widgetDef.compare(user, correct);
    }
    return user === correct;
  }

  /* ───────────── построение UI фазы ───────────── */
  function renderAnswerFields(phase) {
    var c = els.answerFields;
    c.innerHTML = '';
    state.widgetDef = widgetDefinitionFor(phase);
    state.widget    = state.widgetDef.build(c, phase);
  }

  function renderHint(phase) {
    var h = phase && phase.hint;

    if (typeof h === 'function') h = h(state.current);

    if (Array.isArray(h)) {
      if (!h.length) { els.hint.textContent = ''; return; }
      h = h[Math.floor(Math.random() * h.length)];
    }

    els.hint.textContent = h || '';
  }

  /* ───────────── очередь примеров ───────────── */
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
        widgetDef:  state.widgetDef,   // ссылка на виджет — для format на финале
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

    renderAnswerFields(state.phase);
    state.queue       = buildQueue(state.phase);
    state.allExamples = state.allExamples.concat(state.queue);

    updateHeader();
    showScreen('task');
    

    if (state.phase.intro && index > 0) showBanner(state.phase.intro, nextExample);
    else nextExample();
  }

  function nextExample() {
    if (state.queue.length === 0) { finishPhase(); return; }

    state.current = state.queue.shift();
    state.locked  = false;

    els.example.textContent  = state.current.text;
    els.feedback.textContent = '';
    els.feedback.className   = 'feedback';
    els.btnGotIt.hidden      = true;
    els.btnCheck.disabled    = false;
    els.card.classList.remove('correct', 'wrong');

    renderHint(state.phase);
    if (state.widget) { state.widget.reset(); state.widget.focus(); }
  }

  function checkAnswer() {
    if (state.locked || !state.current || !state.widget) return;

    var user = state.widget.read();
    if (user === null) { state.widget.focus(); return; }

    var ex = state.current;
    state.locked = true;
    state.widget.lock();
    els.btnCheck.disabled = true;

    if (answersEqual(user, ex.answer)) {
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
      ex.hadError = true;
      els.card.classList.add('wrong');
      playOverlay('✗', 'bad');
      els.feedback.textContent = 'Правильный ответ: ' + formatValue(state.widgetDef, ex.answer);
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

  /* ───────────── финал ───────────── */
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
        div.textContent = e.text + ' = ' + formatValue(e.widgetDef, e.answer);

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