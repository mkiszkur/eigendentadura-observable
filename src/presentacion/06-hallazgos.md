---
title: Slide 6 · Hallazgos clave
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {html} from "htl";
display(slideNav(6));
```

```js
function findingCard(emoji, title, items, color) {
  return html`<div style="
    background: white;
    border-left: 4px solid ${color};
    border-radius: 6px;
    padding: 1rem 1.2rem;
    margin: 1rem 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  ">
    <h3 style="margin: 0 0 0.6rem; color: ${color}; font-size: 1.15rem;">
      ${emoji} ${title}
    </h3>
    <div style="font-size: 0.95rem; line-height: 1.7; color: #555;">
      ${items.map(item => html`<div style="margin: 0.3rem 0;">• ${item}</div>`)}
    </div>
  </div>`;
}

function metricBox(label, value, unit = "", color = "#4c78a8") {
  return html`<div style="
    background: linear-gradient(135deg, ${color}15, ${color}05);
    border-left: 3px solid ${color};
    padding: 0.8rem 1rem;
    border-radius: 4px;
    display: inline-block;
    margin: 0.3rem 0.5rem 0.3rem 0;
  ">
    <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.2rem;">${label}</div>
    <div style="font-size: 1.5rem; font-weight: 700; color: ${color};">${value}<span style="font-size: 1rem; font-weight: 400;">${unit}</span></div>
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
      SLIDE 6 / 8
    </div>
    
    <h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1rem; line-height: 1.2;">
      Hallazgos clave
    </h1>
    
    <div style="background: #f3f0ff; border-left: 4px solid #7b52ab; padding: 1rem 1.2rem; margin: 0 0 1.5rem; border-radius: 4px;">
      <strong style="font-size: 1.1rem; color: #7b52ab;">Respuestas a P1–P5</strong><br>
      <span style="color: #666; font-size: 0.95rem;">Resultados positivos + resultados negativos robustos.</span>
    </div>
    
    ${findingCard("✅", "P1: Espacio latente compacto", [
      html`<strong>PC1:</strong> ${metricBox("Varianza explicada", "30.52", " %", "#4c78a8")} (contracciones laterales + rotaciones molares)`,
      html`<strong>PC1–PC4:</strong> ${metricBox("Varianza acumulada", "60.11", " %", "#4c78a8")}`,
      html`<strong>PC1–PC10:</strong> ${metricBox("Varianza acumulada", "80.04", " %", "#4c78a8")}`,
      html`<strong>Corpus:</strong> 853 pantos con dentición permanente completa`
    ], "#4c78a8")}
    
    ${findingCard("✅", "P2: Normalización superior", [
      html`Landmarks condíleos (<code>*_lm</code>) ${metricBox("Mejora", "10.5×", "", "#54a24b")} vs. normalización por imagen (<code>*_norm</code>)`,
      html`Varianza residual post-Procrustes: ${metricBox("", "1.54", " px²", "#54a24b")} vs. ${metricBox("", "16.12", " px²", "#e45756")}`
    ], "#54a24b")}
    
    ${findingCard("⚠️", "P3: Ausencia de subgrupos discretos", [
      html`<strong>Resultado negativo consolidado.</strong> Múltiples líneas de evidencia:`,
      html`• Clustering k-means sobre Z-scores: ${metricBox("Silhouette", "< 0.15", "", "#e45756")}`,
      html`• Clustering sobre Procrustes: ${metricBox("Silhouette", "0.092", "", "#e45756")}`,
      html`• Estratificación por patrón FDI: no reorganiza distribuciones`,
      html`<strong>Implicación:</strong> La variación dental es <strong>continua</strong>, no organizada en subpoblaciones discretas biológicamente significativas`
    ], "#e45756")}
    
    ${findingCard("⚠️", "P4: Geometría × Patología (mixto)", [
      html`<strong>No asociación global:</strong> PERMANOVA multivariada sobre PC1–PC10 × patologías: <em>p</em> > 0.05`,
      html`<strong>Sí asociaciones locales:</strong> ${metricBox("Pares significativos", "129", " / 1.024", "#f58518")} (FDI, patología) tras corrección BH`,
      html`<strong>Interpretación:</strong> Asociaciones débiles y localizadas, sin patrón global coherente`
    ], "#f58518")}
    
    ${findingCard("✅", "P5: Herramienta de visualización", [
      html`<strong>Observable Framework</strong> con 2 escenarios (poblacional + individual)`,
      html`Deploy: GitHub Pages (subtree mirror). Componentes: D3.js + Plot + htl`,
      html`~5.114 JSONs individuales para geometría por panto`,
      html`Público objetivo: odontólogos (exploración), directores (reproducibilidad)`
    ], "#7b52ab")}
    
    <div style="background: #eef2f7; border-left: 4px solid #4c78a8; padding: 1.2rem 1.5rem; margin: 1.5rem 0 0.5rem; border-radius: 4px;">
      <strong style="font-size: 1.1rem; color: #4c78a8;">Contribución metodológica</strong><br><br>
      <span style="font-size: 1rem; color: #555; line-height: 1.7;">
        Primera implementación documentada de <strong>eigendentadura</strong> y <strong>normalización por landmarks condíleos</strong> en análisis morfométrico dental poblacional.
      </span>
    </div>
    
  </div>
</div>`);
