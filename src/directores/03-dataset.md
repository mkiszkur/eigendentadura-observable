---
title: 3 · Dataset
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("03"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./02-marco-teorico" style="color:#888;">← Cap. 2</a></span>
  <span><a href="./04-metodologia" style="color:#888;">Cap. 4 — Metodología →</a></span>
</div>

# 3 · Dataset

```js
import {funnelChart, teethDistChart} from "../components/funnel-chart.js";
import {zoomableChart} from "../components/zoomable-chart.js";
import {paginatedTable} from "../components/paginated-table.js";
import {openPantoModal} from "../components/panto-modal.js";
import {kpi} from "../components/kpi.js";
import * as d3 from "d3";
const ds = await FileAttachment("../data/dataset_stats.json").json();
const cap03 = await FileAttachment("../data/cap03_figures.json").json();
const pantosRaw = await FileAttachment("../data/pantos_browser.json").json();
const toothStatsLM = await FileAttachment("../data/tooth_stats_lm.json").json();
```

## 3.1 Origen y volumen

```js
display(kpi([
  {label: "Archivos JSON", value: "5.114", sub: "1 panto = 1 JSON LabelMe", color: "#4c78a8"},
  {label: "Shapes totales", value: "475.985", sub: "anotaciones individuales", color: "#4e8c9e"},
  {label: "Dientes anotados", value: "146.596", sub: "polígonos con FDI", color: "#54a24b"},
  {label: "Promedio shapes/panto", value: "≈93", sub: "dientes + landmarks + auxiliares", color: "#7b52ab"},
  {label: "Centros clínicos", value: "2", sub: "Centro A · Centro B", color: "#f58518"},
]));
```

Cada archivo JSON es la salida de LabelMe. Contiene:

- **Metadatos de imagen**: dimensiones, ruta, base64 (no se redistribuye).
- **14 flags a nivel archivo**: dentición, patologías macro, `landmarks_complete`.
- **Array de shapes**: cada anotación individual (polígono, centroide, minBBox, landmark).

> 📓 Notebook 001 / `pipeline/stage_01_etl_raw.py`

### 3.1.1 Volumen por panto

Dos distribuciones describen la **densidad de anotación** de cada
pantomografía: el total de *shapes* (cualquier polígono, centroide,
landmark o auxiliar) y el subconjunto de **polígonos dentarios**
(`is_tooth_shape == True`). Ambas se calculan sobre los 5.113 pantos
con al menos una anotación (el panto restante del catálogo, n=5.114,
tiene `shapes` vacío y se documenta en §3.2.2 C5).

<div id="fig-cap03-anotaciones-por-imagen">

```js
{
  const s = ds.shapes_per_panto;
  const st = s.stats;
  // Expansión hist → raw values (5.113 enteros) para que Plot.boxX
  // calcule whiskers/outliers de manera estándar (Tukey 1.5·IQR).
  const raw = s.hist.flatMap(d => Array(d.count).fill(d.v));
  display(Plot.plot({
    width: 720, height: 170,
    marginTop: 18, marginBottom: 42, marginLeft: 22, marginRight: 22,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Anotaciones (shapes) por panto", grid: true, nice: true},
    y: {axis: null},
    marks: [
      Plot.boxX(raw, {x: d => d,
        stroke: "#3b3b3b", strokeWidth: 1.1,
        fill: "#7a8ea8", fillOpacity: 0.45,
        r: 1.6}),
      Plot.text([{x: st.median,
        t: `mediana ${st.median} · IQR ${st.q3 - st.q1} (Q1 ${st.q1}, Q3 ${st.q3}) · n = ${st.n.toLocaleString("es-AR")}`}],
        {x: "x", text: "t", frameAnchor: "top", dy: 4,
         fontSize: 11, fill: "#3b3b3b", textAnchor: "middle"}),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  Boxplot del total de anotaciones por panto sobre los 5.113 pantos con
  shapes. Caja = IQR (Q1–Q3); línea = mediana; bigotes = Tukey
  1,5·IQR; puntos = outliers.
</div>

<div id="fig-cap03-dientes-por-imagen">

```js
{
  const s = ds.teeth_per_panto;
  const st = s.stats;
  const raw = s.hist.flatMap(d => Array(d.count).fill(d.v));
  display(Plot.plot({
    width: 720, height: 170,
    marginTop: 18, marginBottom: 42, marginLeft: 22, marginRight: 22,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Polígonos dentarios por panto (cota anatómica: 32 piezas)",
        grid: true, domain: [0, Math.max(34, st.max)], nice: true},
    y: {axis: null},
    marks: [
      Plot.ruleX([32], {stroke: "#888", strokeDasharray: "4,4", strokeWidth: 1}),
      Plot.boxX(raw, {x: d => d,
        stroke: "#2d6a4f", strokeWidth: 1.1,
        fill: "#54a24b", fillOpacity: 0.45,
        r: 1.6}),
      Plot.text([{x: st.median,
        t: `mediana ${st.median} · IQR ${st.q3 - st.q1} (Q1 ${st.q1}, Q3 ${st.q3}) · n = ${st.n.toLocaleString("es-AR")}`}],
        {x: "x", text: "t", frameAnchor: "top", dy: 4,
         fontSize: 11, fill: "#3b3b3b", textAnchor: "middle"}),
      Plot.text([{x: 32, t: "32 piezas (cota)"}],
        {x: "x", text: "t", frameAnchor: "bottom", dy: -6,
         fontSize: 10, fill: "#666", textAnchor: "end"}),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  Boxplot del número de polígonos dentarios anotados por panto. Caja =
  IQR; línea = mediana; bigotes = Tukey 1,5·IQR; puntos = outliers (la
  cola izquierda corresponde a denticiones incompletas o mixtas). La
  línea gris punteada a 32 marca la dentición permanente completa.
</div>
  La línea gris a 32 marca el objetivo anatómico (dentición permanente
  completa). La cola izquierda corresponde a denticiones incompletas
  o mixtas.
</div>

## 3.2 Las 7 versiones del esquema JSON

El dataset combina 7 versiones de LabelMe con diferencias **no solo de
mecanismo** (relación shape ↔ grupo) sino también de **schema clínico**:
ciertos flags y los landmarks anatómicos no existían en versiones tempranas.

<div id="fig-cap03-versiones-json">

```js
const versiones = [
  {ver: "4.5.13",   n: 2296, pct: 44.9, landmarks: false, restoration: false, atheroma: false, mecanismo: "Solo coordenadas"},
  {ver: "5.5.0",    n: 1643, pct: 32.1, landmarks: true,  restoration: true,  atheroma: true,  mecanismo: "Mixto"},
  {ver: "5.3.1",    n: 858,  pct: 16.8, landmarks: true,  restoration: true,  atheroma: true,  mecanismo: "Mixto"},
  {ver: "5.1.1",    n: 188,  pct:  3.7, landmarks: true,  restoration: false, atheroma: false, mecanismo: "group_id"},
  {ver: "5.0.1",    n:  87,  pct:  1.7, landmarks: true,  restoration: false, atheroma: false, mecanismo: "group_id"},
  {ver: "5.4.0a0",  n:  33,  pct:  0.6, landmarks: true,  restoration: true,  atheroma: true,  mecanismo: "Mixto"},
  {ver: "4.6.0",    n:   9,  pct:  0.2, landmarks: false, restoration: false, atheroma: false, mecanismo: "group_id pero ignorado"},
];
display(Plot.plot({
  width: Math.min(width, 720),
  height: 220,
  marginLeft: 70,
  x: {label: "Pantos", grid: true},
  y: {label: null, domain: versiones.map(v=>v.ver)},
  color: {legend: true, domain: ["Solo coordenadas", "Mixto", "group_id", "group_id pero ignorado"],
          range: ["#e45756", "#4c78a8", "#54a24b", "#bbb"]},
  marks: [
    Plot.barX(versiones, {x: "n", y: "ver", fill: "mecanismo", tip: true, sort: {y: "x", reverse: true}}),
    Plot.text(versiones, {x: "n", y: "ver", text: d => `${d.n} (${d.pct}%)`, dx: 6, textAnchor: "start", fontSize: 11}),
    Plot.ruleX([0]),
  ],
}));
```

</div>

```js
display(html`<table class="data-table" style="max-width:760px;">
  <thead><tr>
    <th>Versión</th>
    <th style="text-align:right;">n</th>
    <th style="text-align:center;">Landmarks</th>
    <th style="text-align:center;">flag <code>dental_restoration</code></th>
    <th style="text-align:center;">flag <code>atheroma</code></th>
  </tr></thead>
  <tbody>${versiones.map(v => html`<tr>
    <td style="font-family:monospace;">${v.ver}</td>
    <td style="text-align:right;">${v.n.toLocaleString("es-AR")}</td>
    <td style="text-align:center; color:${v.landmarks?"var(--color-positive)":"var(--color-danger)"};">${v.landmarks?"✓":"✗"}</td>
    <td style="text-align:center; color:${v.restoration?"var(--color-positive)":"var(--color-danger)"};">${v.restoration?"✓":"✗"}</td>
    <td style="text-align:center; color:${v.atheroma?"var(--color-positive)":"var(--color-danger)"};">${v.atheroma?"✓":"✗"}</td>
  </tr>`)}</tbody>
</table>`);
```

> ⚠️ **Implicación metodológica** (exp20). Las prevalencias absolutas de
> `dental_restoration`, `atheroma` y `neoformation` están
> **estructuralmente infraestimadas** si se calculan sobre el universo
> total. Deben condicionarse al subconjunto donde el flag existía:
> versiones ≥ 5.3.1 para restauración/atheroma, ≥ 5.5.0 para el catálogo
> completo. La cobertura por FDI, en cambio, es **uniforme** entre
> versiones ($\chi^2 = 128{,}5$, dof = 124, $p = 0{,}37$).

### 3.2.1 Cobertura de landmarks por versión

El sesgo estructural se ve con mayor claridad al desagregar la
cobertura de los siete landmarks anatómicos por versión cronológica:
la 4.5.13 (44,9 % del corpus) no incluye ningún landmark, mientras
que todas las versiones ≥ 4.6.0 los incorporan con cobertura ≥ 97 %
uniforme entre L1 y L7.

<div id="fig-cap03-sesgo-version-landmarks">

```js
{
  const vl = ds.version_landmark;
  display(Plot.plot({
    width: 720, height: 260,
    marginTop: 28, marginBottom: 44, marginLeft: 64, marginRight: 60,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Landmark anatómico", domain: vl.landmarks, padding: 0.04},
    y: {label: "Versión JSON (cronológico)", domain: vl.versions, padding: 0.04},
    color: {type: "linear", domain: [0, 100], range: ["#fffce0", "#1b6b3c"],
            label: "Pantos con landmark (%)"},
    marks: [
      Plot.cell(vl.cells, {x: "landmark", y: "version", fill: "pct",
        stroke: "white", strokeWidth: 1, tip: true,
        channels: {"%": {value: d => `${d.pct.toFixed(0)}%`}}}),
      Plot.text(vl.cells, {x: "landmark", y: "version",
        text: d => d.pct.toFixed(0).replace(".", ","),
        fill: d => d.pct > 55 ? "white" : "#2b2b2b",
        fontSize: 11, fontWeight: 500}),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  Heatmap versión × landmark. Cada celda = porcentaje de pantos de esa
  versión con el landmark anotado (escala 0 % beige → 100 % verde
  oscuro). Test χ² entre v4.5.13 y el resto: χ² = 4.843 (rechaza
  homogeneidad a α = 0,05).
</div>

<details>
<summary>▸ Detalle metodológico — Test χ² landmarks por versión</summary>

Para landmarks anatómicos el test es contundente:
$\chi^2 = 4843$ entre v4.5.13 y el resto (0/2.296 vs ~54%/2.819).
La versión 4.5.13 simplemente **no soportaba** landmarks; los pantos
sin landmarks no son missing-at-random sino missing-by-design.

Cierre en `docs/experimentos/20_sesgo_version_labelme/01_cierre.md`.

</details>

### 3.2.2 Sesgo de versión — flags clínicos

Tres flags a nivel archivo aparecieron recién con el esquema 5.3.1
(restauración dental, ateroma, neoformación). Su prevalencia es 0 %
en las versiones anteriores por ausencia de campo, no por ausencia de
hallazgo.

<div id="fig-cap03-sesgo-version-b-flags">

```js
{
  const cells = cap03.sesgo_b_flags;
  const versions = [...new Set(cells.map(c => c.version))];
  const flags = [...new Set(cells.map(c => c.flag))];
  const palette = {"Restauración dental": "#1f6f8b", "Ateroma": "#c0392b", "Neoformación": "#2e8b57"};
  display(Plot.plot({
    width: 760, height: 320,
    marginLeft: 56, marginBottom: 64, marginTop: 28, marginRight: 18,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    fx: {label: "Versión JSON (cronológico)", domain: versions},
    x: {label: null, axis: null, domain: flags},
    y: {label: "Pantos con flag (%)", grid: true,
        domain: [0, Math.max(...cells.map(c => c.pct)) * 1.18]},
    color: {domain: flags, range: flags.map(f => palette[f]),
            legend: true, label: "Flag"},
    marks: [
      Plot.barY(cells, {fx: "version", x: "flag", y: "pct", fill: "flag", tip: true,
        channels: {"%": {value: d => `${d.pct.toFixed(2).replace('.', ',')} %`},
                   "n": {value: d => `${d.n_true}/${d.n_total}`}}}),
      Plot.text(cells.filter(c => c.pct > 0), {fx: "version", x: "flag", y: "pct",
        text: d => `${d.pct.toFixed(0)}`, dy: -4, fontSize: 9, fill: "#444"}),
      Plot.ruleY([0]),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  Barras agrupadas por versión (panel) y flag (color). Las versiones
  ≤ 5.1.1 no soportaban estos campos: la ausencia de barra refleja
  "sin campo", no "sin hallazgo".
</div>

### 3.2.3 Sesgo de versión — distribución FDI

La distribución de dientes anotados por panto varía sensiblemente entre
versiones: las primeras versiones tienden a menor cobertura FDI mientras
que las posteriores agrupan medianas próximas a la dentición completa
(32 piezas).

<div id="fig-cap03-sesgo-version-c-fdi">

```js
{
  const groups = cap03.sesgo_c_fdi;
  const rows = [];
  for (const g of groups) {
    for (const v of g.values) rows.push({version: g.version, total_teeth: v});
  }
  display(Plot.plot({
    width: 720, height: 300,
    marginLeft: 56, marginBottom: 50, marginTop: 18, marginRight: 18,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Versión JSON (cronológico)", domain: groups.map(g => g.version)},
    y: {label: "Dientes anotados por panto (total_teeth)", grid: true},
    marks: [
      Plot.boxY(rows, {x: "version", y: "total_teeth",
        fill: "#7a8ea8", stroke: "#2d3e50",
        strokeWidth: 1.1}),
      Plot.ruleY([0]),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  Boxplot de la cantidad de dientes anotados por panto, desagregado por
  versión cronológica del esquema JSON. Caja = Q1–Q3, línea = mediana,
  bigotes = 1,5 · IQR, puntos = outliers.
</div>

---

## 3.3 Sistema multi-shape

Cada diente tiene **3 shapes** relacionadas:

```js
display(html`<div class="simple-card-grid">
  <div class="simple-card">
    <div style="font-weight:600; color:var(--color-primary);">Polígono</div>
    <div style="font-size:0.85rem; color:var(--color-text-soft); margin-top:4px;">14–24 puntos del contorno del diente. <strong>Lleva los flags clínicos</strong>.</div>
  </div>
  <div class="simple-card">
    <div style="font-weight:600; color:var(--color-positive);">Centroide</div>
    <div style="font-size:0.85rem; color:var(--color-text-soft); margin-top:4px;">Punto único marcando el centro geométrico del diente.</div>
  </div>
  <div class="simple-card">
    <div style="font-weight:600; color:var(--color-warning);">MinBBox</div>
    <div style="font-size:0.85rem; color:var(--color-text-soft); margin-top:4px;">Bounding box mínimo rotado (4 vértices). De aquí sale el ángulo del diente.</div>
  </div>
</div>`);
```

**Hallazgo clave.** El mecanismo real de relación es por **coincidencia de
coordenadas del centroide**, no por `group_id`. Esto vale para todas las
versiones, incluso las que tienen `group_id`. La librería `lib/panto/`
implementa esta lógica.

### 3.3.1 Composición de shapes por tipo de entidad

La mayor parte del volumen anotado son shapes "diente" (polígono +
centroide + minbbox por pieza). El resto se reparte entre landmarks
anatómicos, hallazgos metálicos (restauraciones, implantes,
aparatología) y ateromas.

<div id="fig-cap03-treemap-shapes">

```js
{
  const rows = cap03.treemap_shapes
    .filter(r => r.entity_type && r.entity_sub_type)
    .map(r => ({...r, label: `${r.entity_type} / ${r.entity_sub_type}`}))
    .sort((a, b) => d3.descending(a.count, b.count));
  const types = [...new Set(rows.map(r => r.entity_type))];
  const palette = {tooth: "#7a8ea8", landmark: "#7b68a6", metal: "#c25450", atheroma: "#d49a4d"};
  display(Plot.plot({
    width: 760, height: 420,
    marginLeft: 150, marginRight: 90, marginTop: 16, marginBottom: 44,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Cantidad de shapes (escala log)", type: "log", grid: true,
        domain: [1, 300000]},
    y: {label: null, domain: rows.map(r => r.label)},
    color: {domain: types, range: types.map(t => palette[t] ?? "#999"),
            legend: true, label: "Entity type"},
    marks: [
      Plot.barX(rows, {x1: 1, x2: "count", y: "label", fill: "entity_type",
        tip: true,
        channels: {"shapes": {value: d => d.count.toLocaleString("es-AR")}}}),
      Plot.text(rows, {x: "count", y: "label",
        text: d => d.count.toLocaleString("es-AR"),
        dx: 6, textAnchor: "start", fontSize: 10, fill: "#444"}),
      Plot.ruleX([1]),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  Composición del universo de shapes (n = 475.985) desagregado por
  `entity_type` (color) y `entity_sub_type` (fila).
  Escala logarítmica en X para acomodar el rango (de 2 a ~146.000).
</div>

---

## 3.4 Landmarks anatómicos

7 landmarks por panto (cuando están anotados):

| Landmark | Estructura | Uso en pipeline |
|---|---|---|
| **L1 / L6** | Cóndilo izquierdo (par) | Origen + escala + rotación del marco condíleo |
| **L2 / L7** | Cóndilo derecho (par) | idem |
| **L3 / L4** | Mentón (par) | Reservados (futuro: transformación afín) |
| **L5** | Mid-mentón | Calculado, no anotado |

<div id="fig-cap03-cobertura-landmarks">

```js
const cobertura = [
  {grupo: "Universo total",                       n: 5114, pct: 100.0, color: "#4c78a8"},
  {grupo: "Con landmarks condíleos completos",    n: 2749, pct: 53.8,  color: "#7b52ab"},
  {grupo: "Universo geométrico (FDI ∧ landmarks)", n: 2704, pct: 52.9,  color: "#08306b"},
  {grupo: "Dentición completa (32 FDI ∧ landmarks)", n: 831, pct: 16.3, color: "#3b1d6e"},
];
display(Plot.plot({
  width: Math.min(width, 680), height: 180, marginLeft: 240,
  x: {label: "Pantos", grid: true, domain: [0, 5114]},
  y: {label: null, domain: cobertura.map(c=>c.grupo)},
  marks: [
    Plot.barX(cobertura, {x: "n", y: "grupo", fill: "color", tip: true}),
    Plot.text(cobertura, {x: "n", y: "grupo", text: d=>`${d.n.toLocaleString("es-AR")} (${d.pct.toFixed(1)}%)`, dx: 6, textAnchor: "start", fontSize: 11}),
    Plot.ruleX([0]),
  ],
}));
```

</div>

---

## 3.5 Embudo de cohortes

El gráfico siguiente reusa la figura del observable público:

<div id="fig-cap03-universo-geometrico">

```js
display(funnelChart(ds.funnel, {width: Math.min(width, 720)}));
```

</div>

Decisión: la diferencia entre los 2.749 con landmarks y los 2.704 del
universo geométrico son **45 pantos con landmarks pero sin FDI permanente
anotado**. Quedan fuera por no tener identificación dental, no por
problema geométrico.

---

## 3.6 Errores de datos detectados

```js
const erroresC = [
  {cod: "C1", titulo: "json_group_id = \"null\" (string)", impacto: "Falla agrupación", resol: "Parseo a None en stage_00", estado: "✓ Resuelto"},
  {cod: "C2", titulo: "Centroides de landmarks en (0,0)", impacto: "Distorsionan estadísticas", resol: "Extraer coords desde json_points", estado: "✓ Resuelto"},
  {cod: "C3", titulo: "Signo invertido en minbbox_angle", impacto: "Distribución bimodal espuria", resol: "angle_normalized (3 pasadas)", estado: "✓ Resuelto"},
  {cod: "C4", titulo: "Shapes duplicados exactos", impacto: "Doble conteo", resol: "Detectar y marcar", estado: "✓ Resuelto"},
  {cod: "C5", titulo: "Archivos con shapes vacío", impacto: "Falla agregación", resol: "Excluir de shapes.csv", estado: "✓ Resuelto"},
  {cod: "C6", titulo: "json_group_id faltante (v4.5.13)", impacto: "Sin mecanismo de relación", resol: "Relación por coordenadas", estado: "✓ Resuelto"},
  {cod: "C7", titulo: "MinBBox degenerado", impacto: "Ángulo NaN", resol: "Recalcular desde polígono", estado: "✓ Resuelto"},
  {cod: "C8", titulo: "Labels L6↔L7 / L1↔L2 intercambiados", impacto: "Marco condíleo invertido", resol: "Swap detectado por posición espacial", estado: "✓ Resuelto"},
  {cod: "C9", titulo: "Landmarks duplicados", impacto: "Marco indeterminado", resol: "Selección por posición en lib/panto/", estado: "✓ Resuelto"},
];
const erroresA = [
  {cod: "A1", titulo: "16 pantos completas sin landmarks", impacto: "Universo geométrico − 16",  resol: "Manual o detector NN exp04", estado: "🟡 Pendiente"},
  {cod: "A2", titulo: "7 inconsistencias flag landmarks_complete", impacto: "Confiabilidad de flags", resol: "lm_norm_complete calculado", estado: "✓ Workaround"},
  {cod: "A3", titulo: "62 pantos sin clasificación de dentición", impacto: "Filtro A–E impreciso", resol: "Inferir de FDI", estado: "🟡 Pendiente"},
  {cod: "A5", titulo: "Flag permanent_complete no confiable", impacto: "Selección automática", resol: "fdi_32_complete calculado", estado: "✓ Workaround"},
  {cod: "A6", titulo: "~162 pantos con arco FDI invertido", impacto: "Geometría sistemáticamente errónea", resol: "Detector exp22; corrección manual de 129", estado: "🟡 Pendiente"},
];
display(html`<h3 style="margin-top:1.5rem;">Resueltos en el pipeline (C1–C9)</h3>
<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Código</th>
    <th style="text-align:left; padding:6px 10px;">Problema</th>
    <th style="text-align:left; padding:6px 10px;">Resolución</th>
    <th style="text-align:left; padding:6px 10px;">Estado</th>
  </tr></thead>
  <tbody>${erroresC.map(e => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace; color:#4c78a8; font-weight:600;">${e.cod}</td>
    <td style="padding:5px 10px;">${e.titulo}</td>
    <td style="padding:5px 10px; color:#555;">${e.resol}</td>
    <td style="padding:5px 10px; color:#54a24b;">${e.estado}</td>
  </tr>`)}</tbody>
</table>

<h3 style="margin-top:1.5rem;">Pendientes de corrección manual (A1–A6)</h3>
<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Código</th>
    <th style="text-align:left; padding:6px 10px;">Problema</th>
    <th style="text-align:left; padding:6px 10px;">Workaround actual</th>
    <th style="text-align:left; padding:6px 10px;">Estado</th>
  </tr></thead>
  <tbody>${erroresA.map(e => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace; color:#e45756; font-weight:600;">${e.cod}</td>
    <td style="padding:5px 10px;">${e.titulo}</td>
    <td style="padding:5px 10px; color:#555;">${e.resol}</td>
    <td style="padding:5px 10px; color:${e.estado.startsWith("✓")?"#54a24b":"#f58518"};">${e.estado}</td>
  </tr>`)}</tbody>
</table>`);
```

**Principio operativo.** Los JSONs en disco son **inmutables**. Las
correcciones C8 y C9 se aplican **en memoria al leer**
(`lib/json_corrections.py`). Cualquier consumidor de GT debe importar
estos helpers antes de usar los shapes. Excepciones (correcciones
manuales) se documentan en `docs/general/dataset/errores_datos.md`.

> 📓 Notebooks 000, 003, 091 · `lib/json_corrections.py`

---

## 3.7 Sistema de calidad A–E (construcción propia)

**Motivación.** El dataset no traía una etiqueta de calidad lista para
filtrar. Para los análisis morfométricos necesitábamos un criterio
**objetivo, reproducible y trazable** que permitiera (i) excluir
denticiones no permanentes (mixta / temporal), (ii) separar pantos con
identificación FDI completa de las parciales, y (iii) priorizar dentro
de la cohorte permanente las pantos sin patología — *gold standard*
para estimar la dentadura media.

La **categoría** (A–E) y el **score** (0–100) son una **construcción
del pipeline** (`lib.panto.Panto.calidad_categoria` /
`.calidad_score`). No vienen del JSON crudo; se derivan de los flags
de dentición, del porcentaje de FDI anotado, de `landmarks_complete`
y del conteo de flags de patología.

<div id="fig-cap03-calidad-categorias">

```js
const cal = [
  {cat: "A", desc: "Ideal — FDI 100% sin patología",       n: 86,   pct: 1.7,  color: "#54a24b", score: "80–100"},
  {cat: "B", desc: "Muy buena — FDI 100% con patología",   n: 2415, pct: 47.2, color: "#72b7b2", score: "50–90"},
  {cat: "C", desc: "Aceptable — FDI 85–99 %",              n: 6,    pct: 0.1,  color: "#f58518", score: "50–95"},
  {cat: "D", desc: "Limitada — FDI <85 % (en práctica =0%)", n: 1882, pct: 36.8, color: "#e45756", score: "0–66"},
  {cat: "E", desc: "Excluir — dentición mixta o temporal",  n: 725,  pct: 14.2, color: "#888",    score: "5–15"},
];
display(Plot.plot({
  width: Math.min(width, 700), height: 220, marginLeft: 30,
  x: {label: null, domain: cal.map(c=>c.cat)},
  y: {label: "Pantos", grid: true},
  color: {domain: cal.map(c=>c.cat), range: cal.map(c=>c.color)},
  marks: [
    Plot.barY(cal, {x: "cat", y: "n", fill: "cat", tip: true}),
    Plot.text(cal, {x: "cat", y: "n", text: d=>`${d.n}\n${d.pct}%`, dy: -10, fontSize: 11, lineHeight: 1.2}),
    Plot.ruleY([0]),
  ],
}));
```

</div>

```js
display(html`<table style="width:100%; max-width:780px; border-collapse:collapse; font-size:0.85rem; margin-top:0.4rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:center; padding:6px 10px;">Cat.</th>
    <th style="text-align:left; padding:6px 10px;">Criterio</th>
    <th style="text-align:center; padding:6px 10px;">Score</th>
    <th style="text-align:right; padding:6px 10px;">n</th>
    <th style="text-align:right; padding:6px 10px;">%</th>
  </tr></thead>
  <tbody>${cal.map(c => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; text-align:center; font-weight:700; color:${c.color};">${c.cat}</td>
    <td style="padding:5px 10px;">${c.desc}</td>
    <td style="padding:5px 10px; text-align:center; color:#555; font-family:monospace;">${c.score}</td>
    <td style="padding:5px 10px; text-align:right;">${c.n.toLocaleString("es-AR")}</td>
    <td style="padding:5px 10px; text-align:right;">${c.pct.toFixed(1)} %</td>
  </tr>`)}</tbody>
</table>`);
```

### Algoritmo de clasificación

La lógica es un árbol de decisión sobre las propiedades de la panto.
Sean $p_\text{FDI}$ el porcentaje de dientes con identificación FDI,
$n_\text{patol}$ el conteo de flags de patología y $\mathbb{1}_\text{LM}$
el indicador de landmarks completos:

$$
\text{categoria} = \begin{cases}
\text{E} & \text{si dentición mixta o temporal,} \\
\text{D} & \text{si } p_\text{FDI} < 85, \\
\text{C} & \text{si } 85 \le p_\text{FDI} < 100, \\
\text{A} & \text{si } p_\text{FDI} = 100 \text{ y } n_\text{patol} = 0, \\
\text{B} & \text{si } p_\text{FDI} = 100 \text{ y } n_\text{patol} > 0.
\end{cases}
$$

El **score** ajusta dentro de cada categoría: bonus por
`landmarks_complete`, por `permanent_complete`, por tener exactamente
32 dientes (categoría A) o por ausencia de patologías; penalización
en B por cantidad de flags ($-\min(n_\text{patol}/3, 10)$).

<details>
<summary>▸ Fórmula completa del score por categoría</summary>

| Categoría | Score base | Bonus | Tope |
|---|---|---|---|
| **E** | 5 (temp.) o 10 (mixta) | +5 si landmarks | 15 |
| **D** | $\lfloor 0{,}6 \cdot p_\text{FDI} \rfloor$ | +10 LM, +5 si $n_\text{patol}=0$ | 99 |
| **C** | $50 + 2(p_\text{FDI}-85)$ | +10 LM, +5 si $n_\text{patol}=0$ | 99 |
| **A** | 80 | +15 si `perm_complete` ∧ 32 dientes; +10 si solo `perm_complete`; +5 si LM | 100 |
| **B** | 70 | +10 `perm_complete`, +5 si $\ge 28$ dientes, +5 LM, $-\min(n_\text{patol}/3, 10)$ | $\ge 50$ |

Implementación: `lib/panto/_panto.py::_calcular_calidad()`.

</details>

**Hallazgo clave.** No existen identificaciones FDI parciales. Las
pantos tienen FDI completo (100 %) o nulo (0 %). El filtro queda
**binario** en la práctica: la categoría C es residual (6 pantos) y D
se colapsa con $p_\text{FDI}=0$.

> 📓 Notebook 003 · `lib/panto/_panto.py`

---

## 3.8 Explorador interactivo del dataset

La tabla siguiente permite **navegar las 5.113 pantos** del corpus
combinando filtros por categoría, dentición, completitud FDI y
landmarks. **Click en cualquier fila** abre el panel detallado del
panto (esquema dental + odontograma + metadatos).

Es el mismo modal que se usa en el [sitio público para odontólogos](../).
Aquí está restringido a fines metodológicos: validar visualmente
clasificaciones, encontrar casos atípicos, inspeccionar errores.

```js
// Enriquecer cada panto con métricas derivadas (no se recalcula nada,
// solo se aplanan campos del JSON crudo para que la tabla los pueda
// filtrar y ordenar).
const pantosTable = pantosRaw.pantos.map(p => {
  const flagsTotal = p.flags ? Object.values(p.flags).reduce((a,b)=>a+b, 0) : 0;
  const flagsLabels = p.flags ? Object.keys(p.flags).sort() : [];
  return {
    archivo: p.archivo,
    categoria: p.categoria ?? "–",
    score: p.score ?? null,
    denticion: p.denticion ?? "–",
    dientes: p.dientes ?? 0,
    con_fdi: p.con_fdi ?? 0,
    pct_fdi: p.dientes ? Math.round(100 * (p.con_fdi ?? 0) / p.dientes) : 0,
    fdi_completo: p.fdi_completo ? "Sí" : "No",
    lm_completo: p.lm_completo ? "Sí" : "No",
    n_super: p.n_super ?? 0,
    n_flags: flagsTotal,
    flags_str: flagsLabels.join(", ") || "—",
    _raw: p,
  };
});
const pantosMap = new Map(pantosRaw.pantos.map(p => [p.archivo, p]));
```

```js
// Estado de búsqueda y filtros rápidos.
const searchInput = view(Inputs.search(pantosTable, {
  placeholder: "Buscar por ID de archivo (ej. 00c0Dy...)",
  columns: ["archivo"],
  width: 360,
}));
```

```js
const presetSel = view(Inputs.radio(
  [
    "Todas",
    "Universo geométrico (FDI ∧ landmarks)",
    "Categoría A (gold standard)",
    "Categoría E (excluir)",
    "Sin landmarks",
    "Posibles supernumerarios (n_super > 0)",
    "FDI incompleto (< 100 %)",
  ],
  {label: "Filtro rápido", value: "Todas"},
));
```

```js
function applyPreset(rows, preset) {
  switch (preset) {
    case "Universo geométrico (FDI ∧ landmarks)":
      return rows.filter(r => r.fdi_completo === "Sí" && r.lm_completo === "Sí");
    case "Categoría A (gold standard)":
      return rows.filter(r => r.categoria === "A");
    case "Categoría E (excluir)":
      return rows.filter(r => r.categoria === "E");
    case "Sin landmarks":
      return rows.filter(r => r.lm_completo === "No");
    case "Posibles supernumerarios (n_super > 0)":
      return rows.filter(r => r.n_super > 0);
    case "FDI incompleto (< 100 %)":
      return rows.filter(r => r.fdi_completo === "No");
    default:
      return rows;
  }
}
const filteredRows = applyPreset(searchInput, presetSel);
```

```js
// Contador.
display(html`<div style="font-size:0.82rem; color:#555; margin:0.4rem 0 0.6rem;">
  Mostrando <strong>${filteredRows.length.toLocaleString("es-AR")}</strong>
  de <strong>${pantosTable.length.toLocaleString("es-AR")}</strong> pantos.
  ${filteredRows.length === pantosTable.length ? "" : html`<span style="color:#888;"> · filtro: ${presetSel}</span>`}
</div>`);
```

```js
// Estado para modal
const clickedPanto = Mutable(null);
function setClickedPanto(p) { clickedPanto.value = p; }
function clearClickedPanto() { clickedPanto.value = null; }
```

```js
// Disparar modal cuando hay panto clickeada
{
  const c = clickedPanto;
  if (c) {
    openPantoModal({
      id: c.archivo,
      pantoMeta: pantosMap.get(c.archivo) ?? null,
      toothStats: toothStatsLM,
      extraBadges: [
        {label: "score", value: c.score?.toFixed(1) ?? "–", color: "#4c78a8"},
        {label: "% FDI",  value: `${c.pct_fdi}`, color: "#54a24b"},
        ...(c.n_flags > 0 ? [{label: "flags", value: String(c.n_flags), color: "#f58518"}] : []),
      ],
      onClose: clearClickedPanto,
      invalidation,
    });
  }
}
```

```js
function catBadge(cat) {
  const col = ({A:"#54a24b", B:"#72b7b2", C:"#f58518", D:"#e45756", E:"#888"})[cat] ?? "#aaa";
  return html`<span style="display:inline-block;width:1.4em;height:1.4em;line-height:1.4em;text-align:center;background:${col}22;color:${col};border-radius:50%;font-weight:700;font-size:0.78rem;">${cat}</span>`;
}

display(paginatedTable({
  data: filteredRows,
  pageSize: 12,
  filterable: true,
  onRowClick: row => setClickedPanto(row),
  columns: [
    {key: "archivo",      header: "ID archivo",   type: "string",   sortable: true,
     format: v => html`<span style="font-family:monospace;font-size:0.78rem;color:#4c78a8;">${v}</span>`},
    {key: "categoria",    header: "Cat.",          type: "category", sortable: true,
     format: v => catBadge(v)},
    {key: "score",        header: "Score",         type: "number",   sortable: true,
     format: v => v != null ? v.toFixed(0) : "–"},
    {key: "denticion",    header: "Dentición",     type: "category", sortable: true},
    {key: "dientes",      header: "# dientes",     type: "number",   sortable: true},
    {key: "pct_fdi",      header: "% FDI",         type: "number",   sortable: true,
     format: v => `${v} %`},
    {key: "fdi_completo", header: "FDI 100 %",     type: "category", sortable: true},
    {key: "lm_completo",  header: "Landmarks",     type: "category", sortable: true},
    {key: "n_super",      header: "Super.",        type: "number",   sortable: true},
    {key: "n_flags",      header: "# flags",       type: "number",   sortable: true},
    {key: "flags_str",    header: "Patologías",    type: "string",   sortable: false,
     format: v => html`<span style="color:#666;font-size:0.78rem;">${v}</span>`},
  ],
}));
```

<div style="font-size:0.78rem; color:#888; margin-top:0.5rem;">
  Los filtros desplegables del encabezado de la tabla se combinan con el filtro
  rápido y la búsqueda. La columna “# flags” cuenta el total de patologías
  declaradas (suma sobre las 13 categorías de la sección 3.6).
</div>

> 📓 Dato fuente: `pantos_browser.json` (generado por `pipeline/stage_06_observable.py`).
> Modal: `lib`-independiente, define el contrato en `observable/src/components/panto-modal.js`.

---

## 3.9 Consideraciones éticas

- **Anonimización**: identificador primario es un hash interno
  (`panto_id`), no asociable a historia clínica sin acceso autorizado.
- **No exportación de imágenes**: las imágenes base64 embebidas en los
  JSON **no se redistribuyen**; la app renderiza geometría anotada, no
  pixeles originales.
- **Uso secundario**: anotaciones generadas con fines diagnósticos en el
  laboratorio. Uso en tesis es **secundario y exploratorio**, sin retorno
  de información identificable al paciente.
- **Scope**: la tesis es de analítica visual + morfometría. El detector
  NN (exp04) cumple función auxiliar de imputación geométrica, no de
  soporte a decisión clínica.

> ⚠️ TODO: incorporar referencia formal al protocolo de consentimiento
> y/o aprobación ética del laboratorio fuente.

---

## 3.10 Anexo — Prevalencia de flags clínicos

Resumen panorámico de los flags clínicos a dos niveles (archivo y
diente). Los tres flags marcados *(v≥5.3.1)* se reportan condicionados al
subconjunto de pantos cuyo esquema soporta el campo (ver §3.2.2).

### 3.10.1 Flags a nivel archivo

<div id="fig-cap03-flags-archivo">

```js
{
  const flags = cap03.file_flags;
  const order = flags.slice().sort((a, b) => a.family.localeCompare(b.family) || b.pct - a.pct);
  const familias = [...new Set(order.map(f => f.family))];
  display(Plot.plot({
    width: 720, height: Math.max(220, 24 * order.length + 40),
    marginLeft: 220, marginRight: 60, marginTop: 18, marginBottom: 44,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Pantos con flag = True (%)", grid: true,
        domain: [0, Math.max(...order.map(f => f.pct)) * 1.18]},
    y: {label: null, domain: order.map(f => f.conditional ? `${f.flag} (v≥5.3.1)` : f.flag)},
    color: {domain: familias, range: familias.map(f => order.find(x => x.family === f).color),
            legend: true, label: "Familia"},
    marks: [
      Plot.barX(order, {x: "pct", y: d => d.conditional ? `${d.flag} (v≥5.3.1)` : d.flag,
        fill: "family", tip: true,
        channels: {"pct": {value: d => `${d.pct.toFixed(2).replace('.', ',')} %`},
                   "n":   {value: d => `${d.n_true.toLocaleString("es-AR")} / ${d.n_denom.toLocaleString("es-AR")}`}}}),
      Plot.text(order, {x: "pct", y: d => d.conditional ? `${d.flag} (v≥5.3.1)` : d.flag,
        text: d => `${d.pct.toFixed(1).replace('.', ',')} %`,
        dx: 4, textAnchor: "start", fontSize: 10, fill: "#444"}),
      Plot.ruleX([0]),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  14 flags a nivel archivo (color = familia clínica). Denominador =
  5.114 pantos, salvo los tres condicionados a esquema ≥ 5.3.1
  (denominador = 2.819).
</div>

### 3.10.2 Flags a nivel diente

<div id="fig-cap03-flags-diente">

```js
{
  const flags = cap03.tooth_flags;
  const order = flags.slice().sort((a, b) => a.family.localeCompare(b.family) || b.pct - a.pct);
  const familias = [...new Set(order.map(f => f.family))];
  display(Plot.plot({
    width: 720, height: Math.max(280, 22 * order.length + 40),
    marginLeft: 220, marginRight: 60, marginTop: 18, marginBottom: 44,
    style: {fontFamily: "var(--sans-serif, system-ui, sans-serif)"},
    x: {label: "Shapes con flag = True (% sobre los que lo declaran)", grid: true,
        domain: [0, Math.max(...order.map(f => f.pct)) * 1.18]},
    y: {label: null, domain: order.map(f => f.flag)},
    color: {domain: familias, range: familias.map(f => order.find(x => x.family === f).color),
            legend: true, label: "Familia"},
    marks: [
      Plot.barX(order, {x: "pct", y: "flag", fill: "family", tip: true,
        channels: {"pct": {value: d => `${d.pct.toFixed(2).replace('.', ',')} %`},
                   "n":   {value: d => `${d.n_true.toLocaleString("es-AR")} / ${d.n_seen.toLocaleString("es-AR")}`}}}),
      Plot.text(order, {x: "pct", y: "flag",
        text: d => `${d.pct.toFixed(1).replace('.', ',')} %`,
        dx: 4, textAnchor: "start", fontSize: 10, fill: "#444"}),
      Plot.ruleX([0]),
    ],
  }));
}
```

</div>

<div style="font-size:0.82rem; color:#555; margin-top:0.2rem;">
  20 flags a nivel diente (color = familia clínica). Denominador = #
  shapes que declararon el flag (variable por versión, ver §3.2.2).
</div>

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./02-marco-teorico" style="color:#888;">← Cap. 2 — Marco teórico</a>
  <a href="./04-metodologia" style="color:#4c78a8; font-weight:600;">Cap. 4 — Metodología →</a>
</div>
