---
title: 11 · Conclusiones
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("11"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./10-herramienta" style="color:#888;">← Cap. 10</a></span>
  <span><a href="./12-experimentos" style="color:#888;">Cap. 12 — Anexo →</a></span>
</div>

# 11 · Conclusiones

## 11.1 Respuestas a las preguntas de investigación

```js
const P = [
  {id: "P1", titulo: "Espacio latente compacto",
   resp: "Sí — k = 4 componentes ≈ 60% var; PC1 = 29.97% [28.80; 31.42] (forma genuina, no tamaño, exp18); estable bajo bootstrap.",
   color: "#54a24b", cap: "7"},
  {id: "P2", titulo: "Mejor normalización",
   resp: "Landmarks condíleos — reduce R² covariables 10× ($0.541 \\to 0.054$). PC1 por pieza pasa de 40% a 57%. Silhouette +47%.",
   color: "#54a24b", cap: "6"},
  {id: "P3", titulo: "Subgrupos discretos",
   resp: "No — silhouette ≤ 0.15 en Z-scores, Procrustes y FDI-patterns. 5+ algoritmos converger. Resultado negativo robusto.",
   color: "#e45756", cap: "9"},
  {id: "P4", titulo: "Asociación geometría × patología",
   resp: "Doble respuesta. Global: no (salvo neoformation, efecto pequeño). Local (FDI × patología): sí — 131/250 tests sig. BH q<0.05 (exp22).",
   color: "#f58518", cap: "8, 9"},
  {id: "P5", titulo: "Herramienta interactiva",
   resp: "Sí — app Observable Framework en GH Pages. ~30 componentes, navegación por panto individual, KPIs poblacionales, anexo experimentos.",
   color: "#54a24b", cap: "10"},
];
display(html`<div style="display:grid; gap:0.7rem;">
  ${P.map(p => html`<div style="display:grid; grid-template-columns:55px 1fr; gap:0.8rem; padding:0.8rem 1rem; border-left:4px solid ${p.color}; background:${p.color}10; border-radius:4px;">
    <div style="font-weight:700; color:${p.color}; font-size:1.05rem;">${p.id}</div>
    <div>
      <div style="font-weight:600; margin-bottom:0.25rem;">${p.titulo} <span style="font-weight:400; font-size:0.78rem; color:#777;">(cap. ${p.cap})</span></div>
      <div style="font-size:0.9rem; color:#444; line-height:1.5;">${p.resp}</div>
    </div>
  </div>`)}
</div>`);
```

## 11.2 Aportes principales

1. **Eigendentadura** como espacio latente compacto y estable.
2. **Normalización por landmarks condíleos** con validación cuantitativa
   contra alternativas (exp16).
3. **Mapa local FDI × patología** (exp22).
4. **Catálogo de errores de datos** C1–C9 / A1–A6 + corrección en
   pipeline + universo geométrico depurado.
5. **Herramienta de visualización** Observable Framework reproducible.
6. **Resultados negativos robustos** sobre clustering (cap. 9), aporte
   metodológico per se.

## 11.3 Limitaciones

- Cobertura **54%** de landmarks (estructural por versión LabelMe).
- Dentición permanente completa: solo **16.7%** del dataset.
- Sin GT diagnóstico longitudinal → sin validación supervisada
  externa.
- Sin metadata clínica (edad, género verificado, equipo) → sin
  desentrelazar covariables.
- `data_origin` mezcla múltiples factores.
- Tesis exploratoria: las preguntas de "predicción clínica" quedan
  **fuera de scope**.

## 11.4 Trabajo futuro

| Línea | Origen |
|---|---|
| Refinamiento normalización por **afín** (3 puntos) | cap. 6 |
| **PCA por bloques** (posición vs ángulo) | cap. 7 |
| Detector NN de landmarks v3 (refinamiento exp04) | exp31 (en curso) |
| Imputación geométrica para pantos con FDI parcial | exp31 |
| Stage 36 en Observable: vista de apinamiento (exp28) | cap. 10 |
| Validación clínica cualitativa estructurada | cap. 10 |
| Cruce con metadata clínica si se obtiene | — |

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./10-herramienta" style="color:#888;">← Cap. 10</a>
  <a href="./12-experimentos" style="color:#4c78a8; font-weight:600;">Cap. 12 — Anexo experimentos →</a>
</div>
