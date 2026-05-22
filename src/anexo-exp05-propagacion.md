---
title: exp05 — Propagación del error a eigendentadura e imputación FDI
---

# exp05 — Propagación del error e imputación FDI

```js
import { paginatedTable } from "./components/paginated-table.js";
import { openPantoModal } from "./components/panto-modal.js";
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
import * as d3 from "d3";
```

```js
const pantos       = await FileAttachment("data/anexo/panto_summary.json").json();
const perFdi       = await FileAttachment("data/anexo/exp05_per_fdi.json").json();
const mc           = await FileAttachment("data/anexo/exp05_montecarlo.json").json();
const imputation   = await FileAttachment("data/anexo/exp05_fdi_imputation.json").json();
const splits       = await FileAttachment("data/anexo/splits.json").json();
const coverage     = await FileAttachment("data/anexo/corpus_coverage.json").json();
// Para el modal de pantos reutilizamos los datos de las páginas principales
const pantosBrowser = await FileAttachment("data/pantos_browser.json").json();
const toothStats    = await FileAttachment("data/tooth_stats.json").json();
```

```js
const pantosMap = new Map(pantosBrowser.pantos.map(p => [p.archivo, p]));
```

[← exp04](./anexo-exp04-nn)  ·  [↑ Anexo](./anexo-experimentos)  ·  [exp11 →](./anexo-exp11-forma)

## Pregunta de investigación

Si **reemplazamos** las anotaciones humanas de landmarks por las
predicciones del detector adoptado en exp04, ¿las dos herramientas
centrales de la tesis — **eigendentadura** (vía `tooth_stats_lm`) e
**imputación FDI por densidad + Hungarian** — siguen produciendo
resultados comparables?

## Qué significa "propagar el error"

Las predicciones del detector NN no son perfectas (típicamente
~0.5–2 % de error relativo por landmark). Toda herramienta
posterior que use esas predicciones — eigendentadura, normalización
por landmarks, imputación FDI — hereda ese ruido. La pregunta de
exp05 es: **¿cuánto se degrada cada herramienta?**

Se evalúa por separado en cuatro "usos":

| Uso | Pregunta | Métrica |
|---|---|---|
| **A** | ¿Las estadísticas `tooth_stats_lm` (medias y desvíos de cada FDI tras normalizar por landmarks) cambian al pasar de GT → NN? | sesgo en media / inflado en desvío, por FDI |
| **C** | Monte Carlo: ¿qué landmarks importan más para la varianza? | IC95% del error en `tooth_stats_lm` perturbando subsets de LM |
| **D** | ¿La imputación FDI por matching Hungarian sigue funcionando con frame `*_lm` derivado de NN? | top-1 accuracy GT vs NN |
| **E.A / E.B** | Variantes de D (feature de forma, estratificación por patrón de presencias) | igual que D |

## Por qué importa

```js
display(kpiGrid([
  {
    label: "Pantos sin landmarks GT",
    value: coverage.n_landmarks_missing.toLocaleString("es-AR"),
    sub: `${coverage.pct_missing} % del corpus`,
    color: "#e15759",
    source: "stage_02_pantos_processed.py",
    tooltip: "Pantomografías sin landmarks condíleos completos que requieren predicción NN"
  },
  {
    label: "Predicciones NN persistidas",
    value: coverage.n_corpus_predicted.toLocaleString("es-AR"),
    sub: "todos los pantos del corpus (5114)",
    color: "#7b52ab",
    source: "exp05 v2",
    tooltip: "Predicciones del detector NN v2 sobre todo el corpus (con y sin GT)"
  },
  {
    label: "Val (con GT, evaluado)",
    value: `${splits.exp05_universe.n_val_pantos} / ${splits.exp05_universe.n_val_dientes.toLocaleString("es-AR")} dientes`,
    sub: "métricas vs GT",
    color: "#4c78a8",
    source: "exp05 split",
    tooltip: "Split de validación con GT para evaluar propagación de error"
  },
  {
    label: "Holdout (T_completa)",
    value: `${splits.exp05_universe.n_holdout_pantos} / ${splits.exp05_universe.n_holdout_dientes.toLocaleString("es-AR")} dientes`,
    sub: "métricas vs GT",
    color: "#54a24b",
    source: "exp05 split",
    tooltip: "Split de holdout con dentaduras completas para evaluar propagación"
  }
], {minWidth: "230px"}));
```

