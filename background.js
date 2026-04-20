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

// Listener para atajos de teclado
chrome.commands.onCommand.addListener((command) => {
  console.log("GHOST BRAIN: Atajo activado ->", command);
  if (command === "search_database") {
    // Mandar mensaje iterativo a TODOS los iframes de la tab activa
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.webNavigation.getAllFrames({tabId: tabs[0].id}, (frames) => {
          if (frames && frames.length > 0) {
            frames.forEach(frame => {
              console.log("GHOST BRAIN: Bombardeando frame ID ->", frame.frameId, "URL:", frame.url);
              chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id, frameIds: [frame.frameId] },
                  files: ["content.js"]
              }).then(() => {
                  return chrome.scripting.insertCSS({
                      target: { tabId: tabs[0].id, frameIds: [frame.frameId] },
                      files: ["content.css"]
                  });
              }).then(() => {
                  chrome.tabs.sendMessage(tabs[0].id, { action: "trigger_extraction" }, { frameId: frame.frameId })
                      .catch(() => {});
              }).catch(err => console.error("Error inyectando en frame:", err));
            });
          } else {
            // Fallback
            chrome.tabs.sendMessage(tabs[0].id, {action: "trigger_extraction"}).catch(() => {});
          }
        });
      }
    });
  }
});

// Listener para recibir la pregunta parseada
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search_question") {
    const questionText = request.question;
    let bestMatch = null;
    let highestSim = 0;

    for (const item of db) {
      const sim = getSimilarity(item.q, questionText);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = item;
      }
    }

    if (bestMatch && highestSim >= 0.85) {
      console.log("Ghost Agent: Match Encontrado!", (highestSim * 100).toFixed(2) + "%");
      sendResponse({ action: "highlight_answers", answers: bestMatch.a });
    } else {
      console.log("Ghost Agent: No hubo match confiable. Máxima similitud:", (highestSim * 100).toFixed(2) + "%");
      sendResponse({ action: "highlight_answers", answers: [] });
    }
  }
});
