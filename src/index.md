---
title: Eigendentadura — KDE Población
---


# Eigendentadura — KDE por pieza dental

Seleccioná uno o más dientes en el odontograma para ver su **Kernel Density Estimation 2D**
(mapa de calor) sobre las coordenadas landmark-normalized.

La eigendentadura (centroides medios de la población) se muestra como contexto.

<details>
<summary><strong>Universo de datos</strong> — ${metadata.total_teeth.toLocaleString()} dientes de ${metadata.unique_pantos.toLocaleString()} pantomografías <em>(clic para expandir)</em></summary>

Se incluyen todos los dientes permanentes (FDI 11–48) que cumplen simultáneamente:
1. Tienen el **número FDI anotado** por un revisor humano
2. Tienen **coordenadas landmark-normalized** disponibles (la pantomografía tiene landmarks condíleos completos)

No se restringe a dentaduras completas (32/32): cada diente aporta independientemente a la KDE de su pieza.
Coordenadas normalizadas por marco condíleo (origen = punto medio intercondíleo, escala = distancia intercondílea).

</details>

```js
import {odontograma} from "./components/odontograma.js";
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
import {kdePlot} from "./components/kde-plot.js";
import {boxplot2dPlot} from "./components/boxplot-2d.js";
import {rosePlot} from "./components/rose-plot.js";
import {radarAngularPlot} from "./components/radar-angular.js";
import {symmetryOverlay, symmetryBoxplot, mirrorFdi} from "./components/symmetry-plot.js";
import {archForm, computeArchMetrics} from "./components/arch-form.js";
import {prevalenceOdontogram, prevalenceLegend} from "./components/prevalence-odontogram.js";
import {occlusionHistograms, occlusionScatter} from "./components/occlusion.js";
import {boltonHistograms} from "./components/bolton.js";
import {angleRose, angleRoseGrid} from "./components/angle-rose.js";
import {summaryCards, computeSummary, tocNav} from "./components/summary-cards.js";
import {quadrantOverlay} from "./components/quadrant-overlay.js";
import * as d3 from "d3";
```

```js
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const kdeGrids = await FileAttachment("data/kde_grids.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
const boxplotStats = await FileAttachment("data/tooth_boxplot_stats.json").json();
const typicalityExtremes = await FileAttachment("data/typicality_extremes.json").json();
const angleHistograms = await FileAttachment("data/tooth_angle_histograms.json").json();
const symmetryData = await FileAttachment("data/symmetry_pairs.json").json();
const occlusionData = await FileAttachment("data/occlusion.json").json();
const boltonData = await FileAttachment("data/bolton.json").json();
const prevalenceData = await FileAttachment("data/prevalence_by_tooth.json").json();
```

```js
const ALL_FDI = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
                 48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

const selectedFdi = Mutable([11]);

function toggleTooth(fdi) {
  const current = selectedFdi.value;
  const idx = current.indexOf(fdi);
  if (idx >= 0) {
    selectedFdi.value = current.filter(f => f !== fdi);
  } else {
    selectedFdi.value = [...current, fdi];
  }
}
function setSelection(fdis) { selectedFdi.value = fdis; }
```

## Resumen ejecutivo

<details>
<summary>Cómo leer este gráfico</summary>

Cada tarjeta resume una dimensión distinta de la población:
- **Muestra** — cantidad de pantomografías y dientes incluidos.
- **Salud bucal** — prevalencia agregada de las patologías anotadas.
- **Simetría** — asimetría mediana entre pares homólogos izquierdo/derecho.
- **Geometría** — forma y medidas clínicas medias de las arcadas.
- **Oclusión** — valores medianos de overjet y overbite poblacional.

Las tarjetas son un punto de entrada rápido; cada sección inferior profundiza en cada tema.

</details>

```js
const summary = computeSummary({metadata, prevalenceData, symmetryData, occlusionData, toothStats});
display(summaryCards({summary}));
```

```js
display(tocNav({sections: [
  {id: "mapa-de-densidad-kde",                       label: "KDE"},
  {id: "estadisticas-de-los-dientes-seleccionados",  label: "Estadísticas"},
  {id: "boxplots-2-d-dispersion-posicional",         label: "Boxplots 2D"},
  {id: "distribucion-angular-por-diente",            label: "Ángulos"},
  {id: "radar-dispersion-angular-por-diente",        label: "Radar"},
  {id: "dentaduras-tipicas-y-atipicas",              label: "Típicas/atípicas"},
  {id: "forma-de-arcada",                            label: "Arcada"},
  {id: "prevalencia-de-patologias-por-diente",       label: "Patologías"},
  {id: "overbite-y-overjet-proxy-poblacional",       label: "Overbite/overjet"},
  {id: "indice-de-bolton",                           label: "Bolton"},
  {id: "simetria-bilateral",                         label: "Simetría"},
  {id: "overlay-de-los-4-cuadrantes",                label: "Overlay 4Q"},
]}));
```

---

## Mapa de densidad (KDE)

<details>
<summary>Cómo leer este gráfico</summary>

Seleccioná uno o más dientes en el odontograma para ver su distribución espacial en la población.

