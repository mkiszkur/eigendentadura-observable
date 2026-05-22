---
title: Análisis de casos atípicos
---

# Análisis de casos atípicos

```js
import {atipicalityScatter} from "./components/atipicality-scatter.js";
import {openPantoModal} from "./components/panto-modal.js";
import {collapsible} from "./components/collapsible.js";
import {rangeSlider} from "./components/range-slider.js";
import {paginatedTable} from "./components/paginated-table.js";
import * as d3 from "d3";
```

```js
const toothStats         = await FileAttachment("data/tooth_stats.json").json();
const typicalityExtremes = await FileAttachment("data/typicality_extremes.json").json();
const individuals        = await FileAttachment("data/individual_scores.json").json();
const geoPathData        = await FileAttachment("data/geo_patologia.json").json();
const pantosRaw          = await FileAttachment("data/pantos_browser.json").json();
const superCounts        = await FileAttachment("data/supernumerary_counts.json").json();
```

```js
display(htl.html`<p>¿Qué hace a una dentadura "típica" o "atípica"? Esta sección analiza la distribución de la <strong>tipicidad posicional y angular</strong> en la población completa, identifica las dentaduras más y menos representativas, y permite visualizarlas sobre la eigendentadura.</p>

<p><strong>${individuals.length.toLocaleString("es-AR")} pantomografías</strong> con z-scores calculados (posición y ángulo de cada diente relativo a la media poblacional).</p>`);
```

```js
// Mapas de datos auxiliares
const nPathMap  = new Map(geoPathData.records.map(r => [r.id, r.n_pathologies]));
const pantosMap = new Map(pantosRaw.pantos.map(p => [p.archivo, p]));

function extractGeoId(fn) {
  const m = fn?.match(/database_original__(.+?)__json_url\.json/);
  return m?.[1] ?? null;
}

function simplifyFn(fn) {
  return fn?.replace(/^database_original__/, "").replace(/__json_url\.json$/, "") ?? fn;
}

const individualsEnriched = individuals.map(d => {
  const geoId = extractGeoId(d.json_filename);
  const pb    = geoId ? pantosMap.get(geoId) : null;
  return {
    ...d,
    n_pathologies:    nPathMap.get(geoId) ?? null,
    pb_flags:         pb?.flags         ?? null,
    pb_tooth_numbers: pb?.tooth_numbers ?? null,
    pb_denticion:     pb?.denticion     ?? null,
  };
});
```

```js
// Cómputo IQR sobre dentaduras elegibles (≥10 dientes)
const zEligible = individualsEnriched
  .filter(d => d.n_teeth >= 10 && d.z_mean != null)
  .map(d => d.z_mean)
  .sort(d3.ascending);

const iqrQ1        = d3.quantile(zEligible, 0.25);
const iqrQ3        = d3.quantile(zEligible, 0.75);
const iqrVal       = iqrQ3 - iqrQ1;
const iqrThreshold = iqrQ3 + 1.5 * iqrVal;   // ~2.80 — outliers moderados
const iqrExtreme   = iqrQ3 + 3.0 * iqrVal;   // ~3.79 — outliers extremos

// Ranking completo por z_mean descendente
const sortedDesc = [...individualsEnriched]
  .filter(d => d.n_teeth >= 10 && d.z_mean != null)
  .sort((a, b) => b.z_mean - a.z_mean);

const rankAtypMap = new Map(sortedDesc.map((d, i) => [d.json_filename, {
  rank_atypical: i + 1,
  rank_typical:  sortedDesc.length - i,
  total:         sortedDesc.length,
}]));
```

## Atipicidad posicional vs angular — población completa

¿Son los pacientes atípicos por su **posición** dental, por su **ángulo** de rotación, o por ambas cosas?
Cada punto es una pantomografía. Las líneas punteadas marcan la mediana de la población en cada eje. Los círculos en rojo son outliers (z̄ ≥ Q3 + 1.5·IQR).

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X (z_pos)** — atipicidad posicional: desvío promedio de los centroides dentales respecto a la media poblacional, en desvíos estándar. Valores altos = dientes muy desplazados de su posición típica.
- **Eje Y (z_ang)** — atipicidad angular: desvío medio del ángulo de cada diente respecto al ángulo poblacional.
- **Líneas punteadas** — mediana de la población en cada eje; dividen el espacio en 4 cuadrantes.
- **Anillo rojo** — outliers formales (z̄ ≥ Q3 + 1.5·IQR); ver criterio en la sección siguiente.
- **Color** — codificado según el selector.

