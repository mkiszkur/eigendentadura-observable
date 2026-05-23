---
title: Modo Presentación · Defensa de Tesis
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

# Modo Presentación · Defensa de Tesis

<div style="background:#1f2937; color:#e5e7eb; padding:1rem 1.5rem; border-radius:4px; margin:2rem 0;">
  <strong style="color:#fff;">MODO PRESENTACIÓN</strong> &nbsp;·&nbsp;
  8 slides para defensa de tesis. Navegación lineal con storytelling guiado.
  Atajos de teclado: ← / → para navegar.
</div>

## Inicio

```js
function slideCard(num, title, subtitle, href) {
  return html`<a href="${href}" style="
    display:block; 
    border:2px solid #4c78a8; 
    border-radius:8px; 
    padding:1.2rem 1.5rem; 
    text-decoration:none; 
    color:#222; 
    background:white; 
    transition:all 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
    <div style="
      font-size:2rem; 
      font-weight:700; 
      color:#4c78a8; 
      margin-bottom:0.5rem;
    ">${num}</div>
    <div style="
      font-weight:600; 
      font-size:1.2rem; 
      margin-bottom:0.4rem;
    ">${title}</div>
    <div style="
      font-size:0.9rem; 
      color:#666; 
      line-height:1.4;
    ">${subtitle}</div>
  </a>`;
}

display(htl.html`<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:1.2rem; margin:2rem 0;">
  ${slideCard("1", "Portada", "Título, autor, directores, programa.", "./01-portada")}
  ${slideCard("2", "El problema", "Hook narrativo: ¿por qué importa?", "./02-problema")}
  ${slideCard("3", "El dataset", "5.114 pantos, 7 versiones, cohortes.", "./03-dataset-cifras")}
  ${slideCard("4", "Las 5 preguntas", "P1–P5 contextualizadas.", "./04-preguntas")}
  ${slideCard("5", "Metodología", "Pipeline, parity, normalización.", "./05-metodologia")}
  ${slideCard("6", "Hallazgos clave", "Respuestas P1–P5, resultados negativos.", "./06-hallazgos")}
  ${slideCard("7", "La herramienta", "Demo del observable, escenarios.", "./07-herramienta")}
  ${slideCard("8", "Impacto y cierre", "Contribuciones, futuro, gracias.", "./08-cierre")}
</div>`);
```

---

## Notas de uso

- **Navegación:** Usar ← / → en el teclado, o botones en cada slide.
- **Tempo:** ~3 min por slide = 24 min totales (ajustar según timing real).
- **Interacción:** Las visualizaciones interactivas (mapa conceptual, Sankey, timeline) están disponibles en cada slide donde apliquen.
- **Público:** Jurado + directores. Asumir conocimiento mínimo de PCA / estadística, pero explicar terminología dental.

---

[← Volver a vista directores](../directores/index)
