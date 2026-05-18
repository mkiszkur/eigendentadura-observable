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
import * as d3 from "d3";
const ds = await FileAttachment("../data/dataset_stats.json").json();
```

```js
function kpi(items) {
  return html`<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:1rem; margin:0.6rem 0 1.4rem;">
    ${items.map(it => html`<div style="background:${it.color}12; border-left:4px solid ${it.color}; padding:0.85rem 1.1rem; border-radius:6px;">
      <div style="font-size:0.65rem; color:#666; text-transform:uppercase; letter-spacing:.05em;">${it.label}</div>
      <div style="font-size:1.7rem; font-weight:700; color:${it.color}; line-height:1.1; margin-top:2px;">${it.value}</div>
      <div style="font-size:0.78rem; color:#666; margin-top:3px;">${it.sub ?? ""}</div>
    </div>`)}
  </div>`;
}
```

## 3.1 Origen y volumen

${kpi([
  {label: "Archivos JSON", value: "5.114", sub: "1 panto = 1 JSON LabelMe", color: "#4c78a8"},
  {label: "Shapes totales", value: "475.985", sub: "anotaciones individuales", color: "#4e8c9e"},
  {label: "Dientes anotados", value: "146.596", sub: "polígonos con FDI", color: "#54a24b"},
  {label: "Promedio shapes/panto", value: "≈93", sub: "dientes + landmarks + auxiliares", color: "#7b52ab"},
  {label: "Centros clínicos", value: "2", sub: "Centro A · Centro B", color: "#f58518"},
])}

Cada archivo JSON es la salida de LabelMe. Contiene:

- **Metadatos de imagen**: dimensiones, ruta, base64 (no se redistribuye).
- **14 flags a nivel archivo**: dentición, patologías macro, `landmarks_complete`.
- **Array de shapes**: cada anotación individual (polígono, centroide, minBBox, landmark).

> 📓 Notebook 001 / `pipeline/stage_01_etl_raw.py`

## 3.2 Las 7 versiones del esquema JSON

El dataset combina 7 versiones de LabelMe con diferencias **no solo de
mecanismo** (relación shape ↔ grupo) sino también de **schema clínico**:
ciertos flags y los landmarks anatómicos no existían en versiones tempranas.

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

```js
display(html`<table style="width:100%; max-width:760px; border-collapse:collapse; font-size:0.85rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Versión</th>
    <th style="text-align:right; padding:6px 10px;">n</th>
    <th style="text-align:center; padding:6px 10px;">Landmarks</th>
    <th style="text-align:center; padding:6px 10px;">flag <code>dental_restoration</code></th>
    <th style="text-align:center; padding:6px 10px;">flag <code>atheroma</code></th>
  </tr></thead>
  <tbody>${versiones.map(v => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace;">${v.ver}</td>
    <td style="padding:5px 10px; text-align:right;">${v.n.toLocaleString("es-AR")}</td>
    <td style="padding:5px 10px; text-align:center; color:${v.landmarks?"#54a24b":"#e45756"};">${v.landmarks?"✓":"✗"}</td>
    <td style="padding:5px 10px; text-align:center; color:${v.restoration?"#54a24b":"#e45756"};">${v.restoration?"✓":"✗"}</td>
    <td style="padding:5px 10px; text-align:center; color:${v.atheroma?"#54a24b":"#e45756"};">${v.atheroma?"✓":"✗"}</td>
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

<details>
<summary>▸ Detalle metodológico — Test χ² landmarks por versión</summary>

Para landmarks anatómicos el test es contundente:
$\chi^2 = 4843$ entre v4.5.13 y el resto (0/2.296 vs ~54%/2.819).
La versión 4.5.13 simplemente **no soportaba** landmarks; los pantos
sin landmarks no son missing-at-random sino missing-by-design.

Cierre en `docs/experimentos/20_sesgo_version_labelme/01_cierre.md`.

</details>

---

## 3.3 Sistema multi-shape

Cada diente tiene **3 shapes** relacionadas:

```js
display(html`<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:1rem; margin:1rem 0;">
  <div style="border:1px solid #ddd; padding:0.9rem; border-radius:6px;">
    <div style="font-weight:600; color:#4c78a8;">Polígono</div>
    <div style="font-size:0.85rem; color:#555; margin-top:4px;">14–24 puntos del contorno del diente. <strong>Lleva los flags clínicos</strong>.</div>
  </div>
  <div style="border:1px solid #ddd; padding:0.9rem; border-radius:6px;">
    <div style="font-weight:600; color:#54a24b;">Centroide</div>
    <div style="font-size:0.85rem; color:#555; margin-top:4px;">Punto único marcando el centro geométrico del diente.</div>
  </div>
  <div style="border:1px solid #ddd; padding:0.9rem; border-radius:6px;">
    <div style="font-weight:600; color:#f58518;">MinBBox</div>
    <div style="font-size:0.85rem; color:#555; margin-top:4px;">Bounding box mínimo rotado (4 vértices). De aquí sale el ángulo del diente.</div>
  </div>
</div>`);
```

**Hallazgo clave.** El mecanismo real de relación es por **coincidencia de
coordenadas del centroide**, no por `group_id`. Esto vale para todas las
versiones, incluso las que tienen `group_id`. La librería `lib/panto/`
implementa esta lógica.

---

## 3.4 Landmarks anatómicos

7 landmarks por panto (cuando están anotados):

| Landmark | Estructura | Uso en pipeline |
|---|---|---|
| **L1 / L6** | Cóndilo izquierdo (par) | Origen + escala + rotación del marco condíleo |
| **L2 / L7** | Cóndilo derecho (par) | idem |
| **L3 / L4** | Mentón (par) | Reservados (futuro: transformación afín) |
| **L5** | Mid-mentón | Calculado, no anotado |

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

---

## 3.5 Embudo de cohortes

El gráfico siguiente reusa la figura del observable público:

```js
display(funnelChart(ds.funnel, {width: Math.min(width, 720)}));
```

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
manuales) se documentan en `docs/dataset/errores_datos.md`.

> 📓 Notebooks 000, 003, 091 · `lib/json_corrections.py`

---

## 3.7 Clasificación de calidad A–E

```js
const cal = [
  {cat: "A", desc: "Ideal — FDI 100% sin patología",  n: 86,    pct: 1.7,  color: "#54a24b"},
  {cat: "B", desc: "Muy buena — FDI 100% con patología", n: 2415, pct: 47.2, color: "#72b7b2"},
  {cat: "C", desc: "Aceptable — FDI ≥85% <100%",         n: 6,    pct: 0.1,  color: "#f58518"},
  {cat: "D", desc: "Limitada — FDI <85% (en práctica =0%)", n: 1882, pct: 36.8, color: "#e45756"},
  {cat: "E", desc: "Excluir — dentición mixta o temporal",  n: 725,  pct: 14.2, color: "#888"},
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

**Hallazgo clave.** No existen identificaciones FDI parciales. Los pantos
tienen FDI completo (100%) o nulo (0%). El filtro queda **binario** en la
práctica.

> 📓 Notebook 003

---

## 3.8 Consideraciones éticas

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

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./02-marco-teorico" style="color:#888;">← Cap. 2 — Marco teórico</a>
  <a href="./04-metodologia" style="color:#4c78a8; font-weight:600;">Cap. 4 — Metodología →</a>
</div>