```js
display(htl.html`<p>Sin un detector adoptable, <strong>${coverage.pct_missing} % del corpus</strong>
queda fuera de la eigendentadura, la normalización por landmarks y
la imputación FDI. exp05 mide el costo real de usar el detector en
lugar del GT humano, sobre los dos splits que sí tienen GT.</p>`);
```

## Universo evaluado

```js
display(htl.html`<blockquote>
  <p>${splits.exp05_universe.description}</p>
  <p>Las estadísticas <code>tooth_stats_lm</code> y el clasificador k-NN para FDI
  se entrenan <strong>únicamente</strong> sobre el corpus de fitting
  (${splits.exp05_universe.n_corpus_pantos.toLocaleString("es-AR")}
  pantos). val (${splits.exp05_universe.n_val_pantos}) y holdout
  (${splits.exp05_universe.n_holdout_pantos}) quedan reservados para
  evaluación.</p>
</blockquote>`);
```

## Uso A — propagación del detector a `tooth_stats_lm` (eigendentadura)

**Qué es `tooth_stats_lm`**. Para cada FDI (11..48) se calculan, sobre
el corpus de fitting (2.348 pantos con GT completo), la media y el
desvío estándar de tres features del diente *en el frame normalizado
por landmarks*: posición (c_x, c_y) y ángulo del eje mayor del
polígono. Estas estadísticas son el insumo directo de:

- La **eigendentadura** (PCA sobre las features estandarizadas con
  estas medias y desvíos).
- La **imputación FDI** (likelihood gaussiano por FDI usando las
  mismas medias y desvíos).

**Qué se compara en Uso A**. Las mismas estadísticas se recalculan
dos veces sobre el corpus completo: una usando el frame derivado de
**landmarks GT** (cuando hay), otra usando el frame derivado de
**landmarks NN**. Para cada FDI se reportan:

- **|Δμ| / σ_GT** → **sesgo en la media** del FDI (cuánto se corre
  el centro de la distribución gaussiana usada por la imputación).
  *Tolerancia*: < 0,05 (la media se mueve menos que el 5 % del
  desvío típico).
- **(σ_NN − σ_GT) / σ_GT** → **inflado o contracción de varianza**
  del FDI. *Tolerancia*: |·| < 0,10 (el desvío no debería cambiar
  más del 10 %).

Usá el selector de abajo para alternar entre las 6 métricas (3
features × 2 tipos).

```js
const metric = view(Inputs.radio(
  new Map([
    ["|Δμ| / σ_GT en cx (sesgo horizontal)", "rel_cx_mean"],
    ["|Δμ| / σ_GT en cy (sesgo vertical)",   "rel_cy_mean"],
    ["|Δμ| / σ_GT en ángulo",                "rel_angle_mean"],
    ["(σ_NN − σ_GT)/σ_GT en cx",             "rel_cx_std"],
    ["(σ_NN − σ_GT)/σ_GT en cy",             "rel_cy_std"],
    ["(σ_NN − σ_GT)/σ_GT en ángulo",         "rel_angle_std"],
  ]),
  {label: "Métrica a visualizar:", value: "rel_cx_mean"},
));
```

