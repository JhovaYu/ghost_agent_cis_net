if (typeof window.ghostAgentInjected === 'undefined') {
  window.ghostAgentInjected = true;
  console.log("GHOST INJECTOR: Cargado programáticamente en ->", window.location.href);

  // Limpia la "basura" del DOM para Screen Readers robusta
  function cleanNodeText(node) {
    let text = "";
    for (let child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // Ignorar basura inyectada
        if (!child.classList.contains('screenReader-position-text') && !child.classList.contains('sr-only')) {
          text += cleanNodeText(child);
        }
      }
    }
    return text;
  }

  function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Motor Inferencia de la pregunta
  // 2. Extracción de Datos Multicapa (Heurística Definitiva APEX)
  function extractExamData() {
    let questionText = null;
    let optionNodes = [];

    // TACTICA 1: Búsqueda agresiva de la pregunta
    // Obtenemos todos los elementos de bloque que podrían contener texto
    let possibleQuestions = document.querySelectorAll('h1, h2, h3, h4, p, div');

    for (let el of possibleQuestions) {
      let text = el.innerText.trim();
      // Filtramos textos vacíos o muy cortos
      if (text.length < 20) continue;

      // El filtro Anti-Cookies
      let lower = text.toLowerCase();
      if (lower.includes('cookie') || lower.includes('privacidad') || lower.includes('almacene o extraiga')) {
        continue;
      }

      // ¿Parece una pregunta? (Termina en '?', o tiene palabras clave de Cisco)
      if (text.endsWith('?') || text.endsWith('.)') || lower.includes('seleccionar todas') || lower.includes('elija dos') || lower.includes('qué') || lower.includes('cuál')) {
        // Evitamos capturar el contenedor gigante que tiene toda la página
        if (el.children.length > 2) continue;

        questionText = text;
        break; // ¡Encontramos la pregunta!
      }
    }

    // TACTICA 2: Extracción de opciones
    if (questionText) {
      // Cisco suele usar <label> para los checkboxes/radios, o <li> en listas.
      let possibleOptions = document.querySelectorAll('label, .mcq__item-label, li');

      for (let el of possibleOptions) {
        let text = el.innerText.trim();
        // Ignoramos opciones vacías o que sean la misma pregunta
        if (text.length > 0 && text !== questionText) {
          optionNodes.push(el);
        }
      }
    }

    return { questionText, optionNodes };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("GHOST INJECTOR: Mensaje recibido en frame ->", window.location.href);
    if (request.action === "trigger_extraction") {

      // Extractor Omni-Selector
      const qText = extractExamData();

      if (!qText || qText.length < 15) {
        console.log("GHOST INJECTOR: Abortado. No hay pregunta aquí.");
        return;
      }

      console.log("PREGUNTA CAZADA:", qText);

      // Comunicarse con el Background Script omnisciencia
      chrome.runtime.sendMessage({ action: "search_question", question: qText }, (response) => {
        if (response && response.action === "highlight_answers" && response.answers && response.answers.length > 0) {
          highlightCorrectOptions(response.answers);
        }
      });
    }
  });

  function highlightCorrectOptions(correctAnswers) {
    // Extraer las opciones del DOM flexibilizado
    const optionLabels = document.querySelectorAll('label, li, .mcq__item-label, .mcq__option');
    if (!optionLabels || optionLabels.length === 0) return;

    const normalizedAnswers = correctAnswers.map(normalizeText);

    optionLabels.forEach(label => {
      const labelText = normalizeText(cleanNodeText(label));

      // Evaluar si alguna respuesta encaja en el texto de esta opción
      for (const ans of normalizedAnswers) {
        if (labelText.includes(ans) || ans.includes(labelText)) {
          label.classList.add('ghost-highlight');
          break;
        }
      }
    });
  }
}
