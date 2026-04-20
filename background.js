let db = []; // In-memory database

// Cargar database local
fetch(chrome.runtime.getURL('database.json'))
  .then(response => response.json())
  .then(data => {
    db = data;
    console.log("Ghost Agent: Base de datos cargada", db.length, "registros");
  })
  .catch(err => console.error("Error cargando DB", err));

// Normalizar texto — ignora acentos, signos de puntuación y espacios extra
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')                        // descompone á → a + ́
    .replace(/[\u0300-\u036f]/g, '')         // elimina los diacríticos (acentos)
    .replace(/[¿?¡!.,;:\-_"'()[\]{}]/g, '') // elimina signos de puntuación
    .replace(/\s+/g, ' ')
    .trim();
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
  if (command === 'toggle_config') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle_config' }).catch(() => {});
      }
    });
  }
});

// Nuevo listener: búsqueda por query de texto libre
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search_query') {
    const query = normalizeText(request.query);
    if (!query || query.length < 3) return sendResponse({ results: [] });

    // Score compuesto: premia que el query esté en q, pero pesa
    // la similitud global para evitar falsos positivos por substring corto
    const scored = db.map(item => {
      const normQ = normalizeText(item.q);
      const containsBonus = normQ.includes(query) ? 0.3 : 0;
      const similarity = getSimilarity(item.q, request.query);
      // La similitud sola puede fallar en queries cortos; el bonus
      // de contains eleva entradas donde el query aparece en q,
      // pero la similitud global evita que entradas irrelevantes
      // suban solo por tener una palabra en común
      const score = similarity + containsBonus;
      return { item, score, similarity };
    });

    // Ordenar por score descendente
    scored.sort((a, b) => b.score - a.score);

    // Umbral: solo resultados con similitud real >= 0.25 Y score >= 0.5
    // Esto filtra entradas que solo matchean por substring corto accidental
    const results = scored
      .filter(s => s.similarity >= 0.25 && s.score >= 0.5)
      .slice(0, 5) // máximo 5 resultados
      .map(s => s.item);

    sendResponse({ results });
    return true;
  }
});
