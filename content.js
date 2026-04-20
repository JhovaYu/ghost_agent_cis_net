/**
 * GHOST AGENT - CONTENT SCRIPT V7 (Shield Breaker)
 */

if (typeof window.ghostAgentInjected === 'undefined') {
  window.ghostAgentInjected = true;

  // 1. ROMPER PROTECCIÓN DE CISCO (Hacer todo seleccionable)
  const style = document.createElement('style');
  style.innerHTML = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
  document.head.appendChild(style);
  console.log("GHOST INJECTOR: 🛡️ Escudo de selección roto.");

  function cleanNodeText(node) {
    if (!node) return "";
    let clone = node.cloneNode(true);
    let spam = clone.querySelectorAll('.screenReader-position-text, .sr-only, [aria-hidden="true"]');
    spam.forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, ' ').trim();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action !== "trigger_extraction") return;

    console.log("GHOST INJECTOR: 📡 Escaneando...");

    // Intentar Sniper Mode primero
    let questionText = window.getSelection().toString().trim();

    // Si no hay selección, intentamos capturar por fuerza bruta el texto central
    if (!questionText) {
      // Buscamos el div que suele contener la pregunta en el visualizador de autoría
      let mainContent = document.querySelector('.main-content, #main-wrapper, .assessment-container, .mcq__body-inner');
      if (mainContent) {
        // Sacamos el primer párrafo o h3 que no sea basura
        let p = mainContent.querySelector('p, h3, h2');
        if (p) questionText = p.innerText.trim();
      }
    }

    if (!questionText || questionText.length < 5) {
      console.log("GHOST INJECTOR: ❌ No se pudo extraer texto. Intenta seleccionar la pregunta ahora que es posible.");
      return;
    }

    console.log("GHOST INJECTOR: 🎯 Procesando:", questionText.substring(0, 50));

    let optionNodes = Array.from(document.querySelectorAll('label, .mcq__item-label, li, [role="listitem"]'));

    chrome.runtime.sendMessage({
      action: "search_question",
      question: questionText
    }, (response) => {
      if (response && response.answers && response.answers.length > 0) {
        console.log("GHOST INJECTOR: 🔥 Match!");

        optionNodes.forEach(node => {
          let cleanText = cleanNodeText(node).toLowerCase();
          let isCorrect = response.answers.some(ans => {
            let aLower = ans.toLowerCase().trim();
            return cleanText.includes(aLower) || aLower.includes(cleanText);
          });

          if (isCorrect) {
            node.style.setProperty("background-color", "rgba(46, 204, 113, 0.3)", "important");
            node.style.setProperty("border", "2px solid #2ecc71", "important");
          }
        });
      } else {
        console.log("GHOST INJECTOR: 🧠 Sin match en DB.");
      }
    });
    return true;
  });
}