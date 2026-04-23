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

---

## Mapa de densidad (KDE)

<details open>
<summary style="cursor: pointer; font-size: 13px; color: #444; font-weight: 600;">Odontograma</summary>

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
const plot = kdePlot({
  selectedFdi: selectedFdi,
  kdeGrids: kdeGrids,
  toothStats: toothStats,
  width: 800,
  height: 550,
});
display(plot);
```

## Estadísticas de los dientes seleccionados

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

## Rose Plot — Distribución angular por diente

Histograma circular (rose plot) de la orientación de cada diente, ubicado en su posición anatómica media.
Cada pétalo muestra la frecuencia de ángulos en bins de 5°. La línea radial indica la media.
Los dientes seleccionados en el odontograma se resaltan.

```js
display(rosePlot({
  angleHistograms,
  toothStats,
  selectedFdi: selectedFdi,
  width: width,
  height: 600,
}));
```

---

## Radar — Dispersión angular por diente

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

## Simetría bilateral

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
