let overlayEl = null;
let inputEl = null;
let resultsEl = null;
let isOpen = false;
let pollingInterval = null;
let lastClipboardText = '';
let configEl = null;
let isConfigOpen = false;
let ghostConfig = {
  answerColor: '#7fffb2',
  overlayTop: 20,
  overlayRight: 20,
  overlayWidth: 420
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggle_overlay') toggleOverlay();
  if (msg.action === 'toggle_config') toggleConfig();
});

function toggleOverlay() {
  isOpen ? closeOverlay() : openOverlay();
}

function openOverlay() {
  if (!overlayEl) buildOverlay();

  overlayEl.style.display = 'block';
  inputEl.value = '';
  resultsEl.innerHTML = '';
  inputEl.focus();
  isOpen = true;

  // Listeners globales
  document.addEventListener('click', onClickOutside);
  document.addEventListener('keydown', onGlobalKeydown, true);

  // Iniciar polling de clipboard mientras el overlay esté abierto
  lastClipboardText = '';
  pollingInterval = setInterval(checkClipboard, 600);
}

function closeOverlay() {
  if (overlayEl) overlayEl.style.display = 'none';
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onGlobalKeydown, true);
  clearInterval(pollingInterval);
  pollingInterval = null;
  isOpen = false;
}

function buildOverlay() {
  overlayEl = document.createElement('div');
  overlayEl.id = 'ghost-overlay';

  inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.id = 'ghost-input';
  inputEl.placeholder = 'Escribe la pregunta...';
  inputEl.setAttribute('autocomplete', 'off');
  inputEl.setAttribute('spellcheck', 'false');

  resultsEl = document.createElement('div');
  resultsEl.id = 'ghost-results';

  overlayEl.appendChild(inputEl);
  overlayEl.appendChild(resultsEl);
  document.body.appendChild(overlayEl);

  inputEl.addEventListener('input', onInput);
}

// Captura de teclado global — fase capture para interceptar antes que Cisco
function onGlobalKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    closeOverlay();
    return;
  }
  // Solo bloquar propagación de teclas si el foco está dentro del overlay
  if (overlayEl && overlayEl.contains(document.activeElement)) {
    e.stopPropagation();
  }
}

function onClickOutside(e) {
  if (overlayEl && !overlayEl.contains(e.target)) closeOverlay();
}

function onInput() {
  const query = inputEl.value.trim();
  if (query.length < 3) { resultsEl.innerHTML = ''; return; }

  chrome.runtime.sendMessage({ action: 'search_query', query }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    renderResults(response.results);
  });
}

function checkClipboard() {
  navigator.clipboard.readText()
    .then(text => {
      const cleaned = text ? text.trim() : '';
      // Solo actuar si el texto cambió y tiene contenido útil
      if (cleaned.length > 3 && cleaned !== lastClipboardText) {
        lastClipboardText = cleaned;
        inputEl.value = cleaned;
        onInput(); // dispara la búsqueda
      }
    })
    .catch(() => {}); // fallo silencioso
}

function renderResults(results) {
  resultsEl.innerHTML = '';
  if (!results || results.length === 0) {
    const noResult = document.createElement('p');
    noResult.className = 'ghost-no-result';
    noResult.textContent = 'Sin resultados';
    resultsEl.appendChild(noResult);
    return;
  }

  results.forEach(item => {
    const card = document.createElement('div');
    card.className = 'ghost-result-card';

    const q = document.createElement('p');
    q.className = 'ghost-q';
    q.textContent = item.q;

    const answers = document.createElement('ul');
    answers.className = 'ghost-answers';
    item.a.forEach(ans => {
      const li = document.createElement('li');
      li.textContent = ans;
      li.style.color = ghostConfig.answerColor;
      answers.appendChild(li);
    });

    card.appendChild(q);
    card.appendChild(answers);
    resultsEl.appendChild(card);
  });
}

function toggleConfig() {
  if (isConfigOpen) { closeConfig(); return; }
  openConfig();
}

function openConfig() {
  if (!configEl) buildConfig();
  configEl.style.display = 'block';
  isConfigOpen = true;
  document.addEventListener('keydown', onConfigEsc, true);
  document.addEventListener('click', onConfigClickOutside);
}

function closeConfig() {
  if (configEl) configEl.style.display = 'none';
  document.removeEventListener('keydown', onConfigEsc, true);
  document.removeEventListener('click', onConfigClickOutside);
  isConfigOpen = false;
}

function onConfigEsc(e) {
  if (e.key === 'Escape') { e.stopPropagation(); closeConfig(); }
}

function onConfigClickOutside(e) {
  if (configEl && !configEl.contains(e.target)) closeConfig();
}

function buildConfig() {
  configEl = document.createElement('div');
  configEl.id = 'ghost-config';

  configEl.innerHTML = `
    <p class="ghost-config-title">⚙ Ghost Config</p>

    <label class="ghost-config-label">Color de respuestas</label>
    <input type="color" id="ghost-color-picker" value="${ghostConfig.answerColor}">

    <label class="ghost-config-label">Posición — Derecha (px)</label>
    <input type="range" id="ghost-right" min="0" max="800" value="${ghostConfig.overlayRight}">
    <span class="ghost-config-val" id="ghost-right-val">${ghostConfig.overlayRight}px</span>

    <label class="ghost-config-label">Posición — Arriba (px)</label>
    <input type="range" id="ghost-top" min="0" max="600" value="${ghostConfig.overlayTop}">
    <span class="ghost-config-val" id="ghost-top-val">${ghostConfig.overlayTop}px</span>

    <label class="ghost-config-label">Ancho (px)</label>
    <input type="range" id="ghost-width" min="200" max="700" value="${ghostConfig.overlayWidth}">
    <span class="ghost-config-val" id="ghost-width-val">${ghostConfig.overlayWidth}px</span>
  `;

  document.body.appendChild(configEl);

  // Color picker
  configEl.querySelector('#ghost-color-picker').addEventListener('input', (e) => {
    ghostConfig.answerColor = e.target.value;
    applyConfig();
  });

  // Slider: right
  configEl.querySelector('#ghost-right').addEventListener('input', (e) => {
    ghostConfig.overlayRight = parseInt(e.target.value);
    configEl.querySelector('#ghost-right-val').textContent = ghostConfig.overlayRight + 'px';
    applyConfig();
  });

  // Slider: top
  configEl.querySelector('#ghost-top').addEventListener('input', (e) => {
    ghostConfig.overlayTop = parseInt(e.target.value);
    configEl.querySelector('#ghost-top-val').textContent = ghostConfig.overlayTop + 'px';
    applyConfig();
  });

  // Slider: width
  configEl.querySelector('#ghost-width').addEventListener('input', (e) => {
    ghostConfig.overlayWidth = parseInt(e.target.value);
    configEl.querySelector('#ghost-width-val').textContent = ghostConfig.overlayWidth + 'px';
    applyConfig();
  });
}

function applyConfig() {
  if (!overlayEl) return;
  overlayEl.style.top = ghostConfig.overlayTop + 'px';
  overlayEl.style.right = ghostConfig.overlayRight + 'px';
  overlayEl.style.width = ghostConfig.overlayWidth + 'px';
  // Actualizar color de todas las respuestas visibles
  document.querySelectorAll('.ghost-answers li').forEach(li => {
    li.style.color = ghostConfig.answerColor;
  });
  // Inyectar variable CSS para que nuevos resultados también usen el color
  document.documentElement.style.setProperty('--ghost-answer-color', ghostConfig.answerColor);
}