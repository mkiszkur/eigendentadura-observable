---
title: Análisis de casos atípicos
---

# Análisis de casos atípicos

¿Qué hace a una dentadura "típica" o "atípica"? Esta sección analiza la distribución de la **tipicidad posicional y angular** en la población completa, identifica las dentaduras más y menos representativas, y permite visualizarlas sobre la eigendentadura.

**${individuals.length.toLocaleString("es-AR")} pantomografías** con z-scores calculados (posición y ángulo de cada diente relativo a la media poblacional).

```js
import {atipicalityScatter} from "./components/atipicality-scatter.js";
import {openPantoModal} from "./components/panto-modal.js";
import {collapsible} from "./components/collapsible.js";
import {rangeSlider} from "./components/range-slider.js";
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
{
  const clicked = clickedIndividual;
  if (clicked) {
    const id = extractGeoId(clicked.json_filename);
    if (id) {
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
      });
    }
  }
}
```

## Ranking de outliers — casos más atípicos

**Criterio**: z̄ ≥ Q3 + 1.5·IQR = **${iqrThreshold.toFixed(3)}** (Q1=${iqrQ1.toFixed(3)}, Q3=${iqrQ3.toFixed(3)}, IQR=${iqrVal.toFixed(3)}). Las **${sortedDesc.filter(d => d.z_mean >= iqrThreshold).length} dentaduras** que superan este umbral se consideran outliers. Hacé clic en una fila para ver la pantomografía.

```js
{
  const outliers = sortedDesc.filter(d => d.z_mean >= iqrThreshold);

  const container = d3.create("div").style("overflow-x", "auto");
  const table = container.append("table")
    .style("border-collapse", "collapse")
    .style("font-size", "12px")
    .style("width", "100%");

  table.append("thead").append("tr")
    .selectAll("th")
    .data(["#", "ID", "Centro", "Sexo", "Dientes", "z̄", "z_pos", "z_ang", "Patologías"])
    .join("th")
    .style("text-align", "left")
    .style("padding", "4px 8px")
    .style("border-bottom", "2px solid #eee")
    .style("color", "#888")
    .style("font-weight", "600")
    .style("white-space", "nowrap")
    .text(d => d);

  const tbody = table.append("tbody");
  tbody.selectAll("tr")
    .data(outliers)
    .join("tr")
    .style("cursor", "pointer")
    .style("border-bottom", "1px solid #f5f5f5")
    .on("click", (event, d) => setClickedIndividual(d))
    .on("mouseover", function() { d3.select(this).style("background", "#fdf5f5"); })
    .on("mouseout",  function() { d3.select(this).style("background", null); })
    .each(function(d, i) {
      const tr  = d3.select(this);
      const lvl = d.z_mean >= iqrExtreme ? "#c0392b" : "#e15759";
      tr.append("td").style("padding", "3px 8px").style("color", "#aaa").text(i + 1);
      tr.append("td").style("padding", "3px 8px").style("font-family", "monospace").style("font-size", "10px").text(simplifyFn(d.json_filename));
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.data_origin ?? "–");
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.sex ?? "–");
      tr.append("td").style("padding", "3px 8px").style("text-align", "right").text(d.n_teeth);
      tr.append("td").style("padding", "3px 8px").style("font-weight", "600").style("color", lvl).text(d.z_mean.toFixed(4));
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.z_pos.toFixed(4));
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.z_ang.toFixed(4));
      tr.append("td").style("padding", "3px 8px").style("color", "#888").style("font-size", "10px")
        .text(d.pb_flags ? Object.keys(d.pb_flags).join(", ") : "–");
    });

  display(container.node());
}
```

## Distribución de z̄ — histograma poblacional

Distribución de z̄ en las **${zEligible.length.toLocaleString("es-AR")} dentaduras elegibles**. Las barras rojas corresponden a los outliers (z̄ ≥ Q3 + 1.5·IQR = ${iqrThreshold.toFixed(3)}).

```js
const zoomOutliersInput = Inputs.toggle({label: "Zoom en cola de outliers", value: false});
const zoomOutliers = Generators.input(zoomOutliersInput);
display(zoomOutliersInput);
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

<small>Línea roja punteada = umbral moderado (Q3 + 1.5·IQR = ${iqrThreshold.toFixed(3)}). Línea roja sólida = umbral extremo (Q3 + 3·IQR = ${iqrExtreme.toFixed(3)}). Activar "Zoom en cola" para ver la distribución de outliers en detalle.</small>

<div style="border-left: 4px solid #54a24b; background: #f7fff7; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La mayoría de los individuos son <strong>consistentemente típicos o consistentemente atípicos</strong> en posición y ángulo simultáneamente: la dentadura de un individuo tiende a ser globalmente regular o globalmente irregular, sin disociación marcada entre las dos dimensiones. Los outliers formales (z̄ ≥ Q3 + 1.5·IQR ≈ ${iqrThreshold.toFixed(2)}) se distribuyen sin concentración en ningún subgrupo clínico o demográfico particular.
</div>
