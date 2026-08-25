(() => {
  const THEME = 'lava';
  const LAYER_ID = 'hitCalcLavaAmbience';
  const BLOB_COUNT = 16;
  const BUBBLE_COUNT = 30;

  const blobs = [];
  let activeDrag = null;

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isLava = () => document.documentElement.dataset.theme === THEME;
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = values => values[Math.floor(Math.random() * values.length)];

  function getLayer() {
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      layer.className = 'lava-ambience-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.prepend(layer);
    }
    return layer;
  }

  function renderDrag(state) {
    state.reactor.style.transform = `translate3d(${state.offsetX.toFixed(2)}px,${state.offsetY.toFixed(2)}px,0)`;
  }

  function finishDrag(state, event = null) {
    if (!state?.dragging) return;
    if (event && state.pointerId !== event.pointerId) return;

    const pointerId = state.pointerId;
    state.dragging = false;
    state.pointerId = null;
    state.blob.classList.remove('dragging');

    if (pointerId !== null) {
      try {
        if (state.blob.hasPointerCapture(pointerId)) state.blob.releasePointerCapture(pointerId);
      } catch {}
    }

    if (activeDrag === state) activeDrag = null;
  }

  function beginDrag(event, state) {
    if (!isLava() || event.button !== 0) return;
    event.preventDefault();

    if (activeDrag && activeDrag !== state) finishDrag(activeDrag);

    activeDrag = state;
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.startPointerX = event.clientX;
    state.startPointerY = event.clientY;
    state.startOffsetX = state.offsetX;
    state.startOffsetY = state.offsetY;
    state.blob.classList.add('dragging');

    try { state.blob.setPointerCapture(event.pointerId); } catch {}
  }

  function moveDrag(event, state) {
    if (!state.dragging || state.pointerId !== event.pointerId) return;
    event.preventDefault();

    state.offsetX = state.startOffsetX + (event.clientX - state.startPointerX);
    state.offsetY = state.startOffsetY + (event.clientY - state.startPointerY);
    renderDrag(state);
  }

  function makeBlob(index) {
    const blob = document.createElement('i');
    blob.className = 'lava-blob';

    const reactor = document.createElement('span');
    reactor.className = 'lava-reactor';

    const core = document.createElement('b');
    core.className = 'lava-core';
    reactor.appendChild(core);
    blob.appendChild(reactor);

    const size = rand(index < 5 ? 260 : 120, index < 5 ? 520 : 330);
    const duration = rand(22, 50);
    const morph = rand(5.5, 13);
    const rotation = rand(-28, 28);

    blob.dataset.lavaTone = pick(['ember', 'gold', 'crimson', 'plasma']);
    blob.style.left = `${rand(-10, 96).toFixed(2)}vw`;
    blob.style.top = `${rand(-18, 102).toFixed(2)}vh`;
    blob.style.width = `${size.toFixed(1)}px`;
    blob.style.height = `${(size * rand(.68, 1.15)).toFixed(1)}px`;
    blob.style.opacity = rand(.35, .82).toFixed(2);
    blob.style.setProperty('--lava-float-time', `${duration.toFixed(2)}s`);
    blob.style.setProperty('--lava-morph-time', `${morph.toFixed(2)}s`);
    blob.style.setProperty('--lava-delay', `${(-rand(0, duration)).toFixed(2)}s`);
    blob.style.setProperty('--lava-morph-delay', `${(-rand(0, morph)).toFixed(2)}s`);
    blob.style.setProperty('--lava-x1', `${rand(-14, 14).toFixed(2)}vw`);
    blob.style.setProperty('--lava-y1', `${rand(-28, 22).toFixed(2)}vh`);
    blob.style.setProperty('--lava-x2', `${rand(-18, 18).toFixed(2)}vw`);
    blob.style.setProperty('--lava-y2', `${rand(-20, 31).toFixed(2)}vh`);
    blob.style.setProperty('--lava-x3', `${rand(-11, 11).toFixed(2)}vw`);
    blob.style.setProperty('--lava-y3', `${rand(-33, 26).toFixed(2)}vh`);
    blob.style.setProperty('--lava-rot1', `${(rotation * .45).toFixed(1)}deg`);
    blob.style.setProperty('--lava-rot2', `${rotation.toFixed(1)}deg`);
    blob.style.setProperty('--lava-rot3', `${(rotation * -.4).toFixed(1)}deg`);
    blob.style.setProperty('--lava-blur', `${rand(5, 18).toFixed(1)}px`);

    const state = {
      blob,
      reactor,
      offsetX: 0,
      offsetY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
      startPointerX: 0,
      startPointerY: 0,
      pointerId: null,
      dragging: false,
    };
    blobs.push(state);

    blob.addEventListener('pointerdown', event => beginDrag(event, state));
    blob.addEventListener('pointermove', event => moveDrag(event, state));
    blob.addEventListener('pointerup', event => finishDrag(state, event));
    blob.addEventListener('pointercancel', event => finishDrag(state, event));
    blob.addEventListener('lostpointercapture', () => finishDrag(state));

    return blob;
  }

  function makeBubble(index) {
    const bubble = document.createElement('i');
    bubble.className = 'lava-bubble';

    const size = rand(index < 8 ? 15 : 5, index < 8 ? 42 : 22);
    const duration = rand(10, 28);
    const rising = Math.random() > .28;
    const drift = rand(-15, 15);
    const travel = rising ? -rand(34, 78) : rand(30, 70);

    bubble.style.left = `${rand(0, 100).toFixed(2)}vw`;
    bubble.style.top = `${rand(-8, 108).toFixed(2)}vh`;
    bubble.style.width = `${size.toFixed(1)}px`;
    bubble.style.height = `${(size * rand(.75, 1.2)).toFixed(1)}px`;
    bubble.style.opacity = rand(.18, .58).toFixed(2);
    bubble.style.setProperty('--bubble-time', `${duration.toFixed(2)}s`);
    bubble.style.setProperty('--bubble-delay', `${(-rand(0, duration)).toFixed(2)}s`);
    bubble.style.setProperty('--bubble-drift', `${drift.toFixed(2)}vw`);
    bubble.style.setProperty('--bubble-drift-mid', `${(drift * .65).toFixed(2)}vw`);
    bubble.style.setProperty('--bubble-travel', `${travel.toFixed(2)}vh`);
    bubble.style.setProperty('--bubble-travel-38', `${(travel * .38).toFixed(2)}vh`);
    bubble.style.setProperty('--bubble-travel-72', `${(travel * .72).toFixed(2)}vh`);
    bubble.style.setProperty('--bubble-wobble', `${rand(-28, 28).toFixed(1)}px`);

    return bubble;
  }

  function populate() {
    const layer = getLayer();
    layer.replaceChildren();
    blobs.length = 0;
    activeDrag = null;

    const haze = document.createElement('div');
    haze.className = 'lava-haze';
    layer.appendChild(haze);

    if (reducedMotion()) return;
    for (let i = 0; i < BLOB_COUNT; i++) layer.appendChild(makeBlob(i));
    for (let i = 0; i < BUBBLE_COUNT; i++) layer.appendChild(makeBubble(i));
  }

  function syncTheme() {
    const layer = getLayer();
    if (isLava()) {
      layer.hidden = false;
      if (layer.childElementCount <= 1) populate();
    } else {
      if (activeDrag) finishDrag(activeDrag);
      layer.hidden = true;
      layer.replaceChildren();
      blobs.length = 0;
      activeDrag = null;
    }
  }

  function boot() {
    getLayer().hidden = true;
    new MutationObserver(syncTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    syncTheme();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