Un paciente en el cuadrante superior derecho tiene dientes desplazados _y_ rotados respecto a la distribución esperada. Hacé clic en cualquier punto para ver la pantomografía de esa dentadura.

</details>

```js
const colorByInput = Inputs.select(
  new Map([
    ["Atipicidad (z̄)", "atipicidad"],
    ["N° de dientes",   "n_teeth"],
    ["N° de patologías","n_pathologies"],
    ["Centro clínico",  "origin"],
    ["Sexo",            "sex"],
  ]),
  {label: "Colorear por", value: "atipicidad"}
);
const colorBy = Generators.input(colorByInput);
const teethRangeInput = rangeSlider({label: "Cantidad de dientes", min: 4, max: 32, value: [10, 32]});
const teethRange = Generators.input(teethRangeInput);
const highlightOutliersInput = Inputs.toggle({label: "Resaltar outliers", value: false});
const highlightOutliers = Generators.input(highlightOutliersInput);
const excludeMixtaInput = Inputs.toggle({label: "Excluir dentición mixta", value: true});
const excludeMixta = Generators.input(excludeMixtaInput);
const highlightSuperInput = Inputs.toggle({label: "Resaltar supernumerarios", value: false});
const highlightSuper = Generators.input(highlightSuperInput);
const superSet = new Set(Object.keys(superCounts));

// Sliders de z-scores (sólo visibles al colorear por Atipicidad)
const zMeanMax = Math.ceil(d3.max(individualsEnriched, d => d.z_mean) * 10) / 10;
const zPosMax  = Math.ceil(d3.max(individualsEnriched, d => d.z_pos)  * 10) / 10;
const zAngMax  = Math.ceil(d3.max(individualsEnriched, d => d.z_ang)  * 10) / 10;
const zMeanSlider = rangeSlider({label: "z̄ (tipicidad media)", min: 0, max: zMeanMax, value: [0, zMeanMax], step: 0.1});
const zPosSlider  = rangeSlider({label: "z_pos (posición)",    min: 0, max: zPosMax,  value: [0, zPosMax],  step: 0.1});
const zAngSlider  = rangeSlider({label: "z_ang (ángulo)",      min: 0, max: zAngMax,  value: [0, zAngMax],  step: 0.1});
const zMeanRange = Generators.input(zMeanSlider);
const zPosRange  = Generators.input(zPosSlider);
const zAngRange  = Generators.input(zAngSlider);
```

```js
display(collapsible({
  title: "Opciones de visualización",
  content: html`<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-end;">${colorByInput}${teethRangeInput}${highlightOutliersInput}${excludeMixtaInput}${highlightSuperInput}</div>`,
  open: false,
}));
```

```js
if (colorBy === "atipicidad") {
  display(collapsible({
    title: "Filtro por z-scores",
    content: html`<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-end;">${zMeanSlider}${zPosSlider}${zAngSlider}</div>`,
    open: true,
  }));
}
```

```js
const scatterData = excludeMixta
  ? individualsEnriched.filter(d => d.pb_denticion !== "Mixta")
  : individualsEnriched;

