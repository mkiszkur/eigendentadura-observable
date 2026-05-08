---
title: ¿Existen subtipos de dentadura?
---

# ¿Existen subtipos de dentadura?

Si existieran fenotipos dentales discretos — por ejemplo, un "tipo angosto", un "tipo ancho" — deberían ser detectables como clusters separados en el espacio de z-scores. Evaluamos **5 algoritmos** sobre **${clustering.meta.n_dentitions}** dentaduras completas (32/32 FDI) para responder esta pregunta. La respuesta es **no** — y ese resultado es en sí mismo informativo sobre la naturaleza de la variabilidad dental.

_Espacio de features: ${clustering.meta.n_features} z-scores → PCA (${clustering.pca.n_components_90} PCs, 90% varianza) → clustering._

```js
import {algorithmSection} from "./components/algorithm-section.js";
import * as d3 from "d3";
```

```js
const clustering = FileAttachment("data/clustering.json").json();
const pantosRawCl = await FileAttachment("data/pantos_browser.json").json();
const pantosMapCl = new Map(pantosRawCl.pantos.map(p => [p.archivo, p]));
```

## Comparación de Silhouette

```js
Plot.plot({
  width: Math.min(width, 600),
  height: 300,
  marginLeft: 140,
  x: {label: "Silhouette score", domain: [0, 0.2]},
  y: {label: null},
  color: {
    domain: clustering.meta.k_values.map(String),
    range: ["#4e79a7", "#e15759"],
    legend: true,
  },
  marks: [
    Plot.ruleX([0]),
    Plot.barX(clustering.silhouette_table, {
      y: "algorithm",
      x: "silhouette",
      fill: d => String(d.k),
      dx: 0.5,
      sort: {y: "-x"},
    }),
    Plot.text(clustering.silhouette_table, {
      y: "algorithm",
      x: "silhouette",
      text: d => d.silhouette.toFixed(3),
      dx: 4,
      fill: d => String(d.k),
      fontSize: 11,
      textAnchor: "start",
    }),
    Plot.ruleX([0.25], {stroke: "#999", strokeDasharray: "6,4"}),
  ]
})
```

<small>Valores < 0.25 indican que no hay clusters naturales bien separados — la población es un **continuo**.</small>

## Varianza explicada — PCA

```js
{
  const cumVar = clustering.pca.cumulative_variance;
  const data = cumVar.map((v, i) => ({pc: i + 1, cumvar: v}));

  display(Plot.plot({
    width: Math.min(width, 500),
    height: 300,
    x: {label: "Componente principal", tickFormat: "d"},
    y: {label: "Varianza acumulada", domain: [0, 1], tickFormat: ".0%"},
    marks: [
      Plot.ruleY([0.9], {stroke: "#e15759", strokeDasharray: "6,4", strokeOpacity: 0.6}),
      Plot.text([{x: 10, y: 0.915}], {x: "x", y: "y", text: d => "90%", fill: "#e15759", fontSize: 10}),
      Plot.line(data, {x: "pc", y: "cumvar", stroke: "#4e79a7", strokeWidth: 2}),
      Plot.dot(data, {x: "pc", y: "cumvar", fill: "#4e79a7", r: 4}),
    ]
  }));
}
```

```js
const algKeys = [
  {key: "kmeans", label: "KMeans"},
  {key: "ward", label: "Agglomerative Ward"},
  {key: "gmm", label: "Gaussian Mixture"},
  {key: "spectral", label: "Spectral"},
];
```

## KMeans

```js
{
  const a = algKeys[0];
  display(algorithmSection({
    algorithmKey: a.key,
    algorithmLabel: a.label,
    runs: clustering.runs.filter(r => r.algorithm === a.key),
    labels: clustering.labels,
    eigendentadura: clustering.eigendentadura,
    dentitions: clustering.dentitions,
    pcaMeta: clustering.pca,
    meta: clustering.meta,
    width: Math.min(width, 960),
    pantosMap: pantosMapCl,
  }));
}
```

## Agglomerative Ward

```js
{
  const a = algKeys[1];
  display(algorithmSection({
    algorithmKey: a.key,
    algorithmLabel: a.label,
    runs: clustering.runs.filter(r => r.algorithm === a.key),
    labels: clustering.labels,
    eigendentadura: clustering.eigendentadura,
    dentitions: clustering.dentitions,
    pcaMeta: clustering.pca,
    meta: clustering.meta,
    width: Math.min(width, 960),
    pantosMap: pantosMapCl,
  }));
}
```

## Gaussian Mixture (GMM)

```js
{
  const a = algKeys[2];
  display(algorithmSection({
    algorithmKey: a.key,
    algorithmLabel: a.label,
    runs: clustering.runs.filter(r => r.algorithm === a.key),
    labels: clustering.labels,
    eigendentadura: clustering.eigendentadura,
    dentitions: clustering.dentitions,
    pcaMeta: clustering.pca,
    meta: clustering.meta,
    width: Math.min(width, 960),
    pantosMap: pantosMapCl,
  }));
}
```

## Spectral

```js
{
  const a = algKeys[3];
  display(algorithmSection({
    algorithmKey: a.key,
    algorithmLabel: a.label,
    runs: clustering.runs.filter(r => r.algorithm === a.key),
    labels: clustering.labels,
    eigendentadura: clustering.eigendentadura,
    dentitions: clustering.dentitions,
    pcaMeta: clustering.pca,
    meta: clustering.meta,
    width: Math.min(width, 960),
    pantosMap: pantosMapCl,
  }));
}
```

## HDBSCAN

A diferencia de los anteriores, HDBSCAN determina el número de clusters automáticamente y puede dejar puntos sin asignar (etiqueta **ruido**). Se corrió un sweep sobre `min_cluster_size ∈ {10,15,20,30,50}` × `min_samples ∈ {3,5}` y se eligió la configuración con mejor silhouette.

```js
{
  display(algorithmSection({
    algorithmKey: "hdbscan",
    algorithmLabel: "HDBSCAN",
    runs: clustering.runs.filter(r => r.algorithm === "hdbscan"),
    labels: clustering.labels,
    eigendentadura: clustering.eigendentadura,
    dentitions: clustering.dentitions,
    pcaMeta: clustering.pca,
    meta: clustering.meta,
    width: Math.min(width, 960),
    pantosMap: pantosMapCl,
  }));
}
```

<div style="border-left: 4px solid #f58518; background: #fff9f0; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — <strong>No se detectaron clusters naturales</strong> en el espacio geométrico dental: los cinco algoritmos evaluados (KMeans, Ward, GMM, Spectral, HDBSCAN) arrojan silhouette scores &lt; 0.25, por debajo del umbral convencional para clustering significativo. La variabilidad dental en esta población es un <strong>continuo</strong>, no un conjunto de fenotipos discretos.
</div>
