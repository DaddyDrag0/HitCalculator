(() => {
  const $ = (id) => document.getElementById(id);
  let resultMode = 'regular';
  let weatherRetry = null;

  function resultsRoot() {
    return $('rsResults');
  }

  function fastPanel() {
    return $('rsFastEstimateTestResults');
  }

  function syncFastPanel() {
    const results = resultsRoot();
    const panel = fastPanel();
    if (!results || !panel) return;

    if (resultMode === 'fast') {
      if (panel.parentElement !== results || results.children.length !== 1 || results.firstElementChild !== panel) {
        results.replaceChildren(panel);
      }
      return;
    }

    panel.remove();
  }

  function showRegularRunning() {
    const results = resultsRoot();
    if (!results) return;
    results.innerHTML = '<div class="rs-empty-results"><strong>Simulation running…</strong><span>The regular simulation will replace the previous estimate when it finishes.</span></div>';
  }

  function weatherNode(panel, wrap, selector) {
    return wrap.querySelector(`:scope > ${selector}`) || panel.querySelector(`:scope > ${selector}`);
  }

  function orderWeatherPanel(panel) {
    const pack = panel.querySelector(':scope > .rs-pack-section');
    if (!pack) return false;

    let wrap = panel.querySelector(':scope > .rs-fast-weather-section');
    if (!wrap) {
      wrap = document.createElement('section');
      wrap.className = 'rs-fast-weather-section';
      wrap.innerHTML = '<div class="rs-fast-category-title">Weather</div>';
    } else if (!wrap.querySelector(':scope > .rs-fast-category-title')) {
      wrap.insertAdjacentHTML('afterbegin', '<div class="rs-fast-category-title">Weather</div>');
    }

    const oldTitle = [...panel.children].find((node) =>
      node.classList?.contains('rs-subtitle') && node.textContent.trim() === 'Weather'
    );
    const mode = weatherNode(panel, wrap, '.rs-weather-mode');
    const fixed = weatherNode(panel, wrap, '.rs-fixed-weather');
    const schedule = weatherNode(panel, wrap, '.rs-schedule');
    const structures = weatherNode(panel, wrap, '.rs-advanced');

    for (const node of [mode, fixed, schedule, structures]) {
      if (node) wrap.append(node);
    }
    oldTitle?.remove();

    if (wrap.parentElement !== panel || wrap.nextElementSibling !== pack) {
      panel.insertBefore(wrap, pack);
    }
    return true;
  }

  function orderWeatherNow() {
    const root = $('rollSimulatorV15');
    if (!root) return false;
    const panels = [...root.querySelectorAll('.rs-scenario[data-scenario]')];
    if (!panels.length) return false;
    let ready = true;
    for (const panel of panels) ready = orderWeatherPanel(panel) && ready;
    return ready;
  }

  function retryWeatherOrder() {
    clearInterval(weatherRetry);
    let tries = 0;
    const attempt = () => {
      tries += 1;
      if (orderWeatherNow() || tries >= 40) {
        clearInterval(weatherRetry);
        weatherRetry = null;
      }
    };
    attempt();
    if (!orderWeatherNow()) weatherRetry = setInterval(attempt, 100);
  }

  function install() {
    const root = $('rollSimulatorV15');
    const results = resultsRoot();
    const scenarios = $('rsScenarios');
    if (!root || !results || !scenarios) return false;

    // The v2 test script creates its own separate result card. Remove that initial
    // duplicate so the test page always has one shared results area.
    syncFastPanel();

    root.addEventListener('click', (event) => {
      if (event.target.closest('#rsFastEstimateButton')) {
        resultMode = 'fast';
        queueMicrotask(syncFastPanel);
        setTimeout(syncFastPanel, 0);
        return;
      }

      if (event.target.closest('#rsRunButton')) {
        resultMode = 'regular';
        syncFastPanel();
        showRegularRunning();
        return;
      }

      if (event.target.closest('[data-rs-action="mode"], #resetBtn')) {
        setTimeout(retryWeatherOrder, 0);
      }
    });

    // v2 can recreate the Fast Estimate panel before #rsResults after settings
    // changes or after an async estimate finishes. Keep it inside the shared
    // results area only when Fast Estimate is the active result mode.
    new MutationObserver(syncFastPanel).observe(root, { childList: true });

    // Scenario mode changes rebuild the scenario cards. Watch only the direct
    // scenario list children so moving Weather controls inside a scenario cannot
    // retrigger this observer in a loop.
    new MutationObserver(() => setTimeout(retryWeatherOrder, 0)).observe(scenarios, { childList: true });

    // v2 invalidates estimate results a moment after settings change. Re-sync
    // afterward so it cannot leave a second results card above the regular one.
    const resyncAfterSetupChange = () => {
      setTimeout(syncFastPanel, 240);
      setTimeout(retryWeatherOrder, 0);
    };
    root.addEventListener('change', resyncAfterSetupChange);
    root.addEventListener('input', (event) => {
      if (event.target.closest('#rsDurationValue')) resyncAfterSetupChange();
    });

    retryWeatherOrder();
    return true;
  }

  if (!install()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries >= 120) clearInterval(timer);
    }, 50);
  }
})();
