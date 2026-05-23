---
title: Slide 2 · El problema
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {html} from "htl";
display(slideNav(2));
```

```js
function emphasisBox(content, color = "#7b52ab", background = "#f3f0ff") {
  return html`<div style="
    background: ${background}; 
    border-left: 4px solid ${color}; 
    padding: 1.2rem 1.5rem; 
    margin: 1.5rem 0; 
    border-radius: 4px;
    font-size: 1.1rem;
    line-height: 1.6;
  ">${content}</div>`;
}

function bulletPoint(icon, label, text) {
  return html`<div style="
    display: flex; 
    gap: 1rem; 
    margin: 1.2rem 0;
    align-items: flex-start;
  ">
    <div style="
      font-size: 1.8rem; 
      flex-shrink: 0;
      line-height: 1;
    ">${icon}</div>
    <div style="flex: 1;">
      <strong style="color: #1f2937;">${label}</strong>
      <div style="color: #666; margin-top: 0.3rem; line-height: 1.6;">${text}</div>
    </div>
  </div>`;
}

display(html`<div style="
  min-height: 80vh; 
  background: white; 
  padding: 2rem; 
  border-radius: 8px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
">
  <div style="max-width: 900px; margin: 0 auto;">
    
    <div style="font-size: 0.75rem; color: #999; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 0.5rem;">
      SLIDE 2 / 8
    </div>
    
    <h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
      El problema
    </h1>
    
    ${emphasisBox(html`
      <strong style="font-size: 1.2rem;">¿Cómo se analiza la geometría dental poblacional de forma reproducible y explorable?</strong>
    `)}
    
    ${bulletPoint("🦷", "Contexto clínico", 
      "La radiografía panorámica (pantomografía) es el estudio de primera línea en odontología. Captura ambas arcadas dentales, ATM, senos maxilares y estructuras adyacentes en una sola imagen.")}
    
    ${bulletPoint("⚠️", "Problema", 
      "Las anotaciones geométricas (posición, orientación, presencia/ausencia de dientes, patologías) se almacenan en JSON heterogéneos (7 versiones de esquema LabelMe) sin un pipeline estándar de análisis.")}
    
    ${bulletPoint("💡", "Oportunidad", 
      "~5.114 pantomografías anotadas manualmente por odontólogos expertos, con metadata clínica (origen geográfico, género, patologías). Único dataset de esta escala con anotaciones geométricas completas en Argentina.")}
    
    ${bulletPoint("🔍", "Gap", 
      "No hay precedentes de eigendentadura (análogo dental a eigenfaces) ni de normalización por landmarks condíleos en la literatura. Las herramientas existentes son supervisadas (clasificadores de patologías), no exploratorias.")}
    
    ${emphasisBox(html`
      <strong>Principio rector:</strong> <em>"Hipótesis non fingo"</em> (Newton, Principia).<br>
      Herramientas agnósticas para que el odontólogo <strong>descubra</strong> patrones, no clasificadores supervisados.
    `, "#4c78a8", "#eef2f7")}
    
  </div>
</div>`);
```