const visibleCount = scatterData.filter(d =>
  d.n_teeth >= teethRange[0] && d.n_teeth <= teethRange[1] &&
  d.z_pos != null && d.z_ang != null &&
  d.z_mean >= zMeanRange[0] && d.z_mean <= zMeanRange[1] &&
  d.z_pos  >= zPosRange[0]  && d.z_pos  <= zPosRange[1] &&
  d.z_ang  >= zAngRange[0]  && d.z_ang  <= zAngRange[1]
).length;
display(html`<p style="font-size:0.82rem;color:#888;margin:0.3rem 0 0.5rem;">Mostrando <strong>${visibleCount.toLocaleString("es-AR")}</strong> de ${individuals.length.toLocaleString("es-AR")} pantomografías</p>`);
```

```js
const clickedIndividual = Mutable(null);
function setClickedIndividual(d) { clickedIndividual.value = d; }
function clearClickedIndividual() { clickedIndividual.value = null; }
```

```js
display(atipicalityScatter(scatterData, {
  width: Math.min(width, 700),
  height: 460,
  colorBy,
  minTeeth: teethRange[0],
  maxTeeth: teethRange[1],
  zMeanRange,
  zPosRange,
  zAngRange,
  selectedPanto: null,
  onClickPanto: setClickedIndividual,
  threshold: iqrThreshold,
  highlightOutliers,
  superSet: highlightSuper ? superSet : null,
}));
```

```js
// ── Datos filtrados para navegación en modal ─────────────────────────────
const filteredScatterData = scatterData.filter(d =>
  d.n_teeth >= teethRange[0] && d.n_teeth <= teethRange[1] &&
  d.z_pos != null && d.z_ang != null &&
  d.z_mean >= zMeanRange[0] && d.z_mean <= zMeanRange[1] &&
  d.z_pos  >= zPosRange[0]  && d.z_pos  <= zPosRange[1] &&
  d.z_ang  >= zAngRange[0]  && d.z_ang  <= zAngRange[1]
);

const allItems = filteredScatterData.map(d => {
  const geoId = extractGeoId(d.json_filename);
  return {
    id: geoId,
    pantoMeta: pantosMap.get(geoId),
    toothStats,
    zScores: d,
    rankInfo: rankAtypMap.get(d.json_filename),
    iqrThreshold,
    iqrExtreme,
    extraBadges: [],
  };
});
```

```js
{
  const clicked = clickedIndividual;
  if (clicked) {
    const id = extractGeoId(clicked.json_filename);
    if (id) {
      const currentIndex = allItems.findIndex(item => item.id === id);
      await openPantoModal({
        id,
        pantoMeta: pantosMap.get(id),
        toothStats,
        zScores: clicked,
        rankInfo: rankAtypMap.get(clicked.json_filename),
        iqrThreshold,
        iqrExtreme,
        invalidation,
        onClose: clearClickedIndividual,
        allItems,
        currentIndex: currentIndex >= 0 ? currentIndex : null,
      });
    }
  }
}
```

## Ranking de outliers — casos más atípicos

<details>
<summary>Cómo interpretar este ranking</summary>

```js
display(htl.html`<p><strong>Criterio de outlier</strong>: z̄ ≥ Q3 + 1.5·IQR = <strong>${iqrThreshold.toFixed(3)}</strong> (Q1=${iqrQ1.toFixed(3)}, Q3=${iqrQ3.toFixed(3)}, IQR=${iqrVal.toFixed(3)}). Las <strong>${sortedDesc.filter(d => d.z_mean >= iqrThreshold).length} dentaduras</strong> que superan este umbral se consideran outliers moderados. Las que superan Q3 + 3·IQR = <strong>${iqrExtreme.toFixed(3)}</strong> son outliers extremos (z̄ en rojo oscuro).</p>`);
```

- **z̄** — score de atipicidad global (promedio de z_pos y z_ang).
- **z_pos** — desvío posicional: cuánto se alejan los centroides dentales de la media poblacional.
- **z_ang** — desvío angular: cuánto difieren los ángulos de cada diente respecto al ángulo típico.
- Hacé clic en cualquier fila para abrir la pantomografía.

</details>

```js
// Datos base del ranking (con supernumerarios incorporados)
const rankDataBase = sortedDesc
  .filter(d => d.z_mean >= iqrThreshold)
  .map((d, i) => {
    const geoId = extractGeoId(d.json_filename);
    return {
      ...d,
      rank:              i + 1,
      display_id:        simplifyFn(d.json_filename),
      flags_str:         d.pb_flags ? Object.keys(d.pb_flags).join(", ") : "",
      n_supernumeraries: superCounts[geoId] ?? 0,
    };
  });

// Filtros del ranking
const rankOrigins  = [...new Set(rankDataBase.map(d => d.data_origin).filter(Boolean))].sort();
const rankSexes    = [...new Set(rankDataBase.map(d => d.sex).filter(Boolean))].sort();
const rankDents    = [...new Set(rankDataBase.map(d => d.pb_denticion).filter(Boolean))].sort();
const rankTeethExt = d3.extent(rankDataBase, d => d.n_teeth);
const rankMaxSuper = d3.max(rankDataBase, d => d.n_supernumeraries) ?? 0;

