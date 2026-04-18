---
title: Comparación de Subpoblaciones
---

# Comparación de Subpoblaciones

Seleccioná uno o más dientes en el odontograma para comparar su posición
entre subpoblaciones. La eigendentadura completa se muestra como contexto (gris).

```js
import {odontograma} from "./components/odontograma.js";
import * as d3 from "d3";
```

```js
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const subpopStats = await FileAttachment("data/tooth_stats_subpop.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
```

```js
// Reactive state: array of selected FDI numbers
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
```

## Eje de comparación

```js
const axisInput = Inputs.radio(["origin", "sex"], {
  value: "origin",
  label: "Comparar por",
  format: x => x === "origin" ? "Centro (Ecodoc vs Italiano)" : "Sexo (Male vs Female)",
});
const axis = Generators.input(axisInput);
```

```js
// Filter subpop data for current axis
const axisData = subpopStats.filter(d => d.axis === axis);
const groupNames = [...new Set(axisData.map(d => d.group))].sort();

const colorMap = axis === "origin"
  ? {ecodoc: "#4e79a7", italiano: "#e15759"}
  : {male: "#4e79a7", female: "#e15759"};

const labelMap = axis === "origin"
  ? {ecodoc: "Ecodoc", italiano: "Italiano"}
  : {male: "Male", female: "Female"};
```

```js
const showPopInput = Inputs.toggle({label: "Mostrar población completa", value: false});
const showPopulation = Generators.input(showPopInput);
display(html`<div style="display:flex; gap:16px; align-items:center;">${axisInput}${showPopInput}</div>`);
```

## Odontograma

Hacé clic en los dientes para seleccionar/deseleccionar. Los dientes seleccionados se resaltan en el plot.

```js
const selectedSet = new Set(selectedFdi);
const odonto = odontograma({
  selected: selectedSet,
  fdiNombres: metadata.fdi_nombres,
  onToggle: toggleTooth,
});
display(odonto);
```

## Dentadura media por subpoblación

