---
title: Slide 4 · Las 5 preguntas
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
display(slideNav(4));
```

<div style="
  min-height: 80vh; 
  background: white; 
  padding: 2rem; 
  border-radius: 8px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
">

<div style="max-width: 900px; margin: 0 auto;">

<div style="font-size: 0.75rem; color: #999; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 0.5rem;">
  SLIDE 4 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  Las 5 preguntas de investigación
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

```js
function questionCard(num, question, shortAnswer, color) {
  return html`<div style="
    background: white; 
    border-left: 5px solid ${color}; 
    padding: 1.2rem 1.5rem; 
    border-radius: 4px; 
    margin: 1rem 0; 
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  ">
    <div style="
      font-size: 0.75rem; 
      color: ${color}; 
      font-weight: 700; 
      letter-spacing: 0.1em; 
      margin-bottom: 0.5rem;
    ">P${num}</div>
    <div style="
      font-weight: 600; 
      font-size: 1.1rem; 
      margin-bottom: 0.6rem; 
      color: #1f2937;
    ">${question}</div>
    <div style="
      font-size: 0.95rem; 
      color: #666;
    ">${shortAnswer}</div>
  </div>`;
}

display(htl.html`<div>
  ${questionCard("1", "¿Existe un espacio latente compacto que capture la variación dental geométrica normal?", 
    "Sí. PCA sobre 96 features (32 dientes × {cx, cy, θ}): PC1–PC4 capturan ~60 % de la varianza.", 
    "#4c78a8")}
  
  ${questionCard("2", "¿Qué normalización geométrica es mejor?", 
    "Normalización por landmarks condíleos supera a normalización por imagen: reduce varianza residual 10×.", 
    "#54a24b")}
  
  ${questionCard("3", "¿Existen subpoblaciones discretas?", 
    "No. Silhouette < 0.15, distribución continua. Resultado negativo robusto.", 
    "#e45756")}
  
  ${questionCard("4", "¿Se asocia la geometría dental con patologías?", 
    "No a nivel global (PERMANOVA ns). Sí a nivel local: 129 pares (FDI, patología) significativos tras BH.", 
    "#f58518")}
  
  ${questionCard("5", "¿Cómo construir una herramienta de visualización para odontólogos?", 
    "Observable Framework con 2 escenarios: poblacional (KDE, eigendentadura) e individual (z-scores, odontograma).", 
    "#7b52ab")}
</div>`);
```

<div style="background: #f5f7fa; border-left: 4px solid #333; padding: 1rem 1.2rem; margin: 2rem 0; border-radius: 4px; font-size: 0.95rem;">
  <strong>Nota metodológica:</strong> Las preguntas P1–P5 se formularon **antes** del análisis (no post-hoc). Los resultados negativos (P3, P4 global) son parte del aporte científico y se reportan con el mismo rigor que los positivos.
</div>

</div>

</div>

</div>