const rankOriginInput = Inputs.select(new Map([["Todos", null], ...rankOrigins.map(o => [o, o])]), {label: "Centro"});
const rankSexInput    = Inputs.select(new Map([["Todos", null], ...rankSexes.map(s => [s, s])]),   {label: "Sexo"});
const rankDentInput   = Inputs.select(new Map([["Todos", null], ...rankDents.map(d => [d, d])]),   {label: "Dentición"});
const rankTeethSlider = rangeSlider({label: "N° dientes",       min: rankTeethExt[0], max: rankTeethExt[1], value: rankTeethExt,     step: 1});
const rankSuperSlider = rangeSlider({label: "Supernumerarios",  min: 0,               max: Math.max(rankMaxSuper, 1), value: [0, Math.max(rankMaxSuper, 1)], step: 1});
const rankZMeanSlider = rangeSlider({label: "z̄",                min: 0, max: zMeanMax, value: [iqrThreshold, zMeanMax], step: 0.1});
const rankZPosSlider  = rangeSlider({label: "z_pos",            min: 0, max: zPosMax,  value: [0, zPosMax],             step: 0.1});
const rankZAngSlider  = rangeSlider({label: "z_ang",            min: 0, max: zAngMax,  value: [0, zAngMax],             step: 0.1});

const rankOrigin     = Generators.input(rankOriginInput);
const rankSex        = Generators.input(rankSexInput);
const rankDent       = Generators.input(rankDentInput);
const rankTeeth      = Generators.input(rankTeethSlider);
const rankSuper      = Generators.input(rankSuperSlider);
const rankZMeanRange = Generators.input(rankZMeanSlider);
const rankZPosRange  = Generators.input(rankZPosSlider);
const rankZAngRange  = Generators.input(rankZAngSlider);

