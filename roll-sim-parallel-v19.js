(() => {
  const NativeWorker = window.Worker;
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!NativeWorker || !DATA || window.__rollSimParallelV19Installed) return;
  window.__rollSimParallelV19Installed = true;

  const CARDS = DATA.cards;
  const BN = DATA.borderNames;
  const MASK_COUNT = 16;
  const ALL_PACKS = [...new Set(CARDS.map((card) => card.pack).filter(Boolean))];
  const RUN_OPTIONS = [1, 50, 100, 500, 1000];

  function aggregateRuns(runs) {
    const count = runs.length || 1;
    const cardTotals = new Array(CARDS.length).fill(0);
    const cardHitRuns = new Array(CARDS.length).fill(0);
    const cardMasks = Array.from({ length: CARDS.length }, () => new Array(MASK_COUNT).fill(0));
    const borderTotals = new Array(BN.length).fill(0);
    const borderHitRuns = new Array(BN.length).fill(0);
    const comboTotals = new Array(MASK_COUNT).fill(0);
    const comboHitRuns = new Array(MASK_COUNT).fill(0);
    const weatherRolls = {};
    let totalRolls = 0;
    let uniqueTotal = 0;
    let bestPull = null;

    for (const run of runs) {
      if (!run) continue;
      totalRolls += Number(run.totalRolls) || 0;
      uniqueTotal += Number(run.uniqueCards) || 0;
      for (const [weather, rolls] of Object.entries(run.weatherRolls || {})) weatherRolls[weather] = (weatherRolls[weather] || 0) + rolls;
      for (let i = 0; i < CARDS.length; i += 1) {
        const c = Number(run.cardTotals?.[i]) || 0;
        cardTotals[i] += c;
        if (c > 0) cardHitRuns[i] += 1;
        for (let mask = 0; mask < MASK_COUNT; mask += 1) cardMasks[i][mask] += Number(run.cardMasks?.[i]?.[mask]) || 0;
      }
      for (let i = 0; i < BN.length; i += 1) {
        const c = Number(run.borderTotals?.[i]) || 0;
        borderTotals[i] += c;
        if (c > 0) borderHitRuns[i] += 1;
      }
      for (let mask = 0; mask < MASK_COUNT; mask += 1) {
        const c = Number(run.comboTotals?.[mask]) || 0;
        comboTotals[mask] += c;
        if (c > 0) comboHitRuns[mask] += 1;
      }
      if (run.bestPull && (!bestPull || run.bestPull.effectiveRarity > bestPull.effectiveRarity)) bestPull = { ...run.bestPull };
    }

    return {
      runs: runs.length,
      totalRolls,
      averageRolls: totalRolls / count,
      averageUniqueCards: uniqueTotal / count,
      cardTotals,
      cardHitRuns,
      cardMasks,
      borderTotals,
      borderHitRuns,
      comboTotals,
      comboHitRuns,
      weatherRolls,
      bestPull,
    };
  }

  function packsForScenario(index) {
    const key = index === 1 ? 'B' : 'A';
    const configured = window.__rollSimPackSelectionsV19?.[key];
    return Array.isArray(configured) ? configured.filter((pack) => ALL_PACKS.includes(pack)) : ALL_PACKS.slice();
  }

  function raptureForScenario(index) {
    const key = index === 1 ? 'B' : 'A';
    return !!window.__rollSimRapture24V25?.[key];
  }

  class ParallelRollSimWorker {
    constructor() {
      this._messageListeners = new Set();
      this._errorListeners = new Set();
      this._workers = [];
      this._cancelled = false;
    }

    addEventListener(type, callback) {
      if (typeof callback !== 'function') return;
      if (type === 'message') this._messageListeners.add(callback);
      if (type === 'error') this._errorListeners.add(callback);
    }

    removeEventListener(type, callback) {
      if (type === 'message') this._messageListeners.delete(callback);
      if (type === 'error') this._errorListeners.delete(callback);
    }

    _emitMessage(data) {
      const event = { data };
      for (const callback of this._messageListeners) {
        try { callback.call(this, event); } catch (error) { setTimeout(() => { throw error; }); }
      }
      if (typeof this.onmessage === 'function') this.onmessage(event);
    }

    _emitError(message) {
      const event = { message: String(message || 'Roll simulator worker failed.') };
      for (const callback of this._errorListeners) {
        try { callback.call(this, event); } catch {}
      }
      if (typeof this.onerror === 'function') this.onerror(event);
    }

    terminate() {
      this._cancelled = true;
      for (const worker of this._workers) {
        try { worker.terminate(); } catch {}
      }
      this._workers.length = 0;
    }

    postMessage(message) {
      if (!message || message.type !== 'run') return;
      this.terminate();
      this._cancelled = false;

      const rawScenarios = Array.isArray(message.scenarios) ? message.scenarios : [];
      const scenarios = rawScenarios.slice(0, 1).map((scenario, index) => ({
        ...scenario,
        build: {
          ...(scenario?.build || {}),
          enabledPacks: packsForScenario(index),
          rapture24: raptureForScenario(index),
        },
      }));
      const requestedRuns = Number(message.runs);
      const runCount = RUN_OPTIONS.includes(requestedRuns) ? requestedRuns : 1;
      const tasks = [];
      const results = scenarios.map(() => Array(runCount).fill(null));
      for (let s = 0; s < scenarios.length; s += 1) {
        for (let r = 0; r < runCount; r += 1) tasks.push({ scenarioIndex: s, runIndex: r, scenario: scenarios[s] });
      }

      if (!tasks.length) {
        this._emitMessage({ type: 'error', jobId: message.jobId, message: 'No simulation scenario was supplied.' });
        return;
      }

      const reportedCores = Math.max(2, Number(navigator.hardwareConcurrency) || 4);
      const concurrency = Math.max(1, Math.min(tasks.length, 8, reportedCores - 1));
      let nextTask = 0;
      let completed = 0;
      let failed = false;

      const finishError = (text) => {
        if (failed || this._cancelled) return;
        failed = true;
        for (const worker of this._workers) {
          try { worker.terminate(); } catch {}
        }
        this._workers.length = 0;
        this._emitMessage({ type: 'error', jobId: message.jobId, message: String(text || 'Parallel simulation failed.') });
      };

      const maybeFinish = () => {
        if (failed || this._cancelled || completed !== tasks.length) return;
        for (const worker of this._workers) {
          try { worker.terminate(); } catch {}
        }
        this._workers.length = 0;
        const payload = {
          type: 'result',
          jobId: message.jobId,
          durationSeconds: message.durationSeconds,
          runCount,
          scenarios: results.map((runs) => ({ aggregate: aggregateRuns(runs), runs })),
          parallelWorkers: concurrency,
        };
        window.__rollSimLastResultV21 = payload;
        this._emitMessage(payload);
      };

      const assign = (worker) => {
        if (failed || this._cancelled) return;
        if (nextTask >= tasks.length) {
          maybeFinish();
          return;
        }
        const taskIndex = nextTask++;
        const task = tasks[taskIndex];
        worker.__rollTask = { ...task, taskIndex };
        worker.postMessage({
          type: 'run',
          jobId: taskIndex + 1,
          durationSeconds: message.durationSeconds,
          runs: 1,
          scenarios: [task.scenario],
        });
      };

      for (let slot = 0; slot < concurrency; slot += 1) {
        const worker = new NativeWorker('./roll-sim-worker-v19.js?rev=20260825-0030');
        this._workers.push(worker);
        worker.addEventListener('message', (event) => {
          if (failed || this._cancelled) return;
          const data = event.data || {};
          if (data.type === 'error') {
            finishError(data.message);
            return;
          }
          if (data.type !== 'result') return;
          const task = worker.__rollTask;
          const run = data.scenarios?.[0]?.runs?.[0];
          if (!task || !run) {
            finishError('A simulation worker returned an incomplete run.');
            return;
          }
          results[task.scenarioIndex][task.runIndex] = run;
          completed += 1;
          this._emitMessage({
            type: 'progress',
            jobId: message.jobId,
            completed,
            total: tasks.length,
            scenarioIndex: task.scenarioIndex,
            runIndex: task.runIndex,
            parallelWorkers: concurrency,
          });
          assign(worker);
          maybeFinish();
        });
        worker.addEventListener('error', (event) => finishError(event.message));
        assign(worker);
      }
    }
  }

  function WorkerProxy(url, options) {
    const value = String(url || '');
    if (value.includes('roll-sim-worker-v15.js')) return new ParallelRollSimWorker();
    return new NativeWorker(url, options);
  }
  WorkerProxy.prototype = NativeWorker.prototype;
  Object.setPrototypeOf(WorkerProxy, NativeWorker);
  window.Worker = WorkerProxy;
})();