- **Contornos KDE** — isodensidades: cada capa corresponde a un nivel de densidad de probabilidad. Las zonas más oscuras/saturadas concentran más centroides dentales.
- **Elipses ±1σ / ±2σ** — contorno gaussiano equivalente: la elipse sólida abarca ~68 % de los casos y la punteada ~95 %.
- **Puntos grises** — eigendentadura: posición media de cada diente en la población.
- **Modo de visualización** — KDE equidistante (capas uniformes de densidad), Regiones HDR al 25/50/95 %, Solo elipses (±1σ/±2σ), o KDE + elipses combinado.
- **Contornos** — en modo KDE: equidistantes (muchas capas), 1σ·2σ (2 isolíneas estadísticas), o 1σ·2σ·3σ.
- **Densidad mínima** — recorta el "halo" tenue alrededor del núcleo; aplica solo al modo equidistante.
- **γ (gamma)** — contraste: γ > 1 resalta los picos de densidad; aplica solo al modo equidistante.

Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

<details open>
<summary>Odontograma</summary>

Hacé clic en los dientes para seleccionar/deseleccionar. Los dientes seleccionados se muestran con color.

```js
display(teethSelector({
  selected: selectedFdi,
  onToggle: toggleTooth,
  onSetSelection: setSelection,
  fdiNombres: metadata.fdi_nombres,
}));
```

</details>

```js
const minThresholdInput = Inputs.number({value: 0.05, step: 0.01, min: 0, max: 0.99, label: "Densidad mínima visible"});
const minThreshold = Generators.input(minThresholdInput);
const gammaInput = Inputs.range([0.3, 3], {value: 1, step: 0.1, label: "γ (contraste capas)"});
const gamma = Generators.input(gammaInput);
const displayModeInput = Inputs.select(
  ["kde_std", "kde", "elipses", "hdr"],
  {label: "Modo", value: "kde_std",
   format: d => ({"kde_std": "KDE estándar", kde: "KDE (contornos)", elipses: "Solo elipses σ", hdr: "Regiones HDR (25/50/95%)"})[d]}
);
const displayMode = Generators.input(displayModeInput);
const contoursModeInput = Inputs.select(
  ["equi", "sigma12", "sigma123"],
  {label: "Niveles KDE", value: "equi",
   format: d => ({equi: "Equidistantes", sigma12: "1σ · 2σ", sigma123: "1σ · 2σ · 3σ"})[d]}
);
const contoursMode = Generators.input(contoursModeInput);
const showCentroidsInput = Inputs.toggle({label: "Centroides", value: true});
const showCentroids = Generators.input(showCentroidsInput);
```

```js
display(html`<div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap; padding:6px 0 4px;">
  ${displayModeInput}${displayMode === "kde" ? contoursModeInput : ""}${showCentroidsInput}
</div>
${displayMode === "kde_std" ? html`<div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap; padding:2px 0 6px;">
  ${minThresholdInput}${gammaInput}
</div>` : ""}`);
```

```js
const plot = kdePlot({
  selectedFdi: selectedFdi,
  kdeGrids: kdeGrids,
  toothStats: toothStats,
  width: 800,
  height: 550,
  gamma: gamma,
  minThreshold: minThreshold,
  displayMode: displayMode,
  contoursMode: contoursMode,
  showCentroids: showCentroids,
});
display(plot);
```

## Estadísticas de los dientes seleccionados

<details>
<summary>Cómo leer esta tabla</summary>

Cada fila corresponde a un diente seleccionado en el odontograma.

- **μ X / μ Y** — posición media del centroide en coordenadas landmark-normalized (divididas por la distancia intercondílea). El origen es el punto medio intercondíleo.
- **σ X / σ Y** — desvío estándar de las posiciones individuales: mide cuánto varía la ubicación de ese diente entre pacientes.
- **μ ángulo** — ángulo medio del eje principal del diente en grados (0° = horizontal, 90° = vertical).
- **σ ángulo** — dispersión angular entre pacientes.

Valores más grandes de σ indican mayor variabilidad posicional o angular de esa pieza en la población.

</details>

Los valores corresponden a las **coordenadas landmark-normalized** originales
(no z-scores): X e Y están en el rango aproximado [-1, 1] respecto al centro
del marco dentario, y el ángulo está en radianes.

```js
const selectedSet2 = new Set(selectedFdi);
const selectedStats = toothStats.filter(s => selectedSet2.has(s.fdi));
```

```js
if (selectedStats.length > 0) {
  const nMin = d3.min(selectedStats, s => s.n);
  const nMax = d3.max(selectedStats, s => s.n);
  display(html`<p style="color:#555; font-size:13px;">
    Mostrando <strong>${selectedStats.length}</strong> pieza(s).
    Muestras por pieza: entre <strong>${nMin.toLocaleString()}</strong> y <strong>${nMax.toLocaleString()}</strong> dientes.
  </p>`);
}
```

```js
display(Inputs.table(selectedStats, {
  columns: ["fdi", "n", "mean_x", "mean_y", "std_x", "std_y", "mean_angle", "std_angle"],
  header: {
    fdi: "FDI",
    n: "N",
    mean_x: "μ X",
    mean_y: "μ Y",
    std_x: "σ X",
    std_y: "σ Y",
    mean_angle: "μ ángulo",
    std_angle: "σ ángulo",
  },
  format: {
    mean_x: d3.format(".4f"),
    mean_y: d3.format(".4f"),
    std_x: d3.format(".4f"),
    std_y: d3.format(".4f"),
    mean_angle: d3.format(".1f"),
    std_angle: d3.format(".1f"),
  },
}));
```

---

## Boxplots 2D — Dispersión posicional

<details>
<summary>Cómo leer este gráfico</summary>

Cada diente se muestra como una caja 2D en su posición anatómica media.

