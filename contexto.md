# CONTEXTO DE PROYECTO — GHOST AGENT

> Fuente de verdad del proyecto. Si algo aquí contradice el código, el código manda.
> Actualiza este archivo ante cambios arquitectónicos relevantes.

---

## Identidad del Proyecto

- **Nombre**: Ghost Agent (NetAcad Assistant)
- **Versión actual**: 1.0.0 (Fase Inicial)
- **Plataforma**: Google Chrome Extension (Manifest V3)
- **Stack**: Vanilla JS, HTML, CSS puro (CERO frameworks).

---

## Propósito

Ghost Agent es una extensión discreta diseñada para asistir en evaluaciones de Cisco Networking Academy. Trabaja 100% offline y en memoria para evitar detecciones de telemetría y bloqueos de red (CSP) implementados por NetAcad.

**Filosofía central**: Invisibilidad y velocidad. Sin interfaces gráficas intrusivas, sin llamadas a APIs externas en tiempo de ejecución, sin clicks automatizados (para evitar banderas rojas en telemetría).

---

## Arquitectura y Componentes

1. **La Base de Datos (`database.json`)**:
   - Archivo local dentro de la extensión.
   - Contiene un array de objetos con la pregunta (`q`) y un array de respuestas correctas (`a`).

2. **Cerebro / Background Script (`background.js`)**:
   - Funciona como Service Worker.
   - Carga y mantiene el `database.json` en memoria.
   - Implementa el motor de búsqueda difusa (Distancia de Levenshtein) para tolerar errores tipográficos entre la web y la base de datos.
   - Escucha los atajos de teclado (`Ctrl+Q`).

3. **Inyector / Content Script (`content.js`)**:
   - Extrae la pregunta activa del DOM (`.mcq__body-inner p`).
   - Extrae las opciones del DOM limpiando "basura" inyectada para screen readers (`.screenReader-position-text`).
   - Se comunica vía paso de mensajes con el Background Script.
   - Aplica un sombreado CSS sutil (`highlight`) sobre los elementos `<label>` correctos devueltos por el cerebro.

---

## Restricciones Duras (Reglas de Desarrollo)

- **CERO Peticiones Externas**: NetAcad bloquea `fetch` a dominios externos mediante un CSP muy estricto (`ERR_BLOCKED_BY_CLIENT`). Todo procesamiento debe ser local.
- **Limpieza del DOM Obligatoria**: Las opciones de NetAcad inyectan `<span class="screenReader-position-text">1 of 4</span>` ocultos. Estos deben eliminarse del texto clonado antes de comparar, de lo contrario la búsqueda fallará.
- **CERO Auto-Clicks**: La extensión *sugiere* (sombrea), pero el usuario *actúa* (hace click).
- **Fallos Silenciosos**: Si la pregunta no se encuentra, la extensión simplemente no hace nada. No lanza alertas ni interrumpe la UI del examen.

---

## Estado Actual
- [ ] Fase 1: Setup inicial (Manifest V3, Background, Content script, JSON mock).
- [ ] Fase 2: Lógica de limpieza del DOM y paso de mensajes.
- [ ] Fase 3: Algoritmo Levenshtein y Highlighting.