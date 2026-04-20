// Estado
let overlayEl = null;
let inputEl = null;
let resultsEl = null;
let isOpen = false;

// Escuchar el comando del background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggle_overlay') toggleOverlay();
});

function toggleOverlay() {
  if (isOpen) { closeOverlay(); return; }
  openOverlay();
}

function openOverlay() {
  if (overlayEl) { overlayEl.style.display = 'block'; inputEl.value = ''; resultsEl.innerHTML = ''; inputEl.focus(); isOpen = true; return; }
  
  // Crear overlay
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
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
    e.stopPropagation(); // Evitar que Cisco capture las teclas
  });
  
  // Click fuera cierra
  document.addEventListener('click', onClickOutside);
  
  inputEl.focus();
  isOpen = true;
}

function closeOverlay() {
  if (overlayEl) overlayEl.style.display = 'none';
  document.removeEventListener('click', onClickOutside);
  isOpen = false;
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
      answers.appendChild(li);
    });
    
    card.appendChild(q);
    card.appendChild(answers);
    resultsEl.appendChild(card);
  });
}