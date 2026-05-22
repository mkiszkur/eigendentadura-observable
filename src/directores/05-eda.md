---
title: 5 · EDA
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("05"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./04-metodologia" style="color:#888;">← Cap. 4</a></span>
  <span><a href="./06-normalizacion" style="color:#888;">Cap. 6 — Normalización →</a></span>
</div>

# 5 · Análisis Exploratorio

```js
import * as d3 from "d3";
import {teethDistChart} from "../components/funnel-chart.js";
import {zoomableChart} from "../components/zoomable-chart.js";
const ds = await FileAttachment("../data/dataset_stats.json").json();
const prev = await FileAttachment("../data/prevalence_by_tooth.json").json();
```

## 5.1 Composición de shapes (n = 475.985)

```js
const shapeMix = [
  {tipo: "tooth",    n: 449285, pct: 94.4, color: "#4c78a8"},
  {tipo: "landmark", n:  19358, pct:  4.1, color: "#54a24b"},
  {tipo: "metal",    n:   7141, pct:  1.5, color: "#f58518"},
  {tipo: "atheroma", n:    132, pct: 0.03, color: "#e45756"},
  {tipo: "error",    n:     64, pct: 0.01, color: "#888"},
];
display(Plot.plot({
  width: Math.min(width, 700), height: 200, marginLeft: 80,
  x: {label: "Shapes", grid: true, type: "log"},
  y: {label: null},
  marks: [
    Plot.barX(shapeMix, {x: "n", y: "tipo", fill: "color", tip: true, sort: {y: "x", reverse: true}}),
    Plot.text(shapeMix, {x: "n", y: "tipo", text: d=>`${d.n.toLocaleString("es-AR")} (${d.pct}%)`, dx: 6, textAnchor: "start", fontSize: 11}),
  ],
}));
```

De los **449.285 shapes dentales**, solo **146.596 son dientes reales**
(polígonos principales con FDI). El resto son las shapes auxiliares
(centroides + minBBox) del sistema multi-shape descrito en
[3.3](./03-dataset#3-3-sistema-multi-shape).

---

## 5.2 Distribución de dientes por panto

```js
const rawMax = d3.max(ds.teeth_dist, d => d.count);
const yCapInput = Inputs.range([20, rawMax], {label: "Máximo en Y", step: 10, value: rawMax});
const yCap = Generators.input(yCapInput);
display(yCapInput);
```

```js
display(zoomableChart(teethDistChart(ds.teeth_dist, {width: Math.min(width, 680), maxY: yCap})));
```

```js
{
  const pct32 = ds.teeth_dist.find(d => d.n_teeth === 32);
  const total = d3.sum(ds.teeth_dist, d => d.count);
  const median = d3.median(ds.pantos, d => d.n);
  display(html`<p style="font-size:0.9rem; color:#444; line-height:1.5;">
    <strong>${pct32 ? ((pct32.count/total*100).toFixed(1)) : "—"}%</strong> de los pantos tiene los 32 dientes permanentes anotados.
    Mediana: <strong>${median}</strong> dientes/panto. La cola larga refleja la naturaleza
    adulta de la población (alta tasa de ausencias).
  </p>`);
}
```

---

## 5.3 Distribución anatómica (n = 146.596 dientes)

```js
const anat = [
  {tipo: "Molares",    superior: 23753, inferior: 23092, color: "#7b52ab"},
  {tipo: "Incisivos",  superior: 19875, inferior: 19905, color: "#4c78a8"},
  {tipo: "Premolares", superior: 18697, inferior: 18920, color: "#54a24b"},
  {tipo: "Caninos",    superior: 11343, inferior: 11074, color: "#f58518"},
];
const anatLong = anat.flatMap(d => [
  {tipo: d.tipo, arco: "Superior",  n: d.superior},
  {tipo: d.tipo, arco: "Inferior",  n: d.inferior},
]);
display(Plot.plot({
  width: Math.min(width, 700), height: 220, marginLeft: 90,
  x: {label: "Dientes", grid: true},
  y: {label: null, domain: anat.map(a=>a.tipo)},
  color: {legend: true, domain: ["Superior", "Inferior"], range: ["#4c78a8", "#e45756"]},
  marks: [
    Plot.barX(anatLong, {x: "n", y: "tipo", fill: "arco", tip: true}),
    Plot.ruleX([0]),
  ],
}));
```

La distribución refleja la anatomía real (12 molares, 8 premolares, 8
incisivos, 4 caninos por boca) con buen balance entre arcadas — un check
sano de la calidad de las anotaciones.

---

## 5.4 Missingness estructural

```js
const miss = [
  {campo: "json_label",          pct: 0.0,  causa: "Siempre anotado",                              critico: false},
  {campo: "json_points",         pct: 0.0,  causa: "Polígono siempre anotado",                     critico: false},
  {campo: "json_flag_*",         pct: 0.0,  causa: "Flags siempre presentes (aunque False)",       critico: false},
  {campo: "json_group_id",       pct: 47.0, causa: "No existe en v4.5.13",                         critico: true},
  {campo: "json_tooth_number",   pct: 47.0, causa: "No existe en v4.5.13",                         critico: true},
  {campo: "minbbox_angle",       pct: 0.1,  causa: "MinBBox degenerados (corregidos en pipeline)", critico: false},
  {campo: "Landmarks L1–L7",     pct: 46.2, causa: "No existen en v4.5.13 y v4.6.0",               critico: true},
];
display(Plot.plot({
  width: Math.min(width, 720), height: 220, marginLeft: 150,
  x: {label: "% missing", grid: true, domain: [0, 50]},
  y: {label: null, domain: miss.map(m=>m.campo)},
  color: {domain: [true, false], range: ["#e45756", "#54a24b"]},
  marks: [
    Plot.barX(miss, {x: "pct", y: "campo", fill: "critico", tip: true}),
    Plot.text(miss, {x: "pct", y: "campo", text: d=>`${d.pct}%`, dx: 4, textAnchor: "start", fontSize: 11}),
    Plot.ruleX([0]),
  ],
}));
```

**Missingness global del dataset completo: 38,4 %**. Restringido a dientes
reales baja a **11,65 %**. La mayor parte es **estructural por versión de
esquema** y se compensa porque `json_label` (0% missing) permite siempre
clasificación anatómica.

<details>
<summary>▸ Detalle metodológico — Hallazgo binario de FDI</summary>

Las pantos tienen **FDI completo (100%) o nulo (0%)**. No hay
identificaciones parciales. Esto simplifica el manejo del subset
analizable pero implica que ~36,8% del dataset (los 1.882 pantos de
versión 4.5.13) queda **excluido** de cualquier análisis que requiera
identificación individual de piezas.

Consecuencia: el universo geométrico de los caps. 6–9 no es un
subsample aleatorio del total: está **enriquecido en versiones recientes**
y por ende potencialmente en cohortes clínicas más recientes. La
limitación se discute en el cap. 9 (subpoblaciones × versión).

</details>

---

## 5.5 Prevalencia de patologías

Sobre los **146.596 dientes con FDI**, todas las patologías tienen
prevalencia inferior al 5%. Esto plantea el desafío de **clases muy
desbalanceadas** para cualquier técnica supervisada (queda fuera de scope).

```js
const patos = [
  {flag: "restoration",          pct: 4.57},
  {flag: "root_canal_treatment", pct: 2.21},
  {flag: "neoformation",         pct: 2.06},
  {flag: "crown_implant",        pct: 2.03},
  {flag: "retained",             pct: 1.97},
  {flag: "post_implant",         pct: 1.23},
  {flag: "advanced_caries",      pct: 1.22},
  {flag: "orthodontic_brackets", pct: 1.08},
  {flag: "root_remains",         pct: 0.92},
  {flag: "moderate_caries",      pct: 0.80},
  {flag: "radiolucency",         pct: 0.57},
];
display(Plot.plot({
  width: Math.min(width, 720), height: 240, marginLeft: 170,
  x: {label: "Prevalencia (%)", grid: true},
  y: {label: null, domain: patos.map(p=>p.flag)},
  marks: [
    Plot.barX(patos, {x: "pct", y: "flag", fill: "#e45756", tip: true, sort: {y: "x", reverse: true}}),
    Plot.text(patos, {x: "pct", y: "flag", text: d=>`${d.pct.toFixed(2)}%`, dx: 4, textAnchor: "start", fontSize: 10}),
    Plot.ruleX([0]),
  ],
}));
```

> ⚠️ **Importante** (exp20, cap. 3). Estas prevalencias son sobre el
> universo total. Para `restoration`, `neoformation` y `atheroma` deben
> condicionarse a versión ≥ 5.3.1 para evitar **infraestimación
> estructural**.

### Multimorbilidad

```js
const morbi = [
  {n_flags: "0",  pct: 88},
  {n_flags: "1",  pct: 9},
  {n_flags: "2",  pct: 2},
  {n_flags: "≥3", pct: 1},
];
display(Plot.plot({
  width: Math.min(width, 480), height: 160, marginLeft: 60,
  x: {label: "% dientes", grid: true},
  y: {label: "Flags/diente", domain: morbi.map(m=>m.n_flags)},
  marks: [
    Plot.barX(morbi, {x: "pct", y: "n_flags", fill: "#7b52ab", tip: true}),
    Plot.text(morbi, {x: "pct", y: "n_flags", text: d=>`≈${d.pct}%`, dx: 4, textAnchor: "start", fontSize: 11}),
  ],
}));
```

Combinación más frecuente: `restoration` + `root_canal_treatment` (secuencia
clínica de tratamiento de caries profunda).

---

## 5.6 Ángulos: bimodalidad espuria

El `minbbox_angle` calculado por `cv2.boxPoints` presenta una distribución
**bimodal espuria** porque la función retorna vértices en orden no
determinístico → invierte el signo en ~30% de los casos.

**Corrección implementada (`angle_normalized`)**: pipeline de 3 pasadas

1. Negar el ángulo si se acerca más a la mediana cruda.
2. Refinar con la mediana corregida.
3. Coherencia anatómica por cuadrante.

Resultado: distribuciones unimodales por familia dental (incisivos
verticales ~0°, molares con mayor dispersión coherente con la curvatura
de la arcada).

> 📓 Notebook 012 · `lib/geometry.py`

---

## 5.7 Métricas geométricas (dientes reales)

| Métrica | Mediana | IQR | Comentario |
|---|---|---|---|
| `polygon_area` (px²) | ≈ 18.000 | [10.500 – 28.000] | Área del polígono de segmentación |
| `minbbox_area` (px²) | ≈ 22.500 | [13.500 – 34.000] | Siempre ≥ `polygon_area` |
| `compactness` | ≈ 0.78 | [0.71 – 0.83] | $4\pi A / P^2$, ↑ → más circular |
| Aspect ratio (corto/largo) | ≈ 0.40 | [0.32 – 0.49] | Diente típico ~2,5× más alto que ancho |
| `bbox_width` (px) | ≈ 200 | [165 – 245] | — |
| `bbox_height` (px) | ≈ 235 | [190 – 290] | — |

**Conclusión clave** validada en cap. 6 (exp16): los features de tamaño/
forma capturan variación **irrelevante** para separar subgrupos
posicionales. El set mínimo `(cx, cy, angle)` con normalización por
landmarks es el más informativo.

---

## 5.8 Caracterización clínica del archivo

```js
const flagsArchivo = [
  {flag: "permanent_incomplete", pct: 68.3, color: "#e45756"},
  {flag: "landmarks_complete",   pct: 53.8, color: "#7b52ab"},
  {flag: "bone_loss",            pct: 42.9, color: "#e45756"},
  {flag: "tartar",               pct: 37.7, color: "#f58518"},
  {flag: "dental_restoration",   pct: 34.3, color: "#54a24b"},
];
display(Plot.plot({
  width: Math.min(width, 680), height: 200, marginLeft: 160,
  x: {label: "% pantos", grid: true},
  y: {label: null, domain: flagsArchivo.map(f=>f.flag)},
  marks: [
    Plot.barX(flagsArchivo, {x: "pct", y: "flag", fill: "color", tip: true, sort: {y: "x", reverse: true}}),
    Plot.text(flagsArchivo, {x: "pct", y: "flag", text: d=>`${d.pct}%`, dx: 4, textAnchor: "start", fontSize: 11}),
  ],
}));
```

Interpretación poblacional:

1. **Población adulta** con alta carga periodontal (68% incompleta, 43% pérdida ósea).
2. Desbalance patológico severo (<5% por patología).
3. Distribución anatómica balanceada entre arcadas y hemicaras.
4. Variabilidad geométrica real (ángulos, posiciones) justifica el análisis morfométrico del cap. 6+.
5. Cobertura parcial de landmarks (54%) **limita pero no impide** el análisis geométrico avanzado.

> 📓 Notebooks 010, 011, 012

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./04-metodologia" style="color:#888;">← Cap. 4 — Metodología</a>
  <a href="./06-normalizacion" style="color:#4c78a8; font-weight:600;">Cap. 6 — Normalización →</a>
</div>
