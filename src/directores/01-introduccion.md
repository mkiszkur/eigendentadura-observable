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

```js
const preguntas = [
  {id: "P1", txt: "¿Existe un espacio latente compacto que describa la geometría dental poblacional?", cap: "7", estado: "Sí (PC1+PC2 ≈ 30%; 30 PCs → 95%).", color: "#54a24b"},
  {id: "P2", txt: "¿Qué normalización geométrica preserva mejor la señal anatómica?", cap: "6", estado: "Landmarks (R² covariables = 0.054 vs 0.541 raw, vs 0.124 bbox).", color: "#54a24b"},
  {id: "P3", txt: "¿Existen subgrupos discretos en la población dental?", cap: "9", estado: "No (silhouette < 0.15 en Z-scores, Procrustes y FDI-patterns). Resultado negativo.", color: "#e45756"},
  {id: "P4", txt: "¿Existe asociación geometría × patología global?", cap: "9", estado: "No detectada (resultado negativo).", color: "#e45756"},
  {id: "P5", txt: "¿Qué arquitectura de visualización soporta la exploración interactiva?", cap: "10", estado: "Observable Framework + ~30 componentes reactivos.", color: "#54a24b"},
];
display(html`<div style="display:grid; gap:0.7rem; margin:1rem 0;">
  ${preguntas.map(p => html`<div style="display:grid; grid-template-columns:50px 1fr; gap:0.8rem; padding:0.7rem 1rem; border-left:4px solid ${p.color}; background:${p.color}10; border-radius:4px;">
    <div style="font-weight:700; color:${p.color}; font-size:1.05rem;">${p.id}</div>
    <div>
      <div style="font-weight:500; margin-bottom:0.25rem;">${p.txt}</div>
      <div style="font-size:0.85rem; color:#555;"><strong>Estado (cap. ${p.cap}):</strong> ${p.estado}</div>
    </div>
  </div>`)}
</div>`);
```

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
