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
    topPanel:      document.getElementById('top-panel'),
    bottomPanel:   document.getElementById('bottom-panel'),
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
    btnRestart:    document.getElementById('btn-restart'),
    startSubtitle: document.getElementById('start-subtitle'),
    startRules:    document.getElementById('start-rules')
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
    widgets:     []
  };

  /* ───────────── реестры элементов ───────────── */
  var TopElements    = window.TopElements    = window.TopElements    || {};
  var AnswerElements = window.AnswerElements = window.AnswerElements || {};

  /* ───────────── рендер текста с LaTeX ───────────── */
  /* Обычный текст выводится как есть, <br> и \n превращаются в перенос.
     Если строка содержит $...$, KaTeX (auto-render) сам найдёт формулы. */
  function renderText(el, text) {
    text = text == null ? '' : String(text);

    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
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
    } catch (e) { /* оставляем текст как есть */ }
  }

  /* ───────────── верхняя панель ───────────── */

  /* строка примера; descriptor.class позволяет задать свой CSS-класс */
  TopElements['example-string'] = {
    build: function (container, descriptor, ctx) {
      var div = document.createElement('div');
      div.className = 'example' + (descriptor.class ? ' ' + descriptor.class : '');
      renderText(div, ctx.example.text);
      container.appendChild(div);
    }
  };

  /* ───────────── нижняя панель ───────────── */

  /* поле положительного числа */
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
        focus: function () { input.focus(); }
      };
    }
  };

  /* кнопка «±» — read() возвращает 1 или -1 */
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
        focus: function () { btn.focus(); }
      };
    }
  };

  /* чекбокс; при descriptor.group — радио-поведение внутри группы */
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
        focus: function () { box.focus(); }
      };
    }
  };

  /* ───────────── утилиты ───────────── */
  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      els.screens[k].classList.toggle('active', k === name);
    });
    window.scrollTo(0, 0);
  }

  /* По ?g=... или первый зарегистрированный генератор. */
  function selectGenerator() {
    var registry = window.ExampleGenerators || {};
    var ids = Object.keys(registry);
    if (!ids.length) return null;
    var wanted = null;
    try { wanted = new URLSearchParams(location.search).get('g'); } catch (e) {}
    return (wanted && registry[wanted]) ? registry[wanted] : registry[ids[0]];
  }

  /* ───────────── построение панелей ───────────── */

  /* спецификация панели может быть массивом или функцией(example) → массив */
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

  /* ───────────── очередь ───────────── */

  /* Набираем total уникальных примеров (по ключу ex.key || ex.text). */
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

  function updateHeader() {
    els.phaseLabel.textContent    = state.phase.label;
    els.progressLabel.textContent = 'Решено: ' + state.solved + ' / ' + state.phase.total;
    els.progressFill.style.width  = (state.solved / state.phase.total * 100) + '%';
  }

  /* ───────────── стартовый экран ───────────── */
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

  /* ───────────── подсказки ───────────── */

  /* hint: строка | массив строк | функция(example) → строка или массив */
  function renderHint(phase) {
    var h = phase && phase.hint;
    if (typeof h === 'function') h = h(state.current);
    if (Array.isArray(h)) {
      h = h.length ? h[Math.floor(Math.random() * h.length)] : '';
    }
    renderText(els.hint, h || '');
  }

  /* ───────────── ход игры ───────────── */
  function startGame() {
    var gen = selectGenerator();
    if (!gen) { alert('Генератор не подключён.'); return; }

    /* кнопка должна быть выключена, но на всякий случай */
    if (gen.ready && typeof gen.ready.then === 'function' && !gen._ready) return;

    state.generator   = gen;
    state.allExamples = [];
    startPhase(0);
  }

  function startPhase(index) {
    state.phaseIndex = index;
    state.phase      = state.generator.phases[index];
    state.solved     = 0;
    state.locked     = false;

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

    buildTopPanel(state.phase, state.current);
    buildBottomPanel(state.phase, state.current);

    els.feedback.textContent = '';
    els.feedback.className   = 'feedback';
    els.btnGotIt.hidden      = true;
    els.btnCheck.disabled    = false;
    els.card.classList.remove('correct', 'wrong');

    renderHint(state.phase);

    if (state.widgets.length && state.widgets[0].handle.focus) {
      state.widgets[0].handle.focus();
    }
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

  function checkAnswer() {
    if (state.locked || !state.current) return;
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

    if (correct) {
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
      return;
    }

    /* неверно — показываем правильный ответ и ждём «Понял» */
    state.current.hadError = true;
    els.card.classList.add('wrong');
    playOverlay('✗', 'bad');

    var ansText = expected != null
      ? String(expected)
      : (typeof state.phase.formatAnswer === 'function'
          ? state.phase.formatAnswer(state.current)
          : String(state.current.answer));

    renderText(els.feedback, 'Правильный ответ: ' + ansText);
    els.feedback.className = 'feedback bad';
    els.btnGotIt.hidden    = false;
    els.btnGotIt.focus();
  }

  /* «Понял» — пример возвращается в конец очереди */
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

        var answerText = (typeof phase.formatAnswer === 'function')
          ? phase.formatAnswer(e)
          : String(e.answer);

        renderText(div, e.text + '   ' + answerText);

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
    void els.overlay.offsetWidth;   /* перезапуск CSS-анимации */
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

  /* ───────────── инициализация стартового экрана ───────────── */
  /* Ждём появления генератора (если он регистрируется асинхронно),
     затем — его ready (если данные грузятся через fetch).
     Кнопка «Начать» включается только когда всё готово. */
  (function waitForStartInfo(tries) {
    tries = tries || 0;
    var gen = selectGenerator();

    /* генератора пока нет — ждём до 3 секунд */
    if (!gen) {
      renderStartScreen();
      if (tries < 30) setTimeout(function () { waitForStartInfo(tries + 1); }, 100);
      return;
    }

    /* генератор есть, но данные ещё грузятся — ждём ready */
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

    /* всё готово */
    renderStartScreen();
  })();

})();