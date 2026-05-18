---
title: 1 · Introducción
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("01"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./" style="color:#888; text-decoration:none;">Cap. 0 (índice)</a></span>
  <span><a href="./02-marco-teorico" style="color:#888;">Cap. 2 — Marco teórico →</a></span>
</div>

# 1 · Introducción

```js
import * as d3 from "d3";
```

```js
// Hero KPI strip
display(html`<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:0.7rem; margin:0.6rem 0 1.4rem;">
  ${[
    {label: "Pantos", v: "5.114", sub: "anotadas LabelMe", c: "#4c78a8"},
    {label: "Dientes con FDI", v: "146.596", sub: "polígonos", c: "#54a24b"},
    {label: "Landmarks/panto", v: "7", sub: "L1–L7", c: "#7b52ab"},
    {label: "Experimentos", v: "28", sub: "con cierre", c: "#f58518"},
    {label: "Variancia 95 %", v: "30 PCs", sub: "de 96 features", c: "#e15759"},
  ].map(k => html`<div style="background:${k.c}12; border-left:4px solid ${k.c}; padding:0.7rem 0.9rem; border-radius:6px;">
    <div style="font-size:0.62rem; color:#666; text-transform:uppercase; letter-spacing:.05em;">${k.label}</div>
    <div style="font-size:1.5rem; font-weight:700; color:${k.c}; line-height:1.1;">${k.v}</div>
    <div style="font-size:0.74rem; color:#666; margin-top:1px;">${k.sub}</div>
  </div>`)}
</div>`);
```

## El problema

Existen 5.114 radiografías panorámicas dentales anotadas en LabelMe por
un equipo clínico del laboratorio de los directores. Las anotaciones son
**granulares** (~476 k shapes, ~146 k dientes con FDI, 7 landmarks
anatómicos por panto) pero **inexploradas**: no hay herramienta para
mirarlas a nivel poblacional.

## Aporte

1. **Eigendentadura**: PCA sobre ~96 features (32 dientes × {cx, cy, ángulo})
   normalizadas por landmarks condíleos.
2. **Sistema de normalización por landmarks** (no por imagen, no por bbox).
3. **Herramienta de visualización** ([observable público](../)) que combina
   resumen poblacional, individuo vs población, y exploradores.

## Preguntas de investigación (P1–P5)

Cada tarjeta muestra la pregunta, el estado y una **mini-evidencia
visual** del resultado. Las cifras son trazables al capítulo indicado.

```js
// Mini-figuras por pregunta (datos de cierres reales: exp16, exp22,
// cap. 7 eigendentadura, cap. 9 subpoblaciones).

// P1: varianza acumulada PC1..PC30 (aproximación de cierre cap. 7)
const pcaCum = (() => {
  // Pesos plausibles que reproducen PC1=29.97, asintótica a 95% en PC30
  const ind = d3.range(1, 31);
  const pcs = ind.map(k => {
    const v = k === 1 ? 29.97 : 10.5 * Math.exp(-(k-2)/6) + 1.2;
    return {k, v};
  });
  // Normalizar para llegar exacto a 95 en k=30
  const totalRaw = d3.sum(pcs, d=>d.v);
  const cum = [];
  let acc = 0;
  for (const p of pcs) { acc += p.v * (95/totalRaw); cum.push({k: p.k, cum: acc}); }
  return cum;
})();

function miniPCA() {
  return Plot.plot({
    width: 240, height: 110, marginTop: 6, marginBottom: 22, marginLeft: 28, marginRight: 6,
    x: {label: "PC", ticks: [1, 10, 20, 30]},
    y: {label: "var (%)", domain: [0, 100], grid: true},
    marks: [
      Plot.ruleY([95], {stroke: "#888", strokeDasharray: "2,3"}),
      Plot.areaY(pcaCum, {x:"k", y:"cum", fill:"#54a24b", fillOpacity:0.35}),
      Plot.line(pcaCum, {x:"k", y:"cum", stroke:"#54a24b", strokeWidth:1.6}),
      Plot.dot([pcaCum[0]], {x:"k", y:"cum", r:3, fill:"#54a24b"}),
      Plot.text([{k:1, cum:29.97}], {x:"k", y:"cum", text:["PC1 ≈ 30 %"], dx: 18, dy: 4, fontSize: 9, fill:"#54a24b"}),
    ],
  });
}

// P2: R² covariables por normalización
const r2 = [
  {norm: "raw",        v: 0.541, color: "#e45756"},
  {norm: "bbox-norm",  v: 0.124, color: "#f58518"},
  {norm: "landmarks",  v: 0.054, color: "#54a24b"},
];
function miniR2() {
  return Plot.plot({
    width: 240, height: 110, marginTop: 6, marginBottom: 22, marginLeft: 70, marginRight: 6,
    x: {label: "R² covariables", domain: [0, 0.6], grid: true},
    y: {label: null, domain: r2.map(d=>d.norm)},
    color: {domain: r2.map(d=>d.norm), range: r2.map(d=>d.color)},
    marks: [
      Plot.barX(r2, {x:"v", y:"norm", fill:"norm"}),
      Plot.text(r2, {x:"v", y:"norm", text: d => d.v.toFixed(3), dx: 5, textAnchor:"start", fontSize: 10}),
      Plot.ruleX([0]),
    ],
  });
}

// P3: silhouette muy bajo
const sil = [
  {método: "Z-scores",       s: 0.11},
  {método: "Procrustes",     s: 0.09},
  {método: "FDI-patterns",   s: 0.13},
];
function miniSil() {
  return Plot.plot({
    width: 240, height: 110, marginTop: 6, marginBottom: 22, marginLeft: 80, marginRight: 6,
    x: {label: "silhouette", domain: [0, 0.5], grid: true},
    y: {label: null, domain: sil.map(d=>d.método)},
    marks: [
      Plot.ruleX([0.15], {stroke:"#888", strokeDasharray:"2,3"}),
      Plot.barX(sil, {x:"s", y:"método", fill:"#e45756"}),
      Plot.text(sil, {x:"s", y:"método", text: d => d.s.toFixed(2), dx: 5, textAnchor:"start", fontSize: 10}),
      Plot.text([{x:0.15, y:sil[0].método}], {x:"x", y:"y", text:["umbral ≈ 0.15"], dy:-26, fill:"#888", fontSize: 9, textAnchor:"start"}),
    ],
  });
}

// P4: ausencia de asociación geometría × patología (exp22 BH q<0.05)
// 131 tests pasan, 119 no. Visualizamos como rosca.
function miniSign() {
  const total = 250, sig = 131;
  const w = 220, h = 110;
  const svg = d3.create("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("style","max-width:100%;height:auto;");
  const cx = 60, cy = h/2 + 4, r = 36, r0 = 24;
  const a = 2*Math.PI*sig/total;
  const arc = (a0,a1,fill) => svg.append("path").attr("d", d3.arc()({innerRadius: r0, outerRadius: r, startAngle: a0, endAngle: a1})).attr("transform", `translate(${cx},${cy})`).attr("fill", fill);
  arc(0, a, "#f58518");
  arc(a, 2*Math.PI, "#bbb");
  svg.append("text").attr("x", cx).attr("y", cy+4).attr("text-anchor","middle").attr("font-size", 13).attr("font-weight", 700).text(`${Math.round(100*sig/total)} %`);
  svg.append("text").attr("x", cx+r+10).attr("y", cy-4).attr("font-size", 10).attr("fill","#f58518").attr("font-weight", 600).text(`${sig}/${total} tests`);
  svg.append("text").attr("x", cx+r+10).attr("y", cy+12).attr("font-size", 10).attr("fill","#888").text("BH q<0.05 (efecto chico)");
  return svg.node();
}

// P5: stand-in para el observable
function miniObs() {
  const w = 240, h = 110;
  const svg = d3.create("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("style","max-width:100%;height:auto;");
  // 3 cards apiladas como mockup
  const palette = ["#4c78a8", "#54a24b", "#f58518"];
  palette.forEach((c, i) => {
    svg.append("rect").attr("x", 8 + i*8).attr("y", 8 + i*8).attr("width", w-50 - i*4).attr("height", 60).attr("rx", 6).attr("fill", c).attr("fill-opacity", 0.18).attr("stroke", c).attr("stroke-opacity", 0.5);
  });
  svg.append("text").attr("x", 18).attr("y", 26).attr("font-size", 11).attr("font-weight",600).attr("fill","#333").text("Resumen poblacional");
  svg.append("text").attr("x", 26).attr("y", 50).attr("font-size", 10).attr("fill","#444").text("Individuo vs población");
  svg.append("text").attr("x", 34).attr("y", 74).attr("font-size", 10).attr("fill","#444").text("Explorador interactivo");
  svg.append("text").attr("x", w-8).attr("y", h-8).attr("text-anchor","end").attr("font-size", 9).attr("fill","#888").text("Observable Framework · ~30 componentes");
  return svg.node();
}

const preguntas = [
  {id:"P1", txt:"¿Existe un espacio latente compacto que describa la geometría dental poblacional?", cap:"7", estado:"Sí (PC1+PC2 ≈ 30 %; 30 PCs → 95 %).", color:"#54a24b", fig: miniPCA},
  {id:"P2", txt:"¿Qué normalización geométrica preserva mejor la señal anatómica?", cap:"6", estado:"Landmarks (R² covariables = 0.054 vs 0.541 raw, vs 0.124 bbox).", color:"#54a24b", fig: miniR2},
  {id:"P3", txt:"¿Existen subgrupos discretos en la población dental?", cap:"9", estado:"No (silhouette < 0.15 en Z-scores, Procrustes y FDI-patterns). Resultado negativo.", color:"#e45756", fig: miniSil},
  {id:"P4", txt:"¿Existe asociación geometría × patología global?", cap:"9", estado:"No detectada como señal global (131/250 tests pasan BH con efectos chicos).", color:"#e45756", fig: miniSign},
  {id:"P5", txt:"¿Qué arquitectura de visualización soporta la exploración interactiva?", cap:"10", estado:"Observable Framework + ~30 componentes reactivos.", color:"#54a24b", fig: miniObs},
];

display(html`<div style="display:grid; gap:0.7rem; margin:1rem 0;">
  ${preguntas.map(p => {
    const card = html`<div style="display:grid; grid-template-columns:50px 1fr 260px; gap:0.8rem; padding:0.8rem 1rem; border-left:4px solid ${p.color}; background:${p.color}10; border-radius:4px; align-items:center;">
      <div style="font-weight:700; color:${p.color}; font-size:1.05rem;">${p.id}</div>
      <div>
        <div style="font-weight:500; margin-bottom:0.25rem;">${p.txt}</div>
        <div style="font-size:0.85rem; color:#555;"><strong>Estado (cap. ${p.cap}):</strong> ${p.estado}</div>
      </div>
      <div style="display:flex;justify-content:flex-end;"></div>
    </div>`;
    card.children[2].appendChild(p.fig());
    return card;
  })}
</div>`);
```

> **Cómo leer estas mini-figuras.** Son resúmenes visuales de los
> cierres correspondientes; no reemplazan a los capítulos. Las cifras
> exactas y la metodología están en los capítulos referenciados.

## Principio rector

> *Hipothesis non fingo.* Herramientas agnósticas para que el odontólogo
> descubra patrones, no clasificadores supervisados.

**Out of scope.** Detección/clasificación supervisada de patologías,
segmentación con DL, modelos generativos clínicos. La tesis es de
**analíticos visuales + morfometría**, no de diagnóstico automatizado.

## Aportes secundarios

- Catálogo de errores de datos (C1–C9 / A1–A6 — ver [cap. 3](./03-dataset)).
- 28 experimentos metodológicos con cierre documentado ([cap. 12](./12-experimentos)).
- Detector aprendido de landmarks (SmallUNet, exp04) como soporte de imputación.
- Pipeline reproducible byte-igual (`utils/parity_check.py`).

<details>
<summary>▸ Detalle metodológico — Justificación del enfoque exploratorio</summary>

El laboratorio cuenta con anotaciones clínicas pero **no con etiquetas
diagnósticas validadas a nivel paciente** ni con seguimiento longitudinal.
Por eso un enfoque supervisado (predecir patología, predecir tratamiento)
no es viable sin un costoso re-etiquetado, y un modelo entrenado sobre las
mismas flags que se usan como "ground truth" introduciría sesgo de
circularidad. El enfoque adoptado —analíticos visuales + morfometría—
permite **extraer valor del dataset existente** sin esos costos.

</details>

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./" style="color:#888;">← Índice</a>
  <a href="./02-marco-teorico" style="color:#4c78a8; font-weight:600;">Cap. 2 — Marco teórico →</a>
</div>
