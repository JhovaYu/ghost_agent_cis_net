// Limpia la "basura" del DOM para Screen Readers
function cleanNodeText(node) {
  let text = "";
  for (let child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Ignorar el elemento si tiene la clase screenReader
      if (!child.classList.contains('screenReader-position-text')) {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "trigger_extraction") {

    // Extraer pregunta
    const qNode = document.querySelector('.mcq__body-inner p') || document.querySelector('.mcq__body-inner');
    if (!qNode) return; // Silencioso y rápido si no es el IFrame correcto

    const qText = cleanNodeText(qNode).trim();

    // Comunicarse con el Background Script
    chrome.runtime.sendMessage({ action: "search_question", question: qText }, (response) => {
      if (response && response.action === "highlight_answers" && response.answers && response.answers.length > 0) {
        highlightCorrectOptions(response.answers);
      }
    });
  }
});

function highlightCorrectOptions(correctAnswers) {
  // Extraer las posibles opciones 
  const optionLabels = document.querySelectorAll('.mcq__item label, .mcq__option label, label');
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