```js
{
  const thrMean = 0.05, thrStd = 0.10;
  const isStd = metric.includes("std");
  const thr = isStd ? thrStd : thrMean;
  const ALL_FDI = [
    11,12,13,14,15,16,17,18,
    21,22,23,24,25,26,27,28,
    41,42,43,44,45,46,47,48,
    31,32,33,34,35,36,37,38,
  ];
  const fdiByValue = new Map(perFdi.map(d => [d.fdi, d]));
  const width = 720, height = 230;
  const margin = {top: 30, right: 16, bottom: 50, left: 50};
  const grid = {cols: 8, rows: 4};
  const cellW = (width - margin.left - margin.right) / grid.cols;
  const cellH = (height - margin.top - margin.bottom) / grid.rows;
  const values = perFdi.map(d => Math.abs(d[metric]));
  const color = d3.scaleSequential(d3.interpolateReds).domain([0, Math.max(thr*2, d3.max(values))]);

  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");
  svg.append("text").attr("x", margin.left).attr("y", 14).attr("font-size",11).attr("fill","#444").text(`${metric}  ·  umbral ${(thr*100).toFixed(0)} % (rojo)`);
  svg.append("text").attr("x", margin.left).attr("y", 26).attr("font-size",10).attr("fill","#888").text("Layout odontograma FDI · maxilar arriba / mandíbula abajo");
  for (let i = 0; i < ALL_FDI.length; i++) {
    const fdi = ALL_FDI[i];
    const row = Math.floor(i / grid.cols);
    const col = i % grid.cols;
    const d = fdiByValue.get(fdi);
    const v = d ? Math.abs(d[metric]) : null;
    const x = margin.left + col * cellW;
    const y = margin.top + row * cellH;
    svg.append("rect").attr("x", x+1).attr("y", y+1).attr("width", cellW-2).attr("height", cellH-2)
      .attr("fill", v == null ? "#f0f0f0" : color(v))
      .attr("stroke", v != null && v > thr ? "#c0392b" : "#ddd").attr("stroke-width", v != null && v > thr ? 1.5 : 0.5);
    svg.append("text").attr("x", x + cellW/2).attr("y", y + cellH/2 - 4).attr("text-anchor","middle").attr("font-size",11).attr("fill","#222").text(fdi);
    if (v != null) svg.append("text").attr("x", x + cellW/2).attr("y", y + cellH/2 + 10).attr("text-anchor","middle").attr("font-size",9).attr("fill","#333").text(v.toFixed(3));
  }
  // legend
  const lg = svg.append("g").attr("transform", `translate(${margin.left}, ${height - margin.bottom + 18})`);
  const lgW = 220;
  const gradId = `grad-${Math.random().toString(36).slice(2,8)}`;
  const def = svg.append("defs").append("linearGradient").attr("id", gradId);
  for (let i = 0; i <= 10; i++) def.append("stop").attr("offset", `${i*10}%`).attr("stop-color", color(i/10 * Math.max(thr*2, d3.max(values))));
  lg.append("rect").attr("width", lgW).attr("height", 8).attr("fill", `url(#${gradId})`);
  lg.append("text").attr("x", 0).attr("y", -3).attr("font-size",10).attr("fill","#666").text("0");
  lg.append("text").attr("x", lgW).attr("y", -3).attr("font-size",10).attr("fill","#666").attr("text-anchor","end").text(Math.max(thr*2, d3.max(values)).toFixed(2));
  // threshold marker on legend
  const tFrac = thr / Math.max(thr*2, d3.max(values));
  lg.append("line").attr("x1", tFrac*lgW).attr("x2", tFrac*lgW).attr("y1", -3).attr("y2", 11).attr("stroke","#c0392b").attr("stroke-width",1.5);
  lg.append("text").attr("x", tFrac*lgW + 4).attr("y", 8).attr("font-size",10).attr("fill","#c0392b").text(`umbral ${(thr*100).toFixed(0)} %`);
  display(svg.node());
}
```

**Cómo leer**: layout de odontograma (FDI 11–18 / 21–28 arriba =
maxilar; 41–48 / 31–38 abajo = mandíbula). En cada celda, el número
grande es el FDI y el número chico el valor de la métrica
seleccionada. **Cuanto más rojo, mayor el sesgo o inflado**. Las
celdas con borde rojo grueso son las que **superan el umbral de
tolerancia** (5 % para medias, 10 % para desvíos). La barra de la
leyenda muestra la escala de color con la posición del umbral.

**Lectura del resultado**:

- `cx_mean` excede el umbral en **29/32 FDIs** (mediana 7,6 %, max 14,2 %)
  → hay un **sesgo horizontal sistemático** introducido por el
  detector, inversamente proporcional a la confianza. Identificable
  panto-a-panto con `conf_min`.
- `cy_mean` excede el umbral en **19/32 FDIs** (mediana 5,1 %, max 9,8 %)
  → sesgo vertical nuevo en v2, correlacionado con la degradación de
  L6 (+0,06 pp en err_rel). Item para exp06 (cerrado net-negativo).
- `angle_mean` se mantiene **dentro de tolerancia** en los 32 FDIs.
- `cx_std` mejora **2,6×** respecto a v1 pero sigue fuera de
  tolerancia sin filtro de confianza → se requiere `conf_min ≥ τ`
  (con τ = p5 ≈ 0,234) para usarlo en producción.

## Uso C — Monte Carlo de propagación (N=100 perturbaciones)

Uso A muestra el sesgo agregado pero no descompone **qué landmarks
lo causan**. Uso C contesta eso con una simulación: se toman los
landmarks GT, se les agrega ruido sintético calibrado al error
observado del detector, y se mide cuánto cambian las estadísticas
`tooth_stats_lm` cuando el ruido se aplica solo a subconjuntos:

- **empirical** — perturba los 7 LM con la distribución empírica de
  errores del detector (cada LM con su propia varianza).
- **isotropic** — perturba los 7 LM con una gaussiana isotrópica de
  varianza equivalente al promedio.
- **only_chin** — perturba solo L3/L4/L5 (mentón), deja L1/L2/L6/L7
  intactos.
- **only_condyles** — perturba solo L1/L2/L6/L7 (cóndilos +
  eminencias), deja L3/L4/L5 intactos.

Comparando los modos se aísla la contribución de cada grupo de
landmarks. Cada modo corre **N=100** muestras Monte Carlo; se reporta
mediana e IC95% del error en `tooth_stats_lm` por FDI.

```js
const mcMode = view(Inputs.radio(
  new Map([
    ["empirical — perturbar los 7 LM con ruido empírico", "empirical"],
    ["isotropic — perturbar los 7 LM con ruido isotrópico equivalente", "isotropic"],
    ["only_chin — perturbar sólo L3/L4/L5", "only_chin"],
    ["only_condyles — perturbar sólo L1/L2/L6/L7", "only_condyles"],
  ]),
  {label: "Modo de perturbación:", value: "empirical"},
));
```

```js
{
  const data = mc[mcMode];
  const width = 720, height = 260;
  const margin = {top: 26, right: 14, bottom: 40, left: 44};
  const x = d3.scaleBand().domain(data.map(d => d.fdi)).range([margin.left, width-margin.right]).padding(0.2);
  const ymax = d3.max(data, d => Math.max(d.rel_std_hi, d.rel_mean_hi)) * 1.1;
  const y = d3.scaleLinear().domain([0, Math.max(0.6, ymax)]).range([height-margin.bottom, margin.top]);
  const svg = d3.create("svg").attr("viewBox",`0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:10px sans-serif;");
  svg.append("text").attr("x", margin.left).attr("y", 14).attr("font-size",11).attr("fill","#444").text(`rel_std_med (azul) y rel_mean_med (verde) con IC95% — modo ${mcMode}`);
  svg.append("g").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).tickValues(x.domain().filter((_,i)=>i%2===0)));
  svg.append("g").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => d.toFixed(2)));
  for (const d of data) {
    const cx = x(d.fdi) + x.bandwidth()/2;
    // std (blue)
    svg.append("line").attr("x1", cx-3).attr("x2", cx-3).attr("y1", y(d.rel_std_lo)).attr("y2", y(d.rel_std_hi)).attr("stroke","#4c78a8").attr("stroke-width",1);
    svg.append("circle").attr("cx", cx-3).attr("cy", y(d.rel_std_med)).attr("r", 2.4).attr("fill","#4c78a8");
    // mean (green)
    svg.append("line").attr("x1", cx+3).attr("x2", cx+3).attr("y1", y(d.rel_mean_lo)).attr("y2", y(d.rel_mean_hi)).attr("stroke","#54a24b").attr("stroke-width",1);
    svg.append("circle").attr("cx", cx+3).attr("cy", y(d.rel_mean_med)).attr("r", 2.4).attr("fill","#54a24b");
  }
  display(svg.node());
}
```

**Cómo leer**: una columna por FDI (eje x). Por cada FDI hay dos
marcadores con IC95%:

- **Azul** (izquierda): inflado de desvío (σ_NN − σ_GT) / σ_GT.
- **Verde** (derecha): sesgo de media |Δμ| / σ_GT.

El punto es la mediana de las 100 simulaciones; la línea vertical
se extiende de p2.5 a p97.5. Cuanto más cerca del eje (cero), menos
se degradan las estadísticas con el ruido aplicado.

**Lectura del resultado**: `only_chin` (perturbar L3/L4/L5) propaga
~10× **menos** incertidumbre que cualquier modo que toque cóndilos.
**El frame `*_lm` depende casi exclusivamente de L1/L2** (eje
intercondilar usado para normalizar), por lo que la prioridad de
cualquier refinamiento futuro está en cóndilos, no en mentón.

## Uso D — Imputación FDI por densidad + Hungarian

**Problema**. Casi la mitad de los pantos no tiene FDI anotado por
el odontólogo. Sin embargo, el polígono y centroide de cada diente
sí está dibujado. Necesitamos asignar a cada diente su FDI
automáticamente.

**Estrategia adoptada** (esquema del pipeline):

1. **Predicción NN** de los 7 landmarks → define el frame
   normalizado `*_lm` para esa panto.
2. **Likelihood gaussiana por FDI**: para cada par (diente,
   FDI candidato) se evalúa N(x | μ_FDI, Σ_FDI) con los parámetros
   pre-calculados en `tooth_stats_lm.json` (sobre el corpus de
   fitting). El feature **x** incluye (c_x, c_y, ángulo) y,
   opcionalmente, un descriptor de forma del polígono.
3. **Asignación por matching Hungarian** sobre la matriz de
   neg-log-likelihoods, restringiendo que cada FDI aparezca **a lo
   sumo una vez por panto** (anatómicamente no puede haber dos
   dientes 11). Esto es lo que distingue *matching* de *argmax*
   independiente por diente: una restricción global de
   consistencia.

**Feature de forma**. Descriptor radial simétrico del polígono
(distancia del centroide al borde muestreada cada 5°, simetrizada).
Distingue molares de incisivos por silueta. Se mezcla con la
posición vía hiperparámetro λ ∈ [0, 1]:

```
score = (1 − λ) · NLL_posición + λ · NLL_forma
```

Se evalúan tres valores de λ:

- **λ = 0** → solo posición (línea base).
- **λ = 0,5** → mezcla balanceada.
- **λ = 1** → solo forma.

La columna **argmax** reporta lo que pasaría sin restricción de
unicidad (solo el FDI más probable por diente, puede repetir); la
columna **match** reporta el matching Hungarian. La columna
**cuadrante** mide acuracy a nivel de cuadrante (1, 2, 3 o 4) en
lugar de FDI exacto — es una métrica más permisiva que captura si
el diente quedó al menos en la zona correcta.

```js
{
  const rows = imputation.matching_shape.splits.map(r => ({
    split: r.split,
    lambda: r.lambda,
    n_dientes: r.n_dientes,
    n_pantos: r.n_pantos,
    argmax_gt: (r.argmax_top1_gt*100).toFixed(2),
    argmax_nn: (r.argmax_top1_nn*100).toFixed(2),
    match_gt:  (r.match_top1_gt*100).toFixed(2),
    match_nn:  (r.match_top1_nn*100).toFixed(2),
    delta:     ((r.match_top1_nn - r.match_top1_gt)*100).toFixed(2),
    quad_nn:   (r.match_quad_nn*100).toFixed(2),
  }));
  display(Inputs.table(rows, {
    columns:["split","lambda","n_pantos","n_dientes","argmax_gt","argmax_nn","match_gt","match_nn","delta","quad_nn"],
    header:{split:"split", lambda:"λ forma", n_pantos:"pantos", n_dientes:"dientes", argmax_gt:"argmax GT %", argmax_nn:"argmax NN %", match_gt:"match GT %", match_nn:"match NN %", delta:"Δ NN−GT pp", quad_nn:"cuadrante NN %"},
    layout:"auto",
  }));
}
```

**Lectura clave**:

- **λ=0** (posición sólo) → 88,4 % top-1 val · 99,2 % holdout.
- **λ=0.5** (+ forma del polígono) → **92,7 % top-1 val** (+4,3 pp). Adoptable.
- **λ=1.0** (sólo forma) → degrada → la forma sola no alcanza.
- **Costo del detector NN** vs GT: ≤ 0.6 pp en cualquier variante.
- **Confusión por cuadrante**: ≥ 99,5 % en NN — el detector preserva
  perfectamente el cuadrante anatómico.

## Tabla — todas las dentaduras evaluadas y sus imputaciones

Cada fila es una pantomografía de val (n=257) o holdout (n=140).
Filtrá por split, ordenando o usando la cajita de filtro en cada
columna; click sobre una fila para abrir el odontograma con los
dientes y la geometría normalizada.

**Columnas**:

- **conf_min** — mínimo entre los 7 picos de heatmap del detector
  para esa panto. Es nuestro proxy de **confianza del detector**.
  Cuanto más bajo, más sospechoso (OOD probable). Colores: rojo en
  negrita si < 0,30 (OOD candidato), rojo si < 0,50, naranja si
  < 0,70, verde si ≥ 0,70. El percentil 5 de la val (~0,234) se
  propone como umbral operativo τ para filtrar antes de incluir un
  panto en análisis poblacional.
- **top1 match NN** — accuracy de imputación FDI usando el matching
  Hungarian con λ = 0,5 y landmarks NN. Verde si ≥ 0,85, naranja
  si ≥ 0,70, rojo en negrita debajo.
- **top1 argmax NN** — accuracy si no se aplicara la restricción de
  unicidad (solo argmax por diente). Suele ser un poco menor que
  match.
- **n correctos** — cantidad absoluta de FDIs bien asignados sobre
  el total de dientes de esa panto.

```js
{
  // Color de fila por confianza
  function confColor(v) {
    if (v == null) return {};
    if (v < 0.3) return {color: "#c0392b", fontWeight: 600};
    if (v < 0.5) return {color: "#e15759"};
    if (v < 0.7) return {color: "#f58518"};
    return {color: "#54a24b"};
  }
  function accColor(v) {
    if (v == null) return {};
    if (v < 0.7) return {color: "#c0392b", fontWeight: 600};
    if (v < 0.85) return {color: "#f58518"};
    return {color: "#54a24b"};
  }
  display(paginatedTable({
    data: pantos,
    columns: [
      { key: "panto_id",       header: "panto_id",          type: "string" },
      { key: "split",          header: "split",             type: "category" },
      { key: "n_dientes",      header: "n dientes",         type: "number", format: d => d?.toLocaleString("es-AR") },
      { key: "conf_min",       header: "conf_min",          type: "number", format: d => d?.toFixed(3) ?? "–", cellStyle: confColor },
      { key: "top1_match_nn",  header: "top1 match NN",     type: "number", format: d => (d*100).toFixed(1) + " %", cellStyle: accColor },
      { key: "top1_argmax_nn", header: "top1 argmax NN",    type: "number", format: d => (d*100).toFixed(1) + " %" },
      { key: "n_match_correct",header: "n correctos",       type: "number" },
      { key: "W",              header: "W",                 type: "number" },
      { key: "H",              header: "H",                 type: "number" },
    ],
    pageSize: 15,
    filterable: true,
    onRowClick: row => {
      const pb = pantosMap.get(row.panto_id) ?? null;
      openPantoModal({
        id: row.panto_id,
        pantoMeta: pb,
        toothStats,
        extraBadges: [
          {label: "split",      value: row.split,                                color: row.split === "holdout" ? "#54a24b" : "#4c78a8"},
          {label: "conf_min",   value: row.conf_min?.toFixed(3) ?? "–",          color: (row.conf_min ?? 1) < 0.3 ? "#c0392b" : "#7b52ab"},
          {label: "match NN",   value: (row.top1_match_nn*100).toFixed(1)+" %",  color: "#4c78a8"},
          {label: "argmax NN",  value: (row.top1_argmax_nn*100).toFixed(1)+" %", color: "#6b6b6b"},
        ],
      });
    },
  }));
}
```

> **Color del `conf_min`**: rojo (< 0.30, candidato OOD), naranja
> (0.30–0.50), amarillo (0.50–0.70), verde (≥ 0.70). El percentil 5
> de `conf_min` sobre val es ~0.234, que se propone como umbral
> operativo `τ` para filtrar pantos sospechosos antes de incluirlos en
> análisis poblacional.

## Veredicto

| Uso | ¿Adoptable en el pipeline? | Justificación |
|---|---|---|
| **D — imputación FDI** | **Sí, sin reservas.** | 88,4 % top-1 val / 99,2 % holdout. Costo del detector ≤ 0,6 pp. |
| **D + E.A — con forma λ=0.5** | **Sí, recomendado.** | +4,3 pp val (92,7 %). Adoptable. |
| **A — `tooth_stats_lm`** | **Sí con filtro `conf_min ≥ p5`.** | `cx_std` mejora 2.6× respecto a v1 pero sigue fuera de tolerancia sin filtro; sesgo vertical nuevo no eliminado. |
| **E.B — estratificación por patrón de FDI faltantes** | **No.** | k-means k=4 sobre T_completa / T_sin_terceros / T_mixta / T_residual: −0.02 pp con tipo bien predicho. Resultado negativo informativo para P3. |

## Conclusión metodológica

El detector exp04 es **viable para la generalización al corpus
completo** vía la imputación FDI por densidad + Hungarian. Para la
eigendentadura propiamente dicha, el detector introduce sesgos
nuevos que requieren filtros de confianza (no eliminados por exp06
refiner y exp07 ensemble — ambos cerraron negativos). La adopción
en producción usa la columna `conf_min` como mecanismo de
auditoría.

## Artefactos

- Plan: [`docs/experimentos/05_propagacion_error/00_plan.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/05_propagacion_error/00_plan.md)
- Cierre v2: [`99_cierre.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/05_propagacion_error/99_cierre.md)
- Uso D: [`02_uso_D_imputacion_fdi.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/05_propagacion_error/02_uso_D_imputacion_fdi.md)
- Uso E: [`03_uso_E_sub_eigendentaduras.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/05_propagacion_error/03_uso_E_sub_eigendentaduras.md)
- Notebooks A/B/C: `notebook_A_eigendentadura.ipynb`, `notebook_B_fdi.ipynb`, `notebook_C_montecarlo.ipynb`
- Outputs canónicos: `data/exp05/{landmarks_*.csv, notebook_*.csv, matching_*.csv}`
- Predicciones del corpus completo: `data/exp05/landmarks_corpus.csv` (5114 pantos)

[← exp04](./anexo-exp04-nn)  ·  [↑ Anexo](./anexo-experimentos)  ·  [exp11 →](./anexo-exp11-forma)
