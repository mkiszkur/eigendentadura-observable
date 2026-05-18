---
title: 12 · Anexo de experimentos
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("12"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./11-conclusiones" style="color:#888;">← Cap. 11</a></span>
  <span><a href="./" style="color:#888;">Índice ↑</a></span>
</div>

# 12 · Anexo de experimentos

Catálogo resumido. Cada experimento tiene `00_plan.md` + `99_cierre.md` en
`docs/experimentos/NN_<slug>/` con métricas, decisiones y trazabilidad.

```js
const exps = [
  {n: "01", titulo: "LLM visual vs prior geométrico", veredicto: "❌ Negativo", color: "#e45756", relacion: "Marco teórico", desc: "Probar LLM multimodal para anotar landmarks — peor que prior."},
  {n: "02", titulo: "Landmarks por CV híbrida", veredicto: "❌ Negativo", color: "#e45756", relacion: "Cap. 6", desc: "Heurísticas clásicas insuficientes."},
  {n: "03", titulo: "Preprocesamiento + re-anchor", veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 6", desc: "Mejora marginal sobre exp02."},
  {n: "04", titulo: "Detector NN (SmallUNet)", veredicto: "✅ Adoptado", color: "#54a24b", relacion: "Pipeline (modelo canon)", desc: "Checkpoint v2 con TTA flip + softargmax. Imputación de landmarks."},
  {n: "05", titulo: "Propagación + imputación FDI", veredicto: "✅ Adoptado", color: "#54a24b", relacion: "Cap. 3/8", desc: "Estratificación + Uso E.B (FDI patterns)."},
  {n: "06", titulo: "Refinement de landmarks",      veredicto: "✅ Adoptado", color: "#54a24b", relacion: "Pipeline",     desc: "BplusD_10: refiner solo en L1/L2/L6/L7 con Δ≤10px."},
  {n: "07", titulo: "Ensemble de detectores",       veredicto: "❌ Negativo", color: "#e45756", relacion: "—",            desc: "No mejora sobre v2 + refinement."},
  {n: "08", titulo: "Robustez eigendentadura",      veredicto: "✅ Confirmado", color: "#54a24b", relacion: "Cap. 7",     desc: "Bootstrap estable. CI 95% para PC1."},
  {n: "09", titulo: "Dientes faltantes",            veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 8",        desc: "Caracterización de patrones de ausencia."},
  {n: "10", titulo: "Supers + temporales",          veredicto: "✅ Adoptado", color: "#54a24b", relacion: "Cap. 9.5",     desc: "Mahalanobis mixta 2.36 vs 2.06 limpia."},
  {n: "11", titulo: "Forma del diente",             veredicto: "❌ Negativo", color: "#e45756", relacion: "Cap. 8.6",      desc: "Variaciones intra-FDI son artefactos de anotación."},
  {n: "12", titulo: "Eigendentadura por arco",      veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 7",        desc: "Por arcada superior/inferior separadas."},
  {n: "13", titulo: "Asimetría izq/der",            veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 8",        desc: "Asimetría detectable pero clínicamente menor."},
  {n: "14", titulo: "Imputación FDI",                veredicto: "❌ Negativo", color: "#e45756", relacion: "—",           desc: "Imputación de FDI faltante no confiable."},
  {n: "15", titulo: "Clustering arcada",            veredicto: "❌ Negativo", color: "#e45756", relacion: "Cap. 9",        desc: "Refuerza P3 negativo."},
  {n: "16", titulo: "Comparación normalizaciones",   veredicto: "✅ ★ Central", color: "#7b52ab", relacion: "Cap. 6",     desc: "raw vs *_norm vs *_lm. R² covariables: 0.541 / 0.124 / 0.054."},
  {n: "17", titulo: "Eigendentadura intersplit",     veredicto: "✅ Confirmado", color: "#54a24b", relacion: "Cap. 7",    desc: "Reproducible entre corpus / val / holdout."},
  {n: "18", titulo: "PC1 = tamaño vs forma",        veredicto: "✅ ★ Central", color: "#7b52ab", relacion: "Cap. 7.2",   desc: "Bajo *_lm, PC1 es forma genuina (R² vs S1 = 0.087)."},
  {n: "19", titulo: "Detección errores anotación",   veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 3.7",    desc: "Detector heurístico para A6 (arcos invertidos)."},
  {n: "20", titulo: "Sesgo versión LabelMe",        veredicto: "✅ ★ Hallazgo", color: "#7b52ab", relacion: "Cap. 3.2",    desc: "Schema clínico cambia entre versiones. Prevalencias deben condicionarse."},
  {n: "21", titulo: "Manifold no lineal",           veredicto: "❌ Negativo", color: "#e45756", relacion: "Cap. 7",        desc: "UMAP/t-SNE sin separabilidad real."},
  {n: "22", titulo: "Asociación local FDI×patol.",   veredicto: "✅ ★ Central", color: "#7b52ab", relacion: "Cap. 8.7",   desc: "131/250 tests sig. BH q<0.05 vs 12.5 esperados."},
  {n: "23", titulo: "Auditoría outliers PCA",        veredicto: "✅ Adoptado", color: "#54a24b", relacion: "Cap. 8",       desc: "Mecanismo Mahalanobis robusto (MCD)."},
  {n: "24", titulo: "Distancia prototipo",          veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 9.6",      desc: "Neoformation con efecto pequeño global."},
  {n: "25", titulo: "Clustering dentaduras",         veredicto: "❌ Negativo", color: "#e45756", relacion: "Cap. 9",      desc: "Refuerza P3 negativo."},
  {n: "26", titulo: "Clustering enriquecido",        veredicto: "❌ Negativo", color: "#e45756", relacion: "Cap. 9",      desc: "Idem incluso con features extra."},
  {n: "27", titulo: "Fallos forma vs apinamiento",   veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 9.3",    desc: "Antesala de exp28."},
  {n: "28", titulo: "Apinamiento vs dentadura",     veredicto: "✅ Adoptado", color: "#54a24b", relacion: "Cap. 9.3",     desc: "F21 en U_canon = arcadas con extras; en U_canon_clean = apinamiento (~4%)."},
  {n: "29", titulo: "Forma supers + temporales",     veredicto: "🟡 Parcial", color: "#f58518", relacion: "Cap. 9.5",    desc: "Caracterización morfológica."},
  {n: "30", titulo: "Clustering curva maxilar",      veredicto: "🟡 Prelim", color: "#f58518", relacion: "Cap. 9.2",     desc: "Sin clusters; consistente con P3."},
  {n: "31", titulo: "Imputación geométrica NN",      veredicto: "🟡 En curso", color: "#f58518", relacion: "Futuro",      desc: "Predicción de centroide+ángulo para FDI ausente."},
];
display(html`<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">#</th>
    <th style="text-align:left; padding:6px 10px;">Título</th>
    <th style="text-align:left; padding:6px 10px;">Veredicto</th>
    <th style="text-align:left; padding:6px 10px;">Relación</th>
    <th style="text-align:left; padding:6px 10px;">Resumen</th>
  </tr></thead>
  <tbody>${exps.map(e => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace; color:#888;">exp${e.n}</td>
    <td style="padding:5px 10px; font-weight:500;">${e.titulo}</td>
    <td style="padding:5px 10px; color:${e.color}; font-weight:600; white-space:nowrap;">${e.veredicto}</td>
    <td style="padding:5px 10px; font-size:0.8rem; color:#666;">${e.relacion}</td>
    <td style="padding:5px 10px; color:#444; font-size:0.82rem;">${e.desc}</td>
  </tr>`)}</tbody>
</table>`);
```

## Distribución de veredictos

```js
const vd = [
  {tag: "✅ ★ Central",   n: 4, color: "#7b52ab"},
  {tag: "✅ Adoptado/Confirmado", n: 9, color: "#54a24b"},
  {tag: "🟡 Parcial/Prelim/En curso", n: 11, color: "#f58518"},
  {tag: "❌ Negativo",     n: 9, color: "#e45756"},
];
display(Plot.plot({
  width: Math.min(width, 580), height: 180, marginLeft: 200,
  x: {label: "Cantidad de experimentos", grid: true},
  y: {label: null, domain: vd.map(v=>v.tag)},
  marks: [
    Plot.barX(vd, {x: "n", y: "tag", fill: d=>d.color, tip: true}),
    Plot.text(vd, {x: "n", y: "tag", text: "n", dx: 4, textAnchor: "start", fontSize: 12, fontWeight: 600}),
  ],
}));
```

**~28% negativos** y **~36% parciales**: documentar resultados negativos
con el mismo rigor que los positivos es parte del aporte.

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./11-conclusiones" style="color:#888;">← Cap. 11</a>
  <a href="./" style="color:#4c78a8; font-weight:600;">↑ Índice</a>
</div>