display(collapsible({
  title: "Filtros",
  content: html`<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-end;">
    ${rankOriginInput}${rankSexInput}${rankDentInput}
    ${rankTeethSlider}${rankSuperSlider}
    ${rankZMeanSlider}${rankZPosSlider}${rankZAngSlider}
  </div>`,
  open: false,
}));
```

```js
{
  const filtered = rankDataBase.filter(d =>
    (rankOrigin == null    || d.data_origin    === rankOrigin) &&
    (rankSex    == null    || d.sex            === rankSex)    &&
    (rankDent   == null    || d.pb_denticion   === rankDent)   &&
    d.n_teeth          >= rankTeeth[0]      && d.n_teeth          <= rankTeeth[1]      &&
    d.n_supernumeraries >= rankSuper[0]     && d.n_supernumeraries <= rankSuper[1]     &&
    d.z_mean           >= rankZMeanRange[0] && d.z_mean           <= rankZMeanRange[1] &&
    d.z_pos            >= rankZPosRange[0]  && d.z_pos            <= rankZPosRange[1]  &&
    d.z_ang            >= rankZAngRange[0]  && d.z_ang            <= rankZAngRange[1]
  );

  display(paginatedTable({
    data: filtered,
    columns: [
      { key: "rank",             header: "#",             sortable: false,
        cellStyle: () => ({color: "#aaa"}) },
      { key: "display_id",       header: "ID",            sortable: false,
        cellStyle: () => ({fontFamily: "monospace", fontSize: "10px"}) },
      { key: "data_origin",      header: "Centro",        type: "category" },
      { key: "sex",              header: "Sexo",          type: "category" },
      { key: "pb_denticion",     header: "Dentición",     type: "category" },
      { key: "n_teeth",          header: "Dientes",       type: "number" },
      { key: "n_supernumeraries",header: "Supern.",       type: "number" },
      { key: "z_mean",           header: "z̄",             type: "number",
        format: d => d.toFixed(4),
        cellStyle: d => ({fontWeight: "600", color: d >= iqrExtreme ? "#c0392b" : "#e15759"}) },
      { key: "z_pos",            header: "z_pos",         type: "number", format: d => d.toFixed(4) },
      { key: "z_ang",            header: "z_ang",         type: "number", format: d => d.toFixed(4) },
      { key: "flags_str",        header: "Patologías",    sortable: false,
        cellStyle: () => ({color: "#888", fontSize: "11px"}) },
    ],
    pageSize: 10,
    onRowClick: d => setClickedIndividual(d),
  }));
}
```

## Distribución de z̄ — histograma poblacional

```js
display(htl.html`<p>Distribución de z̄ en las <strong>${zEligible.length.toLocaleString("es-AR")} dentaduras elegibles</strong>. Las barras rojas corresponden a los outliers (z̄ ≥ Q3 + 1.5·IQR = ${iqrThreshold.toFixed(3)}).</p>`);
```

<details>
<summary style="cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;">¿Cómo leer este gráfico?</summary>
<div style="padding:0.7rem 0.5rem 0.2rem;font-size:0.85rem;line-height:1.6;color:#444;">

El **eje X** es el score de tipicidad z̄: cuanto mayor, más atípica es la dentadura respecto a la población. El **eje Y** cuenta la cantidad de dentaduras en cada rango de z̄.

```js
display(htl.html`<ul>
  <li><strong>Barras azules</strong>: dentaduras en el rango "normal" (z̄ < ${iqrThreshold.toFixed(2)}).</li>
  <li><strong>Barras rojas</strong>: outliers moderados (z̄ ≥ Q3 + 1.5·IQR = ${iqrThreshold.toFixed(2)}).</li>
  <li><strong>Línea roja punteada</strong>: umbral moderado (${iqrThreshold.toFixed(3)}).</li>
  <li><strong>Línea roja sólida</strong>: umbral extremo (Q3 + 3·IQR = ${iqrExtreme.toFixed(3)}).</li>
</ul>`);
```

Usar "Zoom en cola" en las opciones de visualización para examinar en detalle la distribución de outliers.
</div>
</details>

```js
const zoomOutliersInput = Inputs.toggle({label: "Zoom en cola de outliers", value: false});
const zoomOutliers = Generators.input(zoomOutliersInput);
```

```js
{
  const vizDiv = document.createElement("details");
  vizDiv.style.cssText = "margin-bottom:8px;";
  const vizSum = document.createElement("summary");
  vizSum.style.cssText = "cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;";
  vizSum.textContent = "Opciones de visualización";
  vizDiv.appendChild(vizSum);
  const inner = document.createElement("div");
  inner.style.cssText = "padding:0.5rem 0.3rem 0.2rem;";
  inner.appendChild(zoomOutliersInput);
  vizDiv.appendChild(inner);
  display(vizDiv);
}
```

```js
{
  const xDomain = zoomOutliers
    ? [iqrThreshold - 0.3, d3.max(zEligible) + 0.1]
    : [0, d3.max(zEligible) + 0.1];
  display(Plot.plot({
    width: Math.min(width, 720),
    height: 300,
    marginBottom: 45,
    x: {label: "z̄ (score de tipicidad)", domain: xDomain},
    y: {label: "N° dentaduras"},
    color: {domain: ["Población", "Outliers (IQR)"], range: ["#4c78a8", "#e15759"], legend: true},
    marks: [
      Plot.rectY(
        individualsEnriched.filter(d => d.n_teeth >= 10 && d.z_mean != null),
        Plot.binX(
          {y: "count"},
          {x: "z_mean", fill: d => d.z_mean >= iqrThreshold ? "Outliers (IQR)" : "Población", thresholds: 60}
        )
      ),
      Plot.ruleX([iqrThreshold], {stroke: "#e15759", strokeDasharray: "5,3", strokeWidth: 1.5}),
      ...(iqrExtreme < d3.max(zEligible) ? [Plot.ruleX([iqrExtreme], {stroke: "#c0392b", strokeDasharray: "3,2", strokeWidth: 1})] : []),
    ],
  }));
}
```

```js
display(htl.html`<div style="border-left: 4px solid #54a24b; background: #f7fff7; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;"><strong>Hallazgo principal</strong> — La mayoría de los individuos son <strong>consistentemente típicos o consistentemente atípicos</strong> en posición y ángulo simultáneamente: la dentadura de un individuo tiende a ser globalmente regular o globalmente irregular, sin disociación marcada entre las dos dimensiones. Los outliers formales (z̄ ≥ Q3 + 1.5·IQR ≈ ${iqrThreshold.toFixed(2)}) se distribuyen sin concentración en ningún subgrupo clínico o demográfico particular.</div>`);
```