```js
function subpopPlot({selectedFdi, toothStats, axisData, groupNames, colorMap, labelMap, showPopulation = false, width = 800, height = 550} = {}) {
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  // Clip path
  svg.append("defs").append("clipPath")
    .attr("id", "subpop-clip")
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerH);

  const gOuter = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");

  const gClip = gOuter.append("g").attr("clip-path", "url(#subpop-clip)");
  const g = gClip.append("g");

  // Fixed extent: same as KDE page (full eigendentadura + padding)
  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const viewExtent = {
    x_min: d3.min(xs) - 0.3, x_max: d3.max(xs) + 0.3,
    y_min: d3.min(ys) - 0.3, y_max: d3.max(ys) + 0.3,
  };

  const xScale0 = d3.scaleLinear().domain([viewExtent.x_min, viewExtent.x_max]).range([0, innerW]);
  const yScale0 = d3.scaleLinear().domain([viewExtent.y_min, viewExtent.y_max]).range([0, innerH]);
  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  // Axis labels
  gOuter.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Build subpop lookup
  const subpopMap = new Map();
  for (const gName of groupNames) {
    const m = new Map();
    for (const d of axisData.filter(r => r.group === gName)) {
      m.set(d.fdi, d);
    }
    subpopMap.set(gName, m);
  }

  function draw() {
    g.selectAll("*").remove();
    const selectedSet = new Set(selectedFdi);

    // --- Eigendentadura context (all non-selected teeth, grey) ---
    for (const s of toothStats) {
      if (selectedSet.has(s.fdi)) continue;
      g.append("circle")
        .attr("cx", xScale(s.mean_x))
        .attr("cy", yScale(s.mean_y))
        .attr("r", 3)
        .attr("fill", "#ccc")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.5);
    }

    // --- Population (full) for selected teeth (very faint) ---
    if (showPopulation) {
      const statsMap = new Map(toothStats.map(s => [s.fdi, s]));
      for (const fdi of selectedFdi) {
        const s = statsMap.get(fdi);
        if (!s) continue;
        const pcx = xScale(s.mean_x);
        const pcy = yScale(s.mean_y);
        const prx = Math.abs(xScale(s.mean_x + s.std_x) - xScale(s.mean_x));
        const pry = Math.abs(yScale(s.mean_y + s.std_y) - yScale(s.mean_y));

        // 2σ ellipse
        g.append("ellipse")
          .attr("cx", pcx).attr("cy", pcy)
          .attr("rx", prx * 2).attr("ry", pry * 2)
          .attr("fill", "none")
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 0.4);

        // 1σ ellipse
        g.append("ellipse")
          .attr("cx", pcx).attr("cy", pcy)
          .attr("rx", prx).attr("ry", pry)
          .attr("fill", "none")
          .attr("stroke", "#bbb")
          .attr("stroke-width", 1.2)
          .attr("opacity", 0.4);

        // Centroid
        g.append("circle")
          .attr("cx", pcx).attr("cy", pcy)
          .attr("r", 4)
          .attr("fill", "#ddd")
          .attr("stroke", "#bbb")
          .attr("stroke-width", 1)
          .attr("opacity", 0.5);
      }
    }

    // --- Selected teeth: subpop ellipses + centroids ---
    for (const fdi of selectedFdi) {
      // Connecting line between group centroids
      if (groupNames.length === 2) {
        const sp1 = subpopMap.get(groupNames[0])?.get(fdi);
        const sp2 = subpopMap.get(groupNames[1])?.get(fdi);
        if (sp1 && sp2) {
          g.append("line")
            .attr("x1", xScale(sp1.cx_mean)).attr("y1", yScale(sp1.cy_mean))
            .attr("x2", xScale(sp2.cx_mean)).attr("y2", yScale(sp2.cy_mean))
            .attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0.6);
        }
      }

      for (const gName of groupNames) {
        const sp = subpopMap.get(gName)?.get(fdi);
        if (!sp) continue;

        const color = colorMap[gName] || "#999";
        const cx = xScale(sp.cx_mean);
        const cy = yScale(sp.cy_mean);
        const rx = Math.abs(xScale(sp.cx_mean + sp.cx_std) - xScale(sp.cx_mean));
        const ry = Math.abs(yScale(sp.cy_mean + sp.cy_std) - yScale(sp.cy_mean));

        // 2σ ellipse (dashed)
        g.append("ellipse")
          .attr("cx", cx).attr("cy", cy)
          .attr("rx", rx * 2).attr("ry", ry * 2)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0.6);

        // 1σ ellipse (solid)
        g.append("ellipse")
          .attr("cx", cx).attr("cy", cy)
          .attr("rx", rx).attr("ry", ry)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("opacity", 0.8);

        // Centroid
        g.append("circle")
          .attr("cx", cx).attr("cy", cy)
          .attr("r", 5)
          .attr("fill", color)
          .attr("stroke", "#333")
          .attr("stroke-width", 1.5);

        // FDI label
        g.append("text")
          .attr("x", cx).attr("y", cy - 9)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("font-weight", "bold")
          .attr("fill", color)
          .text(String(fdi));

        // σ labels
        g.append("text")
          .attr("x", cx + rx + 3).attr("y", cy - 2)
          .attr("font-size", 9).attr("fill", color).attr("opacity", 0.8)
          .text("1σ");
        g.append("text")
          .attr("x", cx + rx * 2 + 3).attr("y", cy - 2)
          .attr("font-size", 9).attr("fill", color).attr("opacity", 0.6)
          .text("2σ");
      }
    }

    if (selectedFdi.length === 0) {
      g.append("text").attr("x", innerW / 2).attr("y", innerH / 2)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#999")
        .text("Seleccioná uno o más dientes en el odontograma ↑");
    }

    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(8));
  }

  // Zoom (same as KDE page)
  const zoom = d3.zoom()
    .scaleExtent([1, 40])
    .on("zoom", (event) => {
      xScale = event.transform.rescaleX(xScale0);
      yScale = event.transform.rescaleY(yScale0);
      draw();
    });

  gOuter.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom)
    .on("dblclick.zoom", () => {
      gOuter.select("rect").transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

  draw();

  gOuter.append("text")
    .attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}

display(subpopPlot({selectedFdi, toothStats, axisData, groupNames, colorMap, labelMap, showPopulation, width: 800, height: 550}));
```

```js
display(html`<div style="display:flex; gap:20px; align-items:center; margin: 4px 0 12px 0;">
  ${groupNames.map(gn => html`<span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="${colorMap[gn]}" stroke="#333" stroke-width="1"/></svg>
    <span style="font-size:13px;">${labelMap[gn]}</span>
  </span>`)}
  ${showPopulation ? html`<span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#ddd" stroke="#bbb" stroke-width="1"/></svg>
    <span style="font-size:13px;">Población completa</span>
  </span>` : html``}
  <span style="font-size:12px; color:#999;">Sólida: 1σ · Punteada: 2σ</span>
</div>`);
```

### Estadísticas de los dientes seleccionados

```js
const selectedSet2 = new Set(selectedFdi);
const selectedSubpop = axisData.filter(d => selectedSet2.has(d.fdi));
```

```js
if (selectedSubpop.length > 0) {
  const tableRows = [];
  for (const fdi of selectedFdi) {
    for (const gName of groupNames) {
      const d = selectedSubpop.find(r => r.fdi === fdi && r.group === gName);
      if (!d) continue;
      tableRows.push({
        fdi: d.fdi,
        grupo: labelMap[gName],
        n: d.n,
        cx_mean: d.cx_mean,
        cy_mean: d.cy_mean,
        cx_std: d.cx_std,
        cy_std: d.cy_std,
        angle_mean: d.angle_mean,
        angle_std: d.angle_std,
      });
    }
  }

  display(html`<p style="color:#555; font-size:13px;">
    Mostrando <strong>${selectedFdi.length}</strong> pieza(s) × <strong>${groupNames.length}</strong> subpoblaciones.
  </p>`);

  const fmt = d3.format(".4f");
  display(Inputs.table(tableRows, {
    columns: ["fdi", "grupo", "n", "cx_mean", "cy_mean", "cx_std", "cy_std", "angle_mean", "angle_std"],
    header: {
      fdi: "FDI", grupo: "Grupo", n: "N",
      cx_mean: "μ X", cy_mean: "μ Y", cx_std: "σ X", cy_std: "σ Y",
      angle_mean: "μ ángulo", angle_std: "σ ángulo",
    },
    format: {
      cx_mean: fmt, cy_mean: fmt, cx_std: fmt, cy_std: fmt,
      angle_mean: d3.format(".1f"), angle_std: d3.format(".1f"),
    },
  }));
}
```

