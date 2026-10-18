(function () {
  'use strict';

  /* ═════════════ DOM ═════════════ */

  var els = {
    screens: {
      start:  document.getElementById('screen-start'),
      task:   document.getElementById('screen-task'),
      result: document.getElementById('screen-result')
    },
    phaseLabel:    document.getElementById('phase-label'),
    progressLabel: document.getElementById('progress-label'),
    progressFill:  document.getElementById('progress-fill'),
    progressBar:   document.querySelector('.progressbar'),
    card:          document.getElementById('task-card'),
    topPanel:      document.getElementById('top-panel'),
    bottomPanel:   document.getElementById('bottom-panel'),
    btnCheck:      document.getElementById('btn-check'),
    btnBack:       document.getElementById('btn-back'),
    btnGotIt:      document.getElementById('btn-got-it'),
    feedback:      document.getElementById('feedback'),
    hint:          document.getElementById('hint'),
    overlay:       document.getElementById('overlay'),
    overlayIcon:   document.getElementById('overlay-icon'),
    banner:        document.getElementById('banner'),
    results:       document.getElementById('results'),
    resultSummary: document.getElementById('result-summary'),
    btnStart:      document.getElementById('btn-start'),
    btnRestart:    document.getElementById('btn-restart'),
    startSubtitle: document.getElementById('start-subtitle'),
    startRules:    document.getElementById('start-rules')
  };

  /* ═════════════ состояние ═════════════ */

  var state = {
    generator:   null,
    phaseIndex:  0,
    phase:       null,
    queue:       [],
    current:     null,
    solved:      0,
    allExamples: [],
    locked:      false,
    isInfo:      false,
    widgets:     [],
    groupIndex:  0,
    groupTotal:  0,
    history:     [],     /* { kind, phase, ex, correct?, expected?, collected? } */
    viewIndex:   null    /* null = live, число = индекс в history */
  };

  /* ═════════════ реестры элементов ═════════════ */

  var TopElements    = window.TopElements    = window.TopElements    || {};
  var AnswerElements = window.AnswerElements = window.AnswerElements || {};

  /* ═════════════ рендер текста с LaTeX ═════════════ */

  function renderText(el, text) {
    text = text == null ? '' : String(text);

    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/&lt;(\/?)(b|strong)&gt;/gi, '<$1$2>')
      .replace(/&lt;(\/?)(i|em)&gt;/gi, '<$1$2>')
      .replace(/&lt;(\/?)(ol|ul|li)&gt;/gi, '<$1$2>')
      .replace(/\r?\n/g, '<br>');

    el.innerHTML = html;

    if (typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true  },
          { left: '$',  right: '$',  display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true  }
        ],
        throwOnError: false
      });
    } catch (e) { /* оставляем как есть */ }
  }

  /* ═════════════ верхняя панель ═════════════ */

  TopElements['example-string'] = {
    build: function (container, descriptor, ctx) {
      var div = document.createElement('div');
      div.className = 'example' + (descriptor.class ? ' ' + descriptor.class : '');
      renderText(div, ctx.example.text);
      container.appendChild(div);
    }
  };

  TopElements['info-slide'] = {
    build: function (container, descriptor, ctx) {
      var wrap = document.createElement('div');
      wrap.className = 'info-slide';

      var ex = ctx.example;

      if (ex.title) {
        var t = document.createElement('div');
        t.className = 'info-title';
        renderText(t, ex.title);
        wrap.appendChild(t);
      }

      if (ex.text) {
        var b = document.createElement('div');
        b.className = 'info-body';
        renderText(b, ex.text);
        wrap.appendChild(b);
      }

      container.appendChild(wrap);
    }
  };

  TopElements['svg'] = {
    build: function (container, descriptor, ctx) {
      var wrap = document.createElement('div');
      wrap.className = 'svg-wrap' + (descriptor.class ? ' ' + descriptor.class : '');
      wrap.innerHTML = ctx.example.svg || '';
      container.appendChild(wrap);
    }
  };

  /* ═════════════ нижняя панель ═════════════ */

  AnswerElements.number = {
    build: function (container, descriptor, ctx) {
      var input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.className = 'answer-input';
      input.placeholder = descriptor.placeholder || '?';
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, 6);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); }
      });
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
        focus: function () { input.focus(); },
        restore: function (v) { input.value = v == null ? '' : String(v); }
      };
    }
  };

  AnswerElements.sign = {
    build: function (container) {
      var value = 1;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sign-toggle';
      btn.textContent = '−';
      btn.title = 'Переключить знак';
      btn.setAttribute('aria-label', 'Переключить знак');
      btn.addEventListener('click', function () {
        value = -value;
        btn.classList.toggle('active', value === -1);
      });
      container.appendChild(btn);
      return {
        read:  function () { return value; },
        lock:  function () { btn.disabled = true; },
        reset: function () {
          value = 1;
          btn.disabled = false;
          btn.classList.remove('active');
        },
        focus: function () { btn.focus(); },
        restore: function (v) {
          value = v === -1 ? -1 : 1;
          btn.classList.toggle('active', value === -1);
        }
      };
    }
  };

  AnswerElements.checkbox = {
    build: function (container, descriptor, ctx) {
      var wrap = document.createElement('label');
      wrap.className = 'checkbox-wrap';
      wrap.dataset.group = descriptor.group || '';

      var box = document.createElement('input');
      box.type = 'checkbox';

      var label = document.createElement('span');
      label.className = 'checkbox-label';
      renderText(label, descriptor.label || '');

      wrap.appendChild(box);
      wrap.appendChild(label);

      if (descriptor.group) {
        box.addEventListener('change', function () {
          if (!box.checked) return;
          var selector = '.checkbox-wrap[data-group="' + descriptor.group +
                         '"] input[type="checkbox"]';
          var all = ctx.card.querySelectorAll(selector);
          Array.prototype.forEach.call(all, function (other) {
            if (other !== box) other.checked = false;
          });
        });
      }

      container.appendChild(wrap);

      return {
        read:  function () { return !!box.checked; },
        lock:  function () { box.disabled = true; },
        reset: function () { box.checked = false; box.disabled = false; },
        focus: function () { box.focus(); },
        restore: function (v) { box.checked = !!v; }
      };
    }
  };

  AnswerElements.text = {
    build: function (container, descriptor, ctx) {
      var input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.className = 'answer-input text-input';
      input.placeholder = descriptor.placeholder || '?';

      var sel = { start: 0, end: 0 };

      function remember() {
        sel.start = input.selectionStart || 0;
        sel.end   = input.selectionEnd   || 0;
      }
      ['keyup', 'mouseup', 'select', 'input', 'click'].forEach(function (ev) {
        input.addEventListener(ev, remember);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); ctx.submit(); }
      });

      container.appendChild(input);

      return {
        read:  function () {
          var v = input.value.trim();
          return v === '' ? null : v;
        },
        lock:  function () { input.disabled = true; },
        reset: function () {
          input.value = '';
          input.disabled = false;
          sel = { start: 0, end: 0 };
        },
        focus: function () { input.focus(); },
        restore: function (v) { input.value = v == null ? '' : String(v); },
        insertAtCursor: function (text) {
          var start = (document.activeElement === input) ? input.selectionStart : sel.start;
          var end   = (document.activeElement === input) ? input.selectionEnd   : sel.end;
          var v = input.value;
          input.value = v.slice(0, start) + text + v.slice(end);
          var pos = start + text.length;
          input.setSelectionRange(pos, pos);
          remember();
        }
      };
    }
  };

  AnswerElements.insert = {
    build: function (container, descriptor, ctx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'insert-btn';
      btn.textContent = descriptor.label || descriptor.value || '';
      if (descriptor.title) btn.title = descriptor.title;

      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });

      btn.addEventListener('click', function () {
        var target = findWidgetById(descriptor.target);
        if (!target || typeof target.insertAtCursor !== 'function') return;
        target.insertAtCursor(descriptor.value != null ? descriptor.value : '');
      });

      container.appendChild(btn);
      return null;
    }
  };

  /* ═════════════ утилиты ═════════════ */

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      els.screens[k].classList.toggle('active', k === name);
    });
    window.scrollTo(0, 0);
  }

  function applyTheme(phase) {
    var theme = (phase && phase.theme) || 'default';
    document.body.setAttribute('data-theme', theme);
  }

  function selectGenerator() {
    var registry = window.ExampleGenerators || {};
    var ids = Object.keys(registry);
    if (!ids.length) return null;
    var wanted = null;
    try { wanted = new URLSearchParams(location.search).get('g'); } catch (e) {}
    return (wanted && registry[wanted]) ? registry[wanted] : registry[ids[0]];
  }

  function findWidgetById(id) {
    for (var i = 0; i < state.widgets.length; i++) {
      if (state.widgets[i].id === id) return state.widgets[i].handle;
    }
    return null;
  }

  /* ═════════════ построение панелей ═════════════ */

  function resolveSpec(spec, example) {
    if (typeof spec === 'function') return spec(example) || [];
    return spec || [];
  }

  function buildTopPanel(phase, example) {
    els.topPanel.innerHTML = '';
    resolveSpec(phase.top, example).forEach(function (desc) {
      var el = TopElements[desc.type];
      if (el) el.build(els.topPanel, desc, { example: example });
    });
  }

  function buildBottomPanel(phase, example) {
    els.bottomPanel.innerHTML = '';
    state.widgets = [];

    var ctx = {
      example: example,
      card:    els.card,
      submit:  checkAnswer
    };

    resolveSpec(phase.bottom, example).forEach(function (rowSpec) {
      var row = document.createElement('div');
      row.className = 'bottom-row';
      els.bottomPanel.appendChild(row);

      (rowSpec || []).forEach(function (desc) {
        var el = AnswerElements[desc.type];
        if (!el) return;
        var handle = el.build(row, desc, ctx);
        if (handle) state.widgets.push({ id: desc.id, handle: handle });
      });
    });
  }

  /* ═════════════ очередь и прогресс ═════════════ */

  function buildQueue(phase) {
    var used = {}, list = [], guard = 0;
    while (list.length < phase.total && guard++ < 20000) {
      var ex = phase.generate();
      if (!ex) break;
      var key = ex.key || ex.text;
      if (used[key]) continue;
      used[key] = true;
      list.push(Object.assign({}, ex, {
        phaseKey:   phase.key,
        phaseTitle: phase.title || phase.label,
        hadError:   false
      }));
    }
    return list;
  }

  function progressMode(phase) {
    if (phase.progress)     return phase.progress;
    if (phase.hideProgress) return 'hidden';
    if (phase.groupKey)     return 'group';
    return 'individual';
  }

  function updateHeader() {
    els.phaseLabel.textContent = state.phase.label;

    var mode = progressMode(state.phase);

    if (mode === 'hidden') {
      els.progressBar.style.display   = 'none';
      els.progressLabel.style.display = 'none';
      return;
    }
    els.progressBar.style.display   = '';
    els.progressLabel.style.display = '';

    if (mode === 'group') {
      els.progressLabel.textContent =
        'Шаг ' + state.groupIndex + ' / ' + state.groupTotal;
      els.progressFill.style.width =
        (state.groupIndex / state.groupTotal * 100) + '%';
      return;
    }

    if (state.isInfo) {
      var current = Math.min(state.solved + 1, state.phase.total);
      els.progressLabel.textContent = 'Слайд ' + current + ' / ' + state.phase.total;
      els.progressFill.style.width  = (state.solved / state.phase.total * 100) + '%';
      return;
    }

    els.progressLabel.textContent = 'Решено: ' + state.solved + ' / ' + state.phase.total;
    els.progressFill.style.width  = (state.solved / state.phase.total * 100) + '%';
  }

  function computeGroupInfo(phases, index) {
    if (progressMode(phases[index]) !== 'group') {
      return { index: 0, total: 0 };
    }
    var position = 0, total = 0;
    for (var i = 0; i < phases.length; i++) {
      if (progressMode(phases[i]) === 'group') {
        total++;
        if (i <= index) position++;
      }
    }
    return { index: position, total: total };
  }

  /* ═════════════ стартовый экран ═════════════ */

  function renderStartScreen() {
    var gen = selectGenerator();

    if (els.startSubtitle) {
      renderText(els.startSubtitle, gen && gen.name ? gen.name : '');
    }

    if (!els.startRules) return;
    els.startRules.innerHTML = '';

    var rules = gen && gen.rules;
    if (typeof rules === 'function') rules = rules();
    if (!Array.isArray(rules) || !rules.length) {
      rules = ['🎯 Ошибочный пример вернётся к тебе позже'];
    }
    rules.forEach(function (r) {
      var li = document.createElement('li');
      renderText(li, r);
      els.startRules.appendChild(li);
    });
  }

  /* ═════════════ подсказки ═════════════ */

  function getHint(phase, example) {
    var h = phase && phase.hint;
    if (typeof h === 'function') h = h(example);
    if (Array.isArray(h)) {
      h = h.length ? h[Math.floor(Math.random() * h.length)] : '';
    }
    return h || '';
  }

  function renderHint(phase) {
    renderText(els.hint, getHint(phase, state.current));
  }

  /* ═════════════ ход игры ═════════════ */

  function startGame() {
    var gen = selectGenerator();
    if (!gen) { alert('Генератор не подключён.'); return; }

    if (gen.ready && typeof gen.ready.then === 'function' && !gen._ready) return;

    state.generator   = gen;
    state.allExamples = [];
    state.history     = [];      /* единственная точка сброса истории */
    state.viewIndex   = null;
    startPhase(0);
  }

  function startPhase(index) {
    state.phaseIndex = index;
    state.phase      = state.generator.phases[index];
    state.solved     = 0;
    state.locked     = false;
    state.isInfo     = state.phase.kind === 'info';
    state.viewIndex  = null;
    /* history НЕ сбрасываем — она копится в течение всего урока */

    var gi = computeGroupInfo(state.generator.phases, index);
    state.groupIndex = gi.index;
    state.groupTotal = gi.total;

    state.queue = buildQueue(state.phase);
    if (!state.isInfo) {
      state.allExamples = state.allExamples.concat(state.queue);
    }

    updateHeader();
    showScreen('task');
    applyTheme(state.phase);

    if (state.phase.intro && index > 0) showBanner(state.phase.intro, nextExample);
    else nextExample();
  }

  function nextExample() {
    if (state.queue.length === 0) { finishPhase(); return; }

    state.current   = state.queue.shift();
    state.locked    = false;
    state.viewIndex = null;

    /* первый показ этого примера — кладём в историю */
    if (!state.current._inHistory) {
      state.current._inHistory = true;
      state.history.push({
        phase: state.phase,
        ex:    state.current,
        kind:  state.isInfo ? 'info' : 'task'
      });
    }

    displayCurrent();
  }

  function displayCurrent() {
    buildTopPanel(state.phase, state.current);

    if (state.isInfo) {
      els.bottomPanel.innerHTML = '';
      state.widgets = [];
    } else {
      buildBottomPanel(state.phase, state.current);
    }

    els.feedback.textContent = '';
    els.feedback.className   = 'feedback';
    els.btnGotIt.hidden      = true;
    els.btnCheck.disabled    = false;
    els.card.classList.remove('correct', 'wrong');
    els.card.classList.toggle('info-mode', state.isInfo);   /* ← NEW */

    renderHint(state.phase);
    updateNavButtons();

    if (!state.isInfo && state.widgets.length && state.widgets[0].handle.focus) {
      state.widgets[0].handle.focus();
    }
  }

  /* ═════════════ навигация ═════════════ */

  function updateNavButtons() {
    els.btnBack.hidden = false;

    if (state.viewIndex === null) {
      els.btnBack.disabled     = state.locked || state.history.length < 2;
      els.btnCheck.textContent = state.isInfo ? 'Дальше' : 'Проверить';
      return;
    }

    /* режим просмотра: смотрим на элемент под курсором */
    var current = state.history[state.viewIndex];
    els.btnBack.disabled = state.viewIndex === 0;

    if (current.kind === 'info') {
      els.btnCheck.textContent = 'Вперёд';
    } else {
      els.btnCheck.textContent = 'Вернуться';
    }
  }

  /* Показывает исторический элемент: слайд или отвеченный пример. */
  function showHistory(index) {
    if (index < 0 || index >= state.history.length) return;

    var entry = state.history[index];

    /* если это и есть текущий элемент — переключаемся в live-режим */
    if (entry.ex === state.current) {
      backToCurrent();
      return;
    }

    state.viewIndex = index;
    els.card.classList.toggle('info-mode', entry.kind === 'info');   /* ← NEW */

    if (entry.kind === 'info') {
      buildTopPanel(entry.phase, entry.ex);
      els.bottomPanel.innerHTML = '';
      state.widgets = [];
      els.feedback.textContent = '';
      els.feedback.className   = 'feedback';
      els.card.classList.remove('correct', 'wrong');
      els.btnGotIt.hidden   = true;
      els.btnCheck.disabled = false;
      updateNavButtons();
      return;
    }

    /* task */
    state.locked = true;

    buildTopPanel(entry.phase, entry.ex);
    buildBottomPanel(entry.phase, entry.ex);

    var collected = entry.ex._lastCollected;
    state.widgets.forEach(function (w) {
      if (collected && Object.prototype.hasOwnProperty.call(collected, w.id) &&
          w.handle.restore) {
        w.handle.restore(collected[w.id]);
      }
      if (w.handle.lock) w.handle.lock();
    });

       if (entry.ex.answered) {
      els.feedback.textContent = 'Верно!';
      els.feedback.className   = 'feedback ok';
      els.card.classList.add('correct');
      els.card.classList.remove('wrong');
    } else {
      /* ошибка: текст уже собран при ответе (ответ / подсказка / пусто) */
      renderText(els.feedback, entry.feedback || '');
      els.feedback.className = 'feedback bad';
      els.card.classList.add('wrong');
      els.card.classList.remove('correct');
    }

    els.btnGotIt.hidden   = true;
    els.btnCheck.disabled = false;
    updateNavButtons();
  }

  function backToCurrent() {
    state.viewIndex = null;
    state.locked    = false;
    displayCurrent();
  }

  function onBack() {
    if (state.viewIndex !== null) {
      if (state.viewIndex > 0) showHistory(state.viewIndex - 1);
      return;
    }

    /* во время паузы после верного ответа / ожидания «Понял» — не листаем */
    if (state.locked) return;

    /* последний элемент истории — это текущий пример,
       поэтому идём на один назад */
    if (state.history.length < 2) return;
    showHistory(state.history.length - 2);
  }

  /* ═════════════ сбор ответа ═════════════ */

  function saveUserAnswer(collected, ex) {
    if (ex.userAnswerText != null) return;

    for (var i = 0; i < state.widgets.length; i++) {
      var id = state.widgets[i].id;
      var v  = collected[id];

      if (v === null || v === undefined || v === false) continue;
      if (v === true) { ex.userAnswerText = '✓'; return; }
      if (typeof v === 'object' && v.num !== undefined && v.den !== undefined) {
        ex.userAnswerText = v.num + '/' + v.den;
        return;
      }
      ex.userAnswerText = String(v);
      return;
    }

    ex.userAnswerText = '—';
  }

  function collectAnswers() {
    var out = {};
    var firstEmpty = null;
    state.widgets.forEach(function (w) {
      var v = w.handle.read();
      out[w.id] = v;
      if (v === null && !firstEmpty) firstEmpty = w;
    });
    return { collected: out, firstEmpty: firstEmpty };
  }

  /* ═════════════ проверка ответа ═════════════ */

  function checkAnswer() {
    if (state.locked || !state.current) return;

    /* info-слайд: кнопка работает как «Дальше» */
    if (state.isInfo) {
      /* слайд уже записан в историю в nextExample — здесь не дублируем */

      state.solved++;
      updateHeader();
      if (state.queue.length === 0) finishPhase();
      else nextExample();
      return;
    }

    if (typeof state.phase.check !== 'function') {
      console.warn('Фаза «' + state.phase.key + '» не задаёт функцию check.');
      return;
    }

    var bag = collectAnswers();
    if (bag.firstEmpty) {
      if (bag.firstEmpty.handle.focus) bag.firstEmpty.handle.focus();
      return;
    }

    var result = state.phase.check(bag.collected, state.current);
    var correct, expected;
    if (result && typeof result === 'object') {
      correct  = !!result.correct;
      expected = result.expected;
    } else {
      correct = !!result;
    }

    state.locked = true;
    state.widgets.forEach(function (w) { w.handle.lock && w.handle.lock(); });
    els.btnCheck.disabled = true;
    els.btnBack.disabled  = true;

    if (correct) {
      state.solved++;
      state.current.answered        = true;              
      state.current._lastCollected  = bag.collected;

      els.card.classList.add('correct');
      playOverlay('✓', 'ok');
      els.feedback.textContent = 'Верно!';
      els.feedback.className   = 'feedback ok';
      updateHeader();

      setTimeout(function () {
        if (state.queue.length === 0) finishPhase();
        else nextExample();
      }, 850);
      return;
    }

    /* неверно: в историю попадёт при «Понял» */
    saveUserAnswer(bag.collected, state.current);
    state.current.hadError       = true;
    state.current.answered       = false;               /* ← NEW */
    state.current._lastCollected = bag.collected;        /* ← NEW */

    var action = state.phase.wrongAction || 'showAnswer';
    var feedbackText = '';

    if (action === 'showAnswer') {
      var ansText = expected != null
        ? String(expected)
        : (typeof state.phase.formatAnswer === 'function'
            ? state.phase.formatAnswer(state.current)
            : String(state.current.answer));
      feedbackText = 'Правильный ответ: ' + ansText;
    } else if (action === 'showHint') {
      feedbackText = getHint(state.phase, state.current);
    }

    state.current._pendingHistory = {
      kind:      'task',
      phase:     state.phase,
      ex:        state.current,
      correct:   false,
      feedback:  feedbackText,
      collected: bag.collected
    };

    els.card.classList.add('wrong');
    playOverlay('✗', 'bad');
    renderText(els.feedback, feedbackText);
    els.feedback.className = 'feedback bad';
    els.btnGotIt.hidden    = false;
    els.btnGotIt.focus();
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

  /* ═════════════ финальный экран ═════════════ */

  var MAX_QUESTION_LENGTH = 100;

  function truncateQuestion(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;

    var cut = text.slice(0, max);

    var lastOpen  = cut.lastIndexOf('<');
    var lastClose = cut.lastIndexOf('>');
    if (lastOpen > lastClose) cut = cut.slice(0, lastOpen);

    var dollars = (cut.match(/\$/g) || []).length;
    if (dollars % 2 !== 0) cut = cut.slice(0, cut.lastIndexOf('$'));

    return cut.trim() + '…';
  }

  function getUserAnswerText(ex) {
    if (ex.userAnswerText != null) return String(ex.userAnswerText);

    var collected = ex.userAnswer;
    if (!collected) return null;

    var keys = Object.keys(collected);
    if (keys.length !== 1) return null;

    var v = collected[keys[0]];
    if (v === null || v === undefined || v === false) return null;
    if (v === true) return '✓';
    if (typeof v === 'object' && v.num !== undefined && v.den !== undefined) {
      return v.num + '/' + v.den;
    }
    return String(v);
  }

  function buildResultItem(phase, ex) {
    var div = document.createElement('div');
    div.className = 'result-item ' + (ex.hadError ? 'bad' : 'ok');

    var qEl = document.createElement('div');
    qEl.className = 'result-question';
    var qText = String(ex.text != null ? ex.text : '');
    renderText(qEl, truncateQuestion(qText, MAX_QUESTION_LENGTH));
    div.appendChild(qEl);

    var aEl = document.createElement('div');
    aEl.className = 'result-answers';

    var correctText = (typeof phase.formatAnswer === 'function')
      ? String(phase.formatAnswer(ex))
      : String(ex.answer);

    var cEl = document.createElement('span');
    cEl.className = 'result-correct';
    renderText(cEl, correctText);
    aEl.appendChild(cEl);

    if (ex.hadError) {
      var userText = getUserAnswerText(ex);
      if (userText) {
        var uEl = document.createElement('span');
        uEl.className = 'result-user';
        uEl.textContent = '(' + userText + ')';
        aEl.appendChild(uEl);
      }
    }

    div.appendChild(aEl);
    return div;
  }

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
      if (phase.kind === 'info') return;
      var items = state.allExamples.filter(function (e) { return e.phaseKey === phase.key; });
      if (!items.length) return;

      var h = document.createElement('h2');
      h.textContent = phase.title || phase.label;
      els.results.appendChild(h);

      var grid = document.createElement('div');
      grid.className = 'results-grid';

      items.forEach(function (e) {
        grid.appendChild(buildResultItem(phase, e));
      });
      els.results.appendChild(grid);
    });
  }

  /* ═════════════ анимации ═════════════ */

  function playOverlay(symbol, kind) {
    els.overlayIcon.textContent = symbol;
    els.overlayIcon.className   = 'overlay-icon ' + kind;
    els.overlay.classList.remove('show');
    void els.overlay.offsetWidth;
    els.overlay.classList.add('show');
  }

  function showBanner(html, cb) {
    renderText(els.banner, html);
    els.banner.classList.add('show');
    setTimeout(function () {
      els.banner.classList.remove('show');
      setTimeout(cb, 50);
    }, 300);
  }

  /* ═════════════ события ═════════════ */

  els.btnStart.addEventListener('click',   startGame);
  els.btnRestart.addEventListener('click', startGame);
  els.btnGotIt.addEventListener('click',   onGotIt);
  els.btnBack.addEventListener('click',    onBack);

  els.btnCheck.addEventListener('click', function () {
    if (state.viewIndex === null) {
      checkAnswer();
      return;
    }

    var current = state.history[state.viewIndex];

    /* info-слайд: шагаем на один вперёд */
    if (current.kind === 'info') {
      if (state.viewIndex + 1 < state.history.length) {
        showHistory(state.viewIndex + 1);
      } else {
        backToCurrent();
      }
      return;
    }

    /* task-элемент: прыгаем к live одним нажатием */
    backToCurrent();
  });

  /* ═════════════ инициализация стартового экрана ═════════════ */

  (function waitForStartInfo(tries) {
    tries = tries || 0;
    var gen = selectGenerator();

    if (!gen) {
      renderStartScreen();
      if (tries < 30) setTimeout(function () { waitForStartInfo(tries + 1); }, 100);
      return;
    }

    if (gen.ready && typeof gen.ready.then === 'function' && !gen._ready) {
      els.btnStart.disabled = true;
      var finish = function () {
        gen._ready = true;
        renderStartScreen();
        els.btnStart.disabled = false;
      };
      gen.ready.then(finish).catch(finish);
      return;
    }

    renderStartScreen();
  })();

})();