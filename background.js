let db = []; // In-memory database

// Cargar database local
fetch(chrome.runtime.getURL('database.json'))
  .then(response => response.json())
  .then(data => {
    db = data;
    console.log("Ghost Agent: Base de datos cargada", db.length, "registros");
  })
  .catch(err => console.error("Error cargando DB", err));

// Normalizar texto
function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Algoritmo de distancia de Levenshtein
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length; 
  if (b.length === 0) return a.length; 

  let matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Calcula el porcentaje de similitud (0.0 a 1.0)
function getSimilarity(s1, s2) {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);
  let longer = norm1;
  let shorter = norm2;
  
  if (norm1.length < norm2.length) {
    longer = norm2;
    shorter = norm1;
  }
  
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  return (longerLength - levenshteinDistance(longer, shorter)) / parseFloat(longerLength);
}

// Listener del comando toggle
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle_overlay' }).catch(() => {});
      }
    });
  }
});

// Nuevo listener: búsqueda por query de texto libre
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search_query') {
    const query = normalizeText(request.query);
    if (!query || query.length < 3) return sendResponse({ results: [] });
    
    // Fase 1: búsqueda por prefijo/includes (rápida, sin Levenshtein)
    let results = db.filter(item => normalizeText(item.q).includes(query));
    
    // Fase 2: si no hay resultados con includes, usar Levenshtein top-5
    if (results.length === 0) {
      const scored = db.map(item => ({
        item,
        sim: getSimilarity(item.q, request.query)
      })).sort((a, b) => b.sim - a.sim).slice(0, 5);
      
      results = scored.filter(s => s.sim >= 0.4).map(s => s.item);
    } else {
      // Limitar includes a top 8 para no saturar el overlay
      results = results.slice(0, 8);
    }
    
    sendResponse({ results });
    return true; // canal asíncrono abierto
  }
});