## Diferencia por diente (heatmap)

Magnitud de la diferencia entre subpoblaciones para cada diente y feature, expresada en desviaciones estándar pooled.

```js
function diffHeatmap(axisData, groupNames, labelMap, width) {
  const fdis = [...new Set(axisData.map(d => d.fdi))].sort((a, b) => a - b);
  const features = ["cx", "cy", "angle"];
  const featureLabels = {cx: "Posición X", cy: "Posición Y", angle: "Ángulo"};

  const diffs = [];
  for (const fdi of fdis) {
    const byFdi = axisData.filter(d => d.fdi === fdi);
    if (byFdi.length < 2) continue;
    const g1 = byFdi.find(d => d.group === groupNames[0]);
    const g2 = byFdi.find(d => d.group === groupNames[1]);
    if (!g1 || !g2) continue;

    for (const feat of features) {
      const mean1 = feat === "angle" ? g1.angle_mean : g1[`${feat}_mean`];
      const mean2 = feat === "angle" ? g2.angle_mean : g2[`${feat}_mean`];
      const std1 = feat === "angle" ? g1.angle_std : g1[`${feat}_std`];
      const std2 = feat === "angle" ? g2.angle_std : g2[`${feat}_std`];
      const pooledStd = Math.sqrt((std1 * std1 + std2 * std2) / 2);
      const diffSd = pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0;
      diffs.push({fdi, feature: feat, diffSd, mean1, mean2});
    }
  }

  const upperRow = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const lowerRow = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const displayOrder = [...upperRow, ...lowerRow];
  const orderedFdis = displayOrder.filter(f => fdis.includes(f));

  const cellW = Math.max(18, Math.min(30, (width - 120) / orderedFdis.length));
  const cellH = 30;
  const margin = {top: 30, right: 20, bottom: 60, left: 80};
  const svgW = margin.left + orderedFdis.length * cellW + margin.right;
  const svgH = margin.top + features.length * cellH + margin.bottom;

  const maxAbsDiff = d3.max(diffs, d => Math.abs(d.diffSd));
  const colorScale = d3.scaleDiverging()
    .domain([-maxAbsDiff, 0, maxAbsDiff])
    .interpolator(d3.interpolateRdBu);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, svgW, svgH])
    .attr("width", svgW)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  for (const d of diffs) {
    const col = orderedFdis.indexOf(d.fdi);
    const row = features.indexOf(d.feature);
    if (col < 0 || row < 0) continue;

    const rect = g.append("rect")
      .attr("x", col * cellW)
      .attr("y", row * cellH)
      .attr("width", cellW - 1)
      .attr("height", cellH - 1)
      .attr("fill", colorScale(d.diffSd))
      .attr("rx", 2);

    rect.append("title")
      .text(`FDI ${d.fdi} — ${featureLabels[d.feature]}\nDiff: ${d.diffSd.toFixed(3)} σ\n${groupNames[0]}: ${d.mean1.toFixed(4)}\n${groupNames[1]}: ${d.mean2.toFixed(4)}`);
  }

  // Quadrant separator
  g.append("line")
    .attr("x1", 8 * cellW - 0.5).attr("x2", 8 * cellW - 0.5)
    .attr("y1", 0).attr("y2", features.length * cellH)
    .attr("stroke", "#333").attr("stroke-width", 1.5);

  for (let i = 0; i < orderedFdis.length; i++) {
    g.append("text")
      .attr("x", i * cellW + cellW / 2)
      .attr("y", features.length * cellH + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("fill", "#555")
      .attr("transform", `rotate(45, ${i * cellW + cellW / 2}, ${features.length * cellH + 14})`)
      .text(orderedFdis[i]);
  }

  for (let i = 0; i < features.length; i++) {
    g.append("text")
      .attr("x", -6)
      .attr("y", i * cellH + cellH / 2 + 1)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("font-size", 11)
      .attr("fill", "#333")
      .text(featureLabels[features[i]]);
  }

  svg.append("text")
    .attr("x", svgW / 2).attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("font-size", 13).attr("fill", "#333").attr("font-weight", 600)
    .text(`Diferencia (${labelMap[groupNames[0]]} − ${labelMap[groupNames[1]]}) en σ`);

  return svg.node();
}

display(diffHeatmap(axisData, groupNames, labelMap, width));
```

---

<div class="note">

**Datos**: Estadísticas por diente con normalización por landmarks condíleos.
Eje *origin*: Ecodoc vs Italiano. Eje *sex*: Male vs Female (inferido por nombre vía gender_guesser).
Diferencias: $(μ_1 - μ_2) / σ_{pooled}$. Elipses: 1σ (sólida) y 2σ (punteada).

</div>