- **Rectángulo central** — rango intercuartílico (Q1–Q3) en ambas coordenadas X e Y simultáneamente. Un rectángulo grande indica alta variabilidad posicional.
- **Bigotes** — se extienden a 1.5 × IQR en cada dimensión.
- **Punto central** — mediana 2D.
- **Arcos angulares** (opcional) — distribución del ángulo del eje principal del diente; el radio es la frecuencia.

Colores por cuadrante: azul = Q1 (sup. der.), verde = Q2 (sup. izq.), amarillo = Q3 (inf. izq.), rojo = Q4 (inf. der.).

</details>

Cada rectángulo representa el rango intercuartílico (IQR) de un diente en X e Y.
Los bigotes se extienden a 1.5×IQR. El punto central es la mediana.
Los dientes seleccionados en el odontograma se resaltan.

```js
const showAngleArcs = view(Inputs.toggle({label: "Mostrar dispersión angular", value: false}));
```

```js
display(boxplot2dPlot({
  boxplotStats,
  selectedFdi: selectedFdi,
  showAngleArcs,
  width: width,
  height: 550,
}));
```

```js
const selectedBoxplotStats = boxplotStats.filter(s => new Set(selectedFdi).has(s.fdi));
```

```js
if (selectedBoxplotStats.length > 0) {
  display(html`<p style="color:#555; font-size:13px;">
    Mostrando <strong>${selectedBoxplotStats.length}</strong> pieza(s).
  </p>`);
}
```

```js
display(Inputs.table(selectedBoxplotStats, {
  columns: ["fdi", "n", "wlo_x", "q1_x", "med_x", "q3_x", "whi_x", "wlo_y", "q1_y", "med_y", "q3_y", "whi_y"],
  header: {
    fdi: "FDI",
    n: "N",
    wlo_x: "Wlo X",
    q1_x: "Q1 X",
    med_x: "Med X",
    q3_x: "Q3 X",
    whi_x: "Whi X",
    wlo_y: "Wlo Y",
    q1_y: "Q1 Y",
    med_y: "Med Y",
    q3_y: "Q3 Y",
    whi_y: "Whi Y",
  },
  format: {
    med_x: d3.format(".4f"),
    q1_x: d3.format(".4f"),
    q3_x: d3.format(".4f"),
    wlo_x: d3.format(".4f"),
    whi_x: d3.format(".4f"),
    med_y: d3.format(".4f"),
    q1_y: d3.format(".4f"),
    q3_y: d3.format(".4f"),
    wlo_y: d3.format(".4f"),
    whi_y: d3.format(".4f"),
  },
}));
```

---

## Distribución angular por diente

<details>
<summary>Cómo leer este gráfico</summary>

Cada diente aparece en su posición anatómica media con una **mini-rosa polar** superpuesta.

- **Pétalos** — frecuencia de ángulos en bins de 5°. Pétalos más largos = más casos con ese ángulo.
- **Línea radial** — ángulo medio de la pieza en la población.
- **0° / 90°** — horizontal / vertical en el sistema de coordenadas landmark-normalized.

**Hacé clic en cualquier diente** para ver su rosa polar ampliada con el rango ±1σ y la grilla radial en counts.

Los dientes seleccionados en el odontograma aparecen resaltados.

</details>

**Mapa global** — Cada diente aparece en su posición anatómica media con
una mini-rosa polar: los pétalos son la frecuencia de ángulos en bins de 5°,
la línea radial indica la media. Los dientes seleccionados se resaltan.
**Hacé click en un diente** para ver su distribución angular ampliada en detalle.

```js
// Modal imperativo: lo insertamos/removemos directamente del body.
const showAngleModal = (fdi) => {
  // Cerrar cualquier modal previo
  document.querySelectorAll("[data-angle-modal]").forEach(el => el.remove());
  const record = angleHistograms.find(r => r.fdi === fdi);
  if (!record) return;

  const overlay = document.createElement("div");
  overlay.dataset.angleModal = "1";
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,.45)",
    zIndex: "1000", display: "flex", alignItems: "center", justifyContent: "center",
  });
  const close = () => overlay.remove();

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    background: "white", borderRadius: "8px", padding: "18px 22px",
    boxShadow: "0 8px 28px rgba(0,0,0,.25)", maxWidth: "520px",
    fontFamily: "var(--sans-serif, system-ui, sans-serif)",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"});
  const title = document.createElement("strong");
  title.style.fontSize = "15px";
  title.textContent = `Distribución angular — FDI ${fdi}`;
  const btn = document.createElement("button");
  btn.textContent = "✕ Cerrar";
  Object.assign(btn.style, {border: "none", background: "#eee", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "13px"});
  btn.addEventListener("click", close);
  header.append(title, btn);

  const hint = document.createElement("div");
  Object.assign(hint.style, {color: "#666", fontSize: "11px", marginBottom: "10px"});
  hint.textContent = "Línea radial negra = ángulo medio. Arco externo = ±1 σ. Grilla radial en counts.";

  panel.append(header, hint, angleRose({record, size: 380}));
  overlay.append(panel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.body.append(overlay);
};
```

```js
display(rosePlot({
  angleHistograms,
  toothStats,
  selectedFdi: selectedFdi,
  onToothClick: showAngleModal,
  width: width,
  height: 600,
}));
```

---

## Radar — Dispersión angular por diente

<details>
<summary>Cómo leer este gráfico</summary>

Los 32 dientes (o los presentes en la muestra) se disponen en orden anatómico alrededor del centro.

- **Radio** — magnitud de la dispersión angular de cada pieza entre pacientes. Cuanto más alejado del centro, mayor es la variabilidad de orientación de ese diente.
- **Métrica seleccionable** — IQR (rango intercuartílico Q3−Q1), desvío estándar, o rango de bigotes. El IQR es más robusto a valores extremos.

