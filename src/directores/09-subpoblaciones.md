---
title: 9 · Subpoblaciones y clustering
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("09"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./08-analisis-por-pieza" style="color:#888;">← Cap. 8</a></span>
  <span><a href="./10-herramienta" style="color:#888;">Cap. 10 — Herramienta →</a></span>
</div>

# 9 · Subpoblaciones, clustering y patologías

> **Pregunta P3.** ¿Existen subgrupos discretos en la población dental?
> **No.** Múltiples líneas de evidencia convergen — resultado negativo
> robusto.
>
> **Pregunta P4.** ¿Asociación geometría × patología?
> **Global: no. Local: sí** (exp22, ver [cap. 8](./08-analisis-por-pieza#8-7-asociacion-local-fdi-patologia-exp22)).

## 9.1 Clustering sobre Z-scores (n = 853, 96 dims)

```js
const cluster = [
  {alg: "K-Means",      params: "k = 2–10",                best_silhouette: 0.08},
  {alg: "HDBSCAN",      params: "min_cluster_size = 10–50", best_silhouette: 0.06},
  {alg: "GMM",          params: "n_components = 2–10",      best_silhouette: 0.07},
  {alg: "Agglomerative",params: "k = 2–10",                 best_silhouette: 0.09},
  {alg: "Spectral",     params: "k = 2–10",                 best_silhouette: 0.08},
];
display(Plot.plot({
  width: Math.min(width, 580), height: 200, marginLeft: 130,
  x: {label: "Silhouette (max)", domain: [0, 0.4], grid: true},
  y: {label: null, domain: cluster.map(c=>c.alg)},
  marks: [
    Plot.ruleX([0.15], {stroke: "#888", strokeDasharray: "3 3"}),
    Plot.text([{x:0.15, y: cluster[0].alg, t: "umbral 0.15"}], {x:"x", y:"y", text:"t", dy:-90, dx:4, fontSize:10, fill:"#888"}),
    Plot.barX(cluster, {x: "best_silhouette", y: "alg", fill: "#e45756", tip: true}),
    Plot.text(cluster, {x: "best_silhouette", y: "alg", text: d=>d.best_silhouette.toFixed(2), dx: 4, textAnchor: "start", fontSize: 11}),
  ],
}));
```

**Silhouette consistentemente bajo (≤ 0.09)** para todos los algoritmos y
configuraciones. La variación geométrica dental es **continua**, sin
subgrupos discretos.

> ⚠️ Precaución: UMAP/t-SNE **pueden sugerir clusters que no existen**
> (silhouette ~0.06 sobre las coordenadas UMAP de los "mejores" clusters
> aparentes). La separación visual es un artefacto del algoritmo de
> reducción, no evidencia.

## 9.2 Validación cruzada del resultado negativo

| Evidencia | Resultado |
|---|---|
| Clustering sobre Z-scores (96D) | silhouette < 0.15 |
| Clustering sobre coordenadas Procrustes | silhouette < 0.15 |
| Estratificación por patrón de presencias FDI (k = 4) (exp05 Uso E.B) | No reorganiza $p(\mathbf{x}\|FDI)$ |
| Clustering sobre curva del maxilar (exp30) | (prelim — sin clusters) |

**Convergencia robusta**: no es un negativo de un único método. Es
"resultado negativo" en el sentido **fuerte** y replicable.

## 9.3 Apinamiento vs. arcadas con dientes adicionales (exp28)

Refinamiento del análisis: F21 (eigen-feature 21) sobre $U_\text{canon}$
($n = 831$) captura "arcadas con dientes adicionales"; sobre
$U_\text{canon\_clean}$ ($n = 688$) aísla **apinamiento adulto puro como
outliers** ($\approx 4\%$). Las dos vistas son **complementarias** y
clínicamente informativas.

> 📓 `docs/experimentos/28_apinamiento_vs_dentadura/99_cierre.md`

## 9.4 Subpoblaciones predefinidas

### Por sexo inferido (OCR + gender-guesser)

| Aspecto | Resultado |
|---|---|
| Cobertura | ~40% (nombres identificables) |
| Sesgo de selección | Probable |
| MANOVA global | No significativo |

**Diferencias débiles y no confiables** por tamaño efectivo bajo y sesgo
de selección. No se citan en conclusiones principales.

### Por origen de datos (`data_origin`)

- MANOVA significativo.
- Subgrupo italiano más atípico en T².
- Diferencias más pronunciadas en PCA que en features individuales →
  efecto global posiblemente confundido con **equipo de rayos** o
  cohorte demográfica.

**Limitación**: `data_origin` mezcla factores biológicos (población),
técnicos (equipo) y operacionales (criterios de anotación). No
desentrelazable sin metadata adicional.

## 9.5 Dentición mixta (exp10)

273 pantos (5,3 %) con $\geq 1$ diente deciduo + 513 (10,0 %) con
`dentition_type='unknown'`. Imputación KNN + proyección en eigendentadura
limpia ($n = 726$):

- Mahalanobis mediana: **2.36** (mixta) vs **2.06** (limpia).
- Solo **15,4 %** supera el percentil 95 de la distribución limpia.

→ La dentición mixta **no es categórica respecto de la geometría adulta**:
se solapa significativamente.

## 9.6 Resumen de P4 (asociación geometría × patología)

- **Global (paciente entero)**: sin asociación robusta tras BH (excepto
  `neoformation`, efecto pequeño — exp24).
- **Local (FDI × patología)**: **sí** — 131/250 tests significativos
  (exp22, ver [cap. 8 §8.7](./08-analisis-por-pieza#8-7-asociacion-local-fdi-patologia-exp22)).

> 📓 Notebooks 033–039 · exp10, exp13, exp15, exp22, exp23, exp28

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./08-analisis-por-pieza" style="color:#888;">← Cap. 8</a>
  <a href="./10-herramienta" style="color:#4c78a8; font-weight:600;">Cap. 10 — Herramienta →</a>
</div>