Las piezas con mayor radio son las que presentan mayor variabilidad en su eje de orientación entre distintos individuos de la muestra.

</details>

Los 32 dientes dispuestos en orden anatómico. El radio representa la dispersión angular de cada pieza.

```js
const radarMetric = view(Inputs.select(
  ["iqr", "std", "whisker_range"],
  {label: "Métrica", format: d => d === "iqr" ? "IQR (Q3−Q1)" : d === "std" ? "Desviación estándar" : "Rango whisker (whi−wlo)", value: "iqr"}
));
```

```js
display(radarAngularPlot({
  boxplotStats,
  toothStats,
  selectedFdi: selectedFdi,
  metric: radarMetric,
  width: Math.min(width, 650),
  height: Math.min(width, 650),
}));
```

---

## Dentaduras típicas y atípicas

<details>
<summary>Cómo leer este gráfico</summary>

Seleccioná una dentadura típica (◆) y/o atípica (✕) en los combos para visualizarla sobre la eigendentadura (puntos grises).

- **◆ Verde** — dentadura típica: sus dientes se ubican cerca del promedio poblacional (z̄ bajo).
- **✕ Rojo** — dentadura atípica: uno o más dientes se desvían notablemente del promedio (z̄ alto).
- **Flechas** — desvío angular de cada diente respecto a la media poblacional. La flecha apunta "hacia arriba" cuando el ángulo coincide con el promedio; se inclina según la diferencia angular.
- **z̄** — promedio de la distancia z estandarizada por pieza: mide qué tan lejos está cada diente del centroide medio de su posición esperada.

Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

Dentaduras individuales ordenadas por su score de tipicidad (z̄: promedio de la distancia z por diente).
Se muestran las **${typicalityExtremes.n_extremes} más típicas** (menor z̄) y las **${typicalityExtremes.n_extremes} más atípicas** (mayor z̄), de un total de ${typicalityExtremes.total_eligible.toLocaleString()} dentaduras con ≥${typicalityExtremes.min_teeth} dientes.

Seleccioná una dentadura típica y/o atípica en los combos para visualizarla sobre la eigendentadura.

```js
const fmt4 = d3.format(".4f");

function simplifyFilename(fn) {
  return fn.replace(/^database_original__/, "").replace(/__json_url\.json$/, "").replace(/\.json$/, "");
}

const typicalOptions = typicalityExtremes.typical.map(d => ({
  label: `#${d.rank} — ${simplifyFilename(d.json_filename)} (${d.n_teeth} dientes, z̄=${d.z_mean.toFixed(4)})`,
  value: d,
}));
const atypicalOptions = typicalityExtremes.atypical.map(d => ({
  label: `#${d.rank} — ${simplifyFilename(d.json_filename)} (${d.n_teeth} dientes, z̄=${d.z_mean.toFixed(4)})`,
  value: d,
}));
```

```js
const selectedTypical = view(Inputs.select([null, ...typicalOptions], {
  label: "◆ Típica",
  format: d => d === null ? "(ninguna)" : d.label,
  value: null,
}));
```

```js
const selectedAtypical = view(Inputs.select([null, ...atypicalOptions], {
  label: "✕ Atípica",
  format: d => d === null ? "(ninguna)" : d.label,
  value: null,
}));
```

```js
{
  const parts = [];
  if (selectedTypical?.value?.json_filename) parts.push(html`<span>◆ <code style="user-select:all; cursor:text;">${simplifyFilename(selectedTypical.value.json_filename)}</code></span>`);
  if (selectedAtypical?.value?.json_filename) parts.push(html`<span>✕ <code style="user-select:all; cursor:text;">${simplifyFilename(selectedAtypical.value.json_filename)}</code></span>`);
  if (parts.length) display(html`<div style="font-size:12px; color:#666; display:flex; gap:20px;">${parts}</div>`);
}
```

```js
function typicalityPlot({toothStats, selectedTypical, selectedAtypical, width = 800, height = 550} = {}) {
  const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  svg.append("defs").append("clipPath")
    .attr("id", "typ-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");
  const gClip = gOuter.append("g").attr("clip-path", "url(#typ-clip)");
  const g = gClip.append("g");

  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const pad = 0.3;
  const xScale0 = d3.scaleLinear().domain([d3.min(xs) - pad, d3.max(xs) + pad]).range([0, innerW]);
  const yScale0 = d3.scaleLinear().domain([d3.min(ys) - pad, d3.max(ys) + pad]).range([0, innerH]);
  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  gOuter.append("text").attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11).text("X (landmark-normalized)");
  gOuter.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11).text("Y (landmark-normalized)");

  function draw(k = 1) {
    g.selectAll("*").remove();

    // Arrow length in pixels (scales with zoom)
    const arrowLen = Math.max(12, 12 * Math.min(k, 6));

    // Eigendentadura context (grey centroids + upward arrows = 0 deviation)
    for (const s of toothStats) {
      const cx = xScale(s.mean_x);
      const cy = yScale(s.mean_y);
      g.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", Math.max(3, 3 * Math.min(k, 6)))
        .attr("fill", "#ddd")
        .attr("stroke", "#bbb")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.6);
      // Upward arrow (no deviation) — points "north" in screen coords
      g.append("line")
        .attr("x1", cx).attr("y1", cy)
        .attr("x2", cx).attr("y2", cy - arrowLen)
        .attr("stroke", "#ccc").attr("stroke-width", 1.5)
        .attr("opacity", 0.5);
      g.append("text")
        .attr("x", cx)
        .attr("y", cy - arrowLen - 3)
        .attr("text-anchor", "middle")
        .attr("font-size", Math.max(8, 8 * Math.min(k, 4)))
        .attr("fill", "#ccc")
        .text(String(s.fdi));
    }

    // Build lookup: FDI → mean_angle (degrees)
    const angleMeanByFdi = {};
    for (const s of toothStats) angleMeanByFdi[s.fdi] = s.mean_angle;

    // Draw individual's teeth with rotation arrows
    function drawIndividual(record, marker) {
      if (!record) return;
      const color = marker === "typical" ? "#2a7f62" : "#c0392b";
      for (const t of record.teeth) {
        const cx = xScale(t.cx);
        const cy = yScale(t.cy);
        const r = Math.max(4, 4 * Math.min(k, 4));
        if (marker === "typical") {
          // Diamond ◆
          const d = r * 1.2;
          g.append("path")
            .attr("d", `M${cx},${cy - d}L${cx + d},${cy}L${cx},${cy + d}L${cx - d},${cy}Z`)
            .attr("fill", color)
            .attr("stroke", "#333")
            .attr("stroke-width", 1)
            .attr("opacity", 0.85);
        } else {
          // Cross ✕
          const d = r;
          g.append("path")
            .attr("d", `M${cx - d},${cy - d}L${cx + d},${cy + d}M${cx + d},${cy - d}L${cx - d},${cy + d}`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2.5)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0.85);
        }

        // Rotation arrow: deviation from population mean
        if (t.angle != null && angleMeanByFdi[t.fdi] != null) {
          // deltaAngle in degrees: positive = clockwise deviation
          const deltaAngle = t.angle - angleMeanByFdi[t.fdi];
          // Convert to radians; arrow points "up" (−π/2) when delta=0
          // then rotates by delta (in screen coords, CW = positive)
          const rad = (-Math.PI / 2) + (deltaAngle * Math.PI / 180);
          const ax = cx + arrowLen * Math.cos(rad);
          const ay = cy + arrowLen * Math.sin(rad);
          // Arrow shaft
          g.append("line")
            .attr("x1", cx).attr("y1", cy)
            .attr("x2", ax).attr("y2", ay)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("opacity", 0.7);
          // Arrowhead
          const headLen = Math.max(4, 4 * Math.min(k, 4));
          const headAngle = 0.5; // ~28 degrees
          g.append("path")
            .attr("d", `M${ax},${ay}` +
              `L${ax - headLen * Math.cos(rad - headAngle)},${ay - headLen * Math.sin(rad - headAngle)}` +
              `M${ax},${ay}` +
              `L${ax - headLen * Math.cos(rad + headAngle)},${ay - headLen * Math.sin(rad + headAngle)}`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0.7);
        }

        // FDI label
        g.append("text")
          .attr("x", cx)
          .attr("y", cy - r - 3)
          .attr("text-anchor", "middle")
          .attr("font-size", Math.max(9, 9 * Math.min(k, 3)))
          .attr("font-weight", "bold")
          .attr("fill", color)
          .text(String(t.fdi));
      }
    }

    drawIndividual(selectedTypical, "typical");
    drawIndividual(selectedAtypical, "atypical");

    if (!selectedTypical && !selectedAtypical) {
      g.append("text").attr("x", innerW / 2).attr("y", innerH / 2)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#999")
        .text("Seleccioná una dentadura en los combos de arriba ↑");
    }

    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(8));
  }

  const zoom = d3.zoom().scaleExtent([1, 40]).on("zoom", (event) => {
    xScale = event.transform.rescaleX(xScale0);
    yScale = event.transform.rescaleY(yScale0);
    draw(event.transform.k);
  });
  gOuter.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "none").attr("pointer-events", "all")
    .call(zoom)
    .on("dblclick.zoom", () => {
      gOuter.select("rect").transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

  draw();

  gOuter.append("text").attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}

display(typicalityPlot({toothStats, selectedTypical: selectedTypical?.value ?? null, selectedAtypical: selectedAtypical?.value ?? null, width, height: 550}));
```

```js
display(html`<div style="display:flex; gap:20px; align-items:center; margin: 4px 0 8px 0;">
  <span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><path d="M7,1 L13,7 L7,13 L1,7Z" fill="#2a7f62" stroke="#333" stroke-width="0.8"/></svg>
    <span style="font-size:13px;">Típica</span>
  </span>
  <span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><path d="M2,2 L12,12 M12,2 L2,12" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/></svg>
    <span style="font-size:13px;">Atípica</span>
  </span>
  <span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#ddd" stroke="#bbb" stroke-width="0.8"/></svg>
    <span style="font-size:13px;">Eigendentadura (media poblacional)</span>
  </span>
  <span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><line x1="7" y1="12" x2="7" y2="2" stroke="#888" stroke-width="2"/><path d="M7,2 L4,6 M7,2 L10,6" stroke="#888" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span style="font-size:13px;">↑ Rotación (desvío vs media)</span>
  </span>
</div>`);
```

---

---

## Forma de arcada

<details>
<summary>Cómo leer este gráfico</summary>

Spline suave (Catmull–Rom) pasando por los centroides medios de cada arcada.

- **Línea azul** — arcada maxilar (superior). **Línea roja** — arcada mandibular (inferior).
- **Forma de arcada** (entre paréntesis en la leyenda) — clasificación según ratio *profundidad / ancho intermolar*: **Cuadrada** (< 0.70), **Ovalada** (0.70–0.85), **Triangular** (> 0.85).
- **Líneas de medición punteadas** (si están activas) — cada color corresponde a una medida clínica. Los valores numéricos aparecen en la leyenda de la esquina superior derecha:
  - <span style="color:#7C3AED">■</span> **intercanino sup** (13↔23) · <span style="color:#D97706">■</span> **intermolar sup** (16↔26)
  - <span style="color:#059669">■</span> **intercanino inf** (43↔33) · <span style="color:#DB2777">■</span> **intermolar inf** (46↔36)
- **Puntos de medición** (si están activos) — anillos de colores sobre los 8 dientes usados como puntos de referencia.

</details>

Spline suave (Catmull–Rom) pasando por los centroides medios de cada arcada.
Reporta medidas ortodónticas clásicas:
**ancho intercanino** (13↔23 / 43↔33), **ancho intermolar** (16↔26 / 46↔36)
y **profundidad de arco** (distancia del plano intermolar al borde incisal medio).

La forma se clasifica aproximadamente con la razón *profundidad / ancho intermolar*:
**Cuadrada** (< 0.70 — más ancha que larga), **Ovalada** (0.70–0.85),
**Triangular** (> 0.85 — más larga que ancha).

```js
const archMetrics = computeArchMetrics(toothStats);
```

```js
const showMeasurementsArch = view(Inputs.toggle({label: "Líneas de medición", value: true}));
const showArchLabels = view(Inputs.toggle({label: "Etiquetas inline", value: false}));
const showMeasurePts = view(Inputs.toggle({label: "Puntos de medición", value: false}));
```

```js
display(archForm({
  toothStats,
  selectedFdi: selectedFdi,
  showMeasurements: showMeasurementsArch,
  showLabels: showArchLabels,
  showMeasurePoints: showMeasurePts,
  width: Math.min(width, 900),
  height: 520,
}));
```

```js
const archRows = [
  {Arcada: "Maxilar (superior)",    ...archMetrics.maxilar},
  {Arcada: "Mandibular (inferior)", ...archMetrics.mandibular},
].map(r => ({
  "Arcada": r.Arcada,
  "Ancho intercanino": r.intercanine,
  "Ancho intermolar": r.intermolar,
  "Profundidad": r.depth,
  "Ratio prof/ancho": r.ratio,
  "Forma": r.shape,
}));
display(Inputs.table(archRows, {
  format: {
    "Ancho intercanino": d3.format(".4f"),
    "Ancho intermolar": d3.format(".4f"),
    "Profundidad": d3.format(".4f"),
    "Ratio prof/ancho": d3.format(".3f"),
  },
}));
```

---

## Prevalencia de patologías por diente

<details>
<summary>Cómo leer este gráfico</summary>

El odontograma muestra los 32 dientes organizados por cuadrante. Cada celda se colorea según la prevalencia de la patología seleccionada.

- **Color más saturado** — mayor porcentaje de dentaduras con ese diente afectado.
- **Número pequeño** — fracción *casos / dientes presentes*: el denominador varía por pieza ya que no todas están en todas las dentaduras.
- **Escala** — se reajusta por patología para resaltar el patrón espacial; no compares intensidades entre patologías distintas.
- **Ranking inferior** — lista los FDI de mayor a menor prevalencia para la patología activa.

Seleccioná dientes en el odontograma superior (sección KDE) para resaltarlos aquí también.

</details>

Cada celda representa un diente (código FDI) y se colorea según el
**porcentaje de dentaduras de la muestra en las que ese diente
presenta la patología seleccionada**. La escala se reajusta por patología
para resaltar el patrón espacial aunque las prevalencias absolutas sean bajas.

```js
const pathology = view(Inputs.select(prevalenceData.pathologies, {
  label: "Patología",
  value: "Restauración",
}));
```

```js
display(prevalenceLegend({prevalenceData, pathology, width: 360}));
display(prevalenceOdontogram({
  prevalenceData,
  pathology,
  selectedFdi,
  width: Math.min(width, 1400),
  cellW: 62,
  cellH: 78,
}));
display(html`<div style="color:#666;font-size:11px;margin-top:6px">
  n = ${prevalenceData.n_dentitions} dentaduras. El número chico en cada
  celda indica <em>dientes con la patología / dientes presentes en la muestra</em>.
</div>`);
```

### Ranking por prevalencia (patología activa)

```js
const rankRows = [...prevalenceData.teeth]
  .map(t => ({
    FDI: t.fdi,
    "Dientes presentes": t.n_present,
    "Con patología": t[pathology].count,
    "Prevalencia": t[pathology].prevalence,
  }))
  .sort((a, b) => b["Prevalencia"] - a["Prevalencia"]);
display(Inputs.table(rankRows, {
  format: {
    "Prevalencia": d => `${(d * 100).toFixed(2)}%`,
  },
  rows: 10,
}));
```

---

## Overbite y overjet (proxy poblacional)

<details>
<summary>Cómo leer este gráfico</summary>

Ambas métricas se calculan a partir de los **centroides 2D** de los incisivos centrales (11/21 superiores, 41/31 inferiores). No son mediciones clínicas en milímetros desde bordes incisales; son **proxies poblacionales** en unidades landmark-normalized.

- **Overjet** — distancia horizontal |Δx| entre el centroide medio de los incisivos superiores e inferiores. Mide el resalte horizontal.
- **Overbite** — diferencia vertical Δy entre superiores e inferiores. Mide el resalte vertical.
- **Histogramas** — distribución poblacional de cada métrica con líneas de referencia para la mediana.
- **Diagrama de dispersión** — cada punto es una dentadura. La cruz negra marca la mediana poblacional; puntos alejados tienen oclusiones atípicas.

Por basarse en centroides 2D, estos valores son útiles para comparar dentaduras *dentro del dataset*, pero no equivalen a las medidas clínicas estándar.

</details>

Medidas clásicas de oclusión calculadas a partir de los **centroides de los incisivos centrales**
(11/21 superiores, 41/31 inferiores) en coordenadas *landmark-normalized*:

- **Overjet** = |Δx| entre el centroide medio de los superiores y el de los inferiores
  (cuánto sobresalen horizontalmente unos respecto de otros).
- **Overbite** = Δy entre superiores e inferiores (separación vertical media de los
  incisivos opuestos).

Por estar basados en centroides 2D (y no en bordes incisales reales),
estas son **proxies poblacionales** útiles para comparar dentaduras entre sí,
no medidas clínicas en milímetros. n = ${occlusionData.n_dentitions} dentaduras
con los 4 incisivos presentes.

```js
display(occlusionHistograms({occlusionData, width: Math.min(width, 1000)}));
```

### Diagrama poblacional (overjet vs overbite)

Cada punto = una dentadura. La cruz negra marca la mediana poblacional;
dentaduras lejos del centro tienen oclusiones atípicas.

```js
display(occlusionScatter({
  occlusionData,
  width: Math.min(width, 720),
  height: 460,
}));
```

```js
const occRows = [
  {Métrica: "Overjet (|Δx|)",  ...occlusionData.stats.overjet},
  {Métrica: "Overbite (Δy)",   ...occlusionData.stats.overbite},
];
display(Inputs.table(occRows, {
  format: {
    mean:   d3.format(".4f"), std:    d3.format(".4f"),
    median: d3.format(".4f"), q1:     d3.format(".4f"), q3: d3.format(".4f"),
    p05:    d3.format(".4f"), p95:    d3.format(".4f"),
    min:    d3.format(".4f"), max:    d3.format(".4f"),
  },
}));
```

---

## Índice de Bolton

<details>
<summary>Cómo leer este gráfico</summary>

El índice de Bolton mide si los dientes mandibulares y maxilares de un paciente están en proporción equilibrada para el cierre oclusal.

- **Anterior** = 100 × Σ MD(43–33) / Σ MD(13–23) — norma clínica **77.2 ± 1.65**
- **Overall** = 100 × Σ MD(46–36) / Σ MD(16–26) — norma clínica **91.3 ± 1.91**
- **Banda verde** — rango clínicamente aceptable (± 1 SD de la norma de Bolton).
- **Línea verde** — media de Bolton; **línea negra punteada** — mediana del dataset.
- Valores fuera de la banda sugieren discrepancia maxilo-mandibular que podría requerir compensación ortodóntica.

El ancho mesiodistal (MD) se aproxima por el **lado corto del rectángulo de área mínima** (minbbox) del polígono de segmentación. Es una aproximación 2D, no una medición con calibrador.

</details>

**Pregunta clínica**: ¿las piezas mandibulares y maxilares de cada paciente están en proporción equilibrada para el cierre oclusal? Bolton (1958/1962) definió dos relaciones porcentuales que se aceptan como referencia ortodóntica:

- **Anterior** = `100 × Σ MD(43–33) / Σ MD(13–23)` — norma **77.2 ± 1.65**
- **Overall**  = `100 × Σ MD(46–36) / Σ MD(16–26)` — norma **91.3 ± 1.91**

El ancho mesiodistal (MD) de cada diente se aproxima por el **lado corto del minbbox** (rectángulo de área mínima sobre el polígono de segmentación). En la vista panorámica el eje mayor del minbbox sigue el eje oclusogingival, por lo que el lado corto aproxima la dimensión MD. Es una **aproximación 2D**, no una medición clínica con calibrador.

La banda verde marca el rango clínicamente aceptable (± 1 SD de la norma); la línea verde la media de Bolton; la línea negra punteada la mediana observada en el dataset.

```js
display(boltonHistograms({boltonData, width: Math.min(width, 1000)}));
```

```js
const boltRows = [
  {Métrica: "Anterior (43–33 / 13–23)", n: boltonData.eligibility.anterior, ...boltonData.stats.anterior, norma: `${boltonData.norms.anterior.mean} ± ${boltonData.norms.anterior.std}`},
  {Métrica: "Overall (46–36 / 16–26)",  n: boltonData.eligibility.overall,  ...boltonData.stats.overall,  norma: `${boltonData.norms.overall.mean} ± ${boltonData.norms.overall.std}`},
];
display(Inputs.table(boltRows, {
  format: {
    mean: d3.format(".2f"), std: d3.format(".2f"),
    median: d3.format(".2f"), q1: d3.format(".2f"), q3: d3.format(".2f"),
    p05: d3.format(".2f"), p95: d3.format(".2f"),
    min: d3.format(".2f"), max: d3.format(".2f"),
  },
}));
```

---

## Simetría bilateral

<details>
<summary>Cómo leer este gráfico</summary>

Para cada par homólogo (ej. 16↔26) se analizan solo las dentaduras que tienen ambos dientes presentes, midiendo la asimetría **por dentadura** (análisis pareado).

- **Boxplots** — la caja muestra el IQR (Q1–Q3) de la distancia de asimetría por dentadura; los bigotes llegan a P5–P95. El `n` sobre la caja es la cantidad de dentaduras con el par completo.
- **Overlay** — los puntos azules son el diente del lado izquierdo en su posición mediana pareada; los naranjas son el homólogo derecho **reflejado** contra el plano sagital. Si ambos coinciden, la población es perfectamente simétrica para ese par.
- **Largo y color de la línea** entre puntos del overlay — magnitud de la asimetría mediana del par.

Los 3 pares con mayor asimetría se etiquetan en el overlay.

</details>

**Pregunta clínica**: ¿las piezas del lado derecho están en posiciones "espejo"
de sus homólogas izquierdas? Para cada par homólogo (p.ej. 16↔26) se usan
**solo las dentaduras que tienen ambos dientes del par** y la asimetría se
mide **por dentadura** (análisis pareado, robusto a ausencias y outliers).

Para cada par calculamos por dentadura: `Δ reflejo X = cx_izq + cx_der`,
`ΔY = cy_izq − cy_der` y `distancia = √(Δx² + ΔY²)`. Se reportan **mediana
y rango intercuartílico** (menos sensibles a outliers que la media).

### Distribución de la asimetría por par

```js
display(symmetryBoxplot({
  symmetryData,
  selectedFdi: selectedFdi,
  width: Math.min(width, 980),
  height: 360,
}));
```

```js
display(html`<p style="color:#555; font-size:13px;">
  Cada caja muestra el IQR (Q1–Q3) y la mediana de la <strong>distancia de
  asimetría por dentadura</strong>. Los bigotes se extienden a los percentiles
  5% y 95%. <code>n</code> arriba de cada caja es la cantidad de dentaduras
  con ambos dientes del par presentes.
</p>`);
```

### Overlay de medianas pareadas en el espacio anatómico

Cada par aporta **un** punto azul (diente izquierdo en su posición **mediana**
de la población pareada) y **un** punto naranja (diente derecho homólogo
**reflejado** contra el plano sagital, también en su mediana pareada). Si
la población fuera perfectamente simétrica, ambos puntos del par coincidirían.
El largo y el color de la línea entre ellos representan la magnitud de
asimetría mediana del par.

```js
display(symmetryOverlay({
  symmetryData,
  selectedFdi: selectedFdi,
  highlightTopN: 3,
  width: Math.min(width, 900),
  height: 500,
}));
```

### Tabla resumen por par

```js
const symRows = symmetryData.pairs.map(p => ({
  "Par (der ↔ izq)": `${p.fdi_r} ↔ ${p.fdi_l}`,
  "N pareado": p.n_paired,
  "Mediana dist.": p.stats.distance.median,
  "Q1 dist.": p.stats.distance.q1,
  "Q3 dist.": p.stats.distance.q3,
  "IQR dist.": p.stats.distance.iqr,
  "P95 dist.": p.stats.distance.p95,
  "Mediana Δreflejoᴧ": p.stats.dx_reflect.median,
  "Mediana ΔY": p.stats.dy.median,
}));
display(Inputs.table(symRows, {
  format: {
    "Mediana dist.": d3.format(".4f"),
    "Q1 dist.": d3.format(".4f"),
    "Q3 dist.": d3.format(".4f"),
    "IQR dist.": d3.format(".4f"),
    "P95 dist.": d3.format(".4f"),
    "Mediana Δreflejoᴧ": d3.format(".4f"),
    "Mediana ΔY": d3.format(".4f"),
  },
}));
```

---

## Overlay de los 4 cuadrantes

<details>
<summary>Cómo leer este gráfico</summary>

Todos los dientes se proyectan sobre un mismo hemilado (|x|, y): los del lado derecho se reflejan para que coincidan en espacio con los del lado izquierdo. Esto permite comparación directa entre cuadrantes.

- **Comparando Q1 vs Q2** (o Q4 vs Q3) — evalúa simetría bilateral *en la geometría media*: los puntos deberían superponerse si la arcada es simétrica.
- **Comparando Q1 vs Q4** (o Q2 vs Q3) — evalúa alineación oclusal: si los dientes superiores están directamente sobre los inferiores, los puntos coinciden.
- **Flechas** (con exactamente 2 cuadrantes) — conectan pares FDI homólogos (posición 1 con posición 1, etc.) y se reporta la distancia media.
- **Elipses ±1σ** (opcionales) — muestran la dispersión gaussiana de cada posición.

</details>

Elegí qué cuadrantes querés superponer. Cuando seleccionás **exactamente 2**, se dibujan
**flechas** entre las posiciones FDI homólogas (1↔1, 2↔2, …) y se reporta la
**distancia media** entre los pares — útil para comparar:

- **Q1 vs Q2** o **Q4 vs Q3** → simetría bilateral *en la geometría media*.
- **Q1 vs Q4** o **Q2 vs Q3** → alineación oclusal (¿están las piezas superiores
  encima de las inferiores?).

```js
const selectedQuadrants = view(Inputs.checkbox(
  [1, 2, 3, 4],
  {
    label: "Cuadrantes",
    value: [1, 2],
    format: (q) => ({1: "Q1 (sup. der.)", 2: "Q2 (sup. izq.)", 3: "Q3 (inf. izq.)", 4: "Q4 (inf. der.)"})[q],
  }
));
```

```js
const showQuadrantEllipses = view(Inputs.toggle({label: "Mostrar elipse ±1σ", value: true}));
```

```js
display(quadrantOverlay({
  toothStats,
  quadrants: selectedQuadrants,
  showEllipses: showQuadrantEllipses,
  width: Math.min(width, 760),
  height: 480,
}));
```
