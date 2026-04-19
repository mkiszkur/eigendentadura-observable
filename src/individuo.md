---
title: Individuo vs Población
---

# Individuo vs Población

Compará la geometría dental de un individuo contra la distribución poblacional.
Los z-scores miden cuántas desviaciones estándar se separa cada diente del promedio.

```js
import {odontograma} from "./components/odontograma.js";
import {pantoTable, cleanArchivo} from "./components/panto-table.js";
import * as d3 from "d3";
```

```js
const toothStats = await FileAttachment("data/tooth_stats_lm.json").json();
const individuals = await FileAttachment("data/individual_scores.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
const browserData = await FileAttachment("data/pantos_browser.json").json();
const meta = browserData.metadata;
const allBrowserPantos = browserData.pantos;
```

```js
// Build index: cleaned individual filename → individual object
const indivMap = new Map(individuals.map(d => [cleanArchivo(d.json_filename), d]));

// Join: pantos from browser that have individual scores
const allPantos = allBrowserPantos
  .filter(p => indivMap.has(cleanArchivo(p.archivo)))
  .map(p => {
    const ind = indivMap.get(cleanArchivo(p.archivo));
    return {...p, z_mean: ind.z_mean, z_max: ind.z_max, n_teeth_lm: ind.n_teeth};
  });
```

<!-- ═══════ FILTROS ═══════ -->

```js
const searchInput = Inputs.text({placeholder: "Buscar archivo…", width: 280});
const searchTerm = Generators.input(searchInput);

const catInput = Inputs.select(["Todas", ...meta.categorias], {value: "Todas", label: "Cat."});
const catFilter = Generators.input(catInput);

const dentInput = Inputs.select(["Todas", ...meta.denticiones], {value: "Todas", label: "Dent."});
const dentFilter = Generators.input(dentInput);

const flagInput = Inputs.select(["Ninguna", ...meta.flag_names], {value: "Ninguna", label: "Patología"});
const flagFilter = Generators.input(flagInput);

const fdiInput = Inputs.toggle({label: "FDI completo", value: false});
const fdiFilter = Generators.input(fdiInput);
const lmInput = Inputs.toggle({label: "LM completos", value: false});
const lmFilter = Generators.input(lmInput);
const metalFilterInput = Inputs.toggle({label: "Con metal", value: false});
const metalRequired = Generators.input(metalFilterInput);
const cariesFilterInput = Inputs.toggle({label: "Con caries", value: false});
const cariesRequired = Generators.input(cariesFilterInput);
const sinFdiInput = Inputs.toggle({label: "Sin FDI", value: false});
const sinFdiFilter = Generators.input(sinFdiInput);
```

```js
display(html`<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: end;">
  ${searchInput}${catInput}${dentInput}${flagInput}
</div>`);
```

<details>
<summary style="cursor: pointer; font-size: 13px; color: #666;">Más filtros…</summary>

```js
display(html`<div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 6px 0;">
  ${fdiInput}${lmInput}${metalFilterInput}${cariesFilterInput}${sinFdiInput}
</div>`);
```

</details>

```js
const pantos = allPantos.filter(p => {
  if (searchTerm && !cleanArchivo(p.archivo).toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (catFilter !== "Todas" && p.categoria !== catFilter) return false;
  if (dentFilter !== "Todas" && p.denticion !== dentFilter) return false;
  if (flagFilter !== "Ninguna" && !(p.flags && p.flags[flagFilter] > 0)) return false;
  if (fdiFilter && !p.fdi_completo) return false;
  if (lmFilter && !p.lm_completo) return false;
  if (metalRequired && !(p.flags && p.flags["Metal"] > 0)) return false;
  if (cariesRequired && !(p.flags && p.flags["Caries"] > 0)) return false;
  if (sinFdiFilter && p.con_fdi > 0) return false;
  return true;
});
```

<!-- ═══════ TABLA PAGINADA ═══════ -->

## Selección de individuo

```js
const PAGE_SIZE = 15;
const pageState = Mutable(0);
function goToPage(p) { pageState.value = p; }
```

```js
const selectedArchivo = Mutable(pantos.length > 0 ? pantos[0].archivo : null);
function selectRow(archivo) { selectedArchivo.value = archivo; }
```

```js
display(pantoTable({
  pantos,
  page: pageState,
  pageSize: PAGE_SIZE,
  selectedA: selectedArchivo,
  onSelectA: selectRow,
  onPage: goToPage,
  extraColumns: [
    {key: "z_mean", header: "z̄", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "z_max", header: "z_max", format: v => v != null ? v.toFixed(1) : "—"},
  ],
}));
```

```js
const indiv = individuals.find(d => cleanArchivo(d.json_filename) === cleanArchivo(selectedArchivo));
```

```js
if (indiv) {
  const originLabel = indiv.data_origin || "desconocido";
  const sexLabel = indiv.sex || "desconocido";
  display(html`<div style="display:flex; gap: 24px; flex-wrap: wrap; margin-top: 8px;">
    <div style="padding: 8px 16px; background: #f5f5f5; border-radius: 6px; font-size: 14px;">
      <strong>Archivo:</strong> ${cleanArchivo(indiv.json_filename)}
    </div>
    <div style="padding: 8px 16px; background: #f5f5f5; border-radius: 6px; font-size: 14px;">
      <strong>Origen:</strong> ${originLabel}
    </div>
    <div style="padding: 8px 16px; background: #f5f5f5; border-radius: 6px; font-size: 14px;">
      <strong>Sexo:</strong> ${sexLabel}
    </div>
    <div style="padding: 8px 16px; background: #f5f5f5; border-radius: 6px; font-size: 14px;">
      <strong>Dientes:</strong> ${indiv.n_teeth}
    </div>
    <div style="padding: 8px 16px; background: ${Math.abs(indiv.z_mean) > 2 ? '#fff3cd' : '#f5f5f5'}; border-radius: 6px; font-size: 14px;">
      <strong>z̄:</strong> ${indiv.z_mean.toFixed(2)} &nbsp; <strong>z_max:</strong> ${indiv.z_max.toFixed(2)}
    </div>
  </div>`);
}
```

## Dentadura: Individuo vs Población

Los puntos azules son los centroides poblacionales medios (±1σ). Los puntos rojos son los dientes del individuo.

```js
function individualPlot(indiv, toothStats, width) {
  if (!indiv || !indiv.teeth || indiv.teeth.length === 0) {
    return html`<p style="color:#999;">Seleccioná un individuo para ver su dentadura.</p>`;
  }

  const height = 500;
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Stats lookup
  const statsMap = new Map(toothStats.map(s => [s.fdi, s]));

  // Individual teeth
  const teeth = indiv.teeth;

  // Extent: from population stats + individual points
  const allX = [...toothStats.map(s => s.cx_mean), ...teeth.map(t => t.cx)];
  const allY = [...toothStats.map(s => s.cy_mean), ...teeth.map(t => t.cy)];
  const xPad = d3.max(toothStats, s => s.cx_std) * 2;
  const yPad = d3.max(toothStats, s => s.cy_std) * 2;

  const xScale = d3.scaleLinear()
    .domain([d3.min(allX) - xPad, d3.max(allX) + xPad])
    .range([0, innerW]);
  const yScale = d3.scaleLinear()
    .domain([d3.min(allY) - yPad, d3.max(allY) + yPad])
    .range([0, innerH]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Grid
  g.append("g").selectAll("line").data(yScale.ticks(8)).join("line")
    .attr("x1", 0).attr("x2", innerW)
    .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
    .attr("stroke", "#f0f0f0");
  g.append("g").selectAll("line").data(xScale.ticks(8)).join("line")
    .attr("y1", 0).attr("y2", innerH)
    .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
    .attr("stroke", "#f0f0f0");

  // Axes
  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(8))
    .call(g => g.select(".domain").remove());
  g.append("g").call(d3.axisLeft(yScale).ticks(8))
    .call(g => g.select(".domain").remove());

  g.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Population ellipses + centroids
  for (const s of toothStats) {
    g.append("ellipse")
      .attr("cx", xScale(s.cx_mean))
      .attr("cy", yScale(s.cy_mean))
      .attr("rx", Math.abs(xScale(s.cx_mean + s.cx_std) - xScale(s.cx_mean)))
      .attr("ry", Math.abs(yScale(s.cy_mean + s.cy_std) - yScale(s.cy_mean)))
      .attr("fill", "#4e79a7")
      .attr("fill-opacity", 0.07)
      .attr("stroke", "#4e79a7")
      .attr("stroke-opacity", 0.2);

    g.append("circle")
      .attr("cx", xScale(s.cx_mean))
      .attr("cy", yScale(s.cy_mean))
      .attr("r", 3)
      .attr("fill", "#4e79a7")
      .attr("opacity", 0.4);

    g.append("text")
      .attr("x", xScale(s.cx_mean))
      .attr("y", yScale(s.cy_mean) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 7)
      .attr("fill", "#4e79a7")
      .attr("opacity", 0.5)
      .text(s.fdi);
  }

  // Individual teeth
  for (const t of teeth) {
    const s = statsMap.get(t.fdi);
    // Line from population mean to individual
    if (s) {
      g.append("line")
        .attr("x1", xScale(s.cx_mean)).attr("y1", yScale(s.cy_mean))
        .attr("x2", xScale(t.cx)).attr("y2", yScale(t.cy))
        .attr("stroke", "#e15759")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 1);
    }

    const circle = g.append("circle")
      .attr("cx", xScale(t.cx))
      .attr("cy", yScale(t.cy))
      .attr("r", 4)
      .attr("fill", "#e15759")
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    circle.append("title")
      .text(`FDI ${t.fdi}\nx=${t.cx.toFixed(4)}, y=${t.cy.toFixed(4)}\nángulo=${t.angle.toFixed(1)}°\nz_total=${t.z_total.toFixed(2)}`);

    g.append("text")
      .attr("x", xScale(t.cx))
      .attr("y", yScale(t.cy) - 7)
      .attr("text-anchor", "middle")
      .attr("font-size", 8)
      .attr("fill", "#e15759")
      .attr("font-weight", 600)
      .text(t.fdi);
  }

  // Legend
  const legend = g.append("g").attr("transform", `translate(${innerW - 140}, 10)`);
  legend.append("circle").attr("cx", 6).attr("cy", 6).attr("r", 4).attr("fill", "#4e79a7");
  legend.append("text").attr("x", 16).attr("y", 10).attr("font-size", 11).attr("fill", "#333").text("Población (μ ± 1σ)");
  legend.append("circle").attr("cx", 6).attr("cy", 26).attr("r", 4).attr("fill", "#e15759");
  legend.append("text").attr("x", 16).attr("y", 30).attr("font-size", 11).attr("fill", "#333").text("Individuo");

  return svg.node();
}

display(individualPlot(indiv, toothStats, width));
```

## Z-scores por diente

Cuántas desviaciones estándar se separa cada diente del promedio poblacional.
Barras rojas = dientes más atípicos.

```js
function zScoreChart(indiv, width) {
  if (!indiv || !indiv.teeth || indiv.teeth.length === 0) {
    return html`<p style="color:#999;">Seleccioná un individuo.</p>`;
  }

  const teeth = [...indiv.teeth].sort((a, b) => {
    // Sort by dental arch position
    const order = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
                   48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
    return order.indexOf(a.fdi) - order.indexOf(b.fdi);
  });

  const height = 250;
  const margin = {top: 20, right: 20, bottom: 50, left: 50};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = d3.scaleBand()
    .domain(teeth.map(d => d.fdi))
    .range([0, innerW])
    .padding(0.15);

  const maxZ = d3.max(teeth, d => Math.abs(d.z_total));
  const yScale = d3.scaleLinear()
    .domain([0, Math.max(maxZ * 1.1, 3)])
    .range([innerH, 0]);

  const colorScale = d3.scaleSequential()
    .domain([0, Math.max(maxZ, 3)])
    .interpolator(d3.interpolateYlOrRd);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Reference lines at z=1, z=2
  for (const z of [1, 2]) {
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", yScale(z)).attr("y2", yScale(z))
      .attr("stroke", z === 2 ? "#e15759" : "#ccc")
      .attr("stroke-dasharray", "4,3")
      .attr("stroke-width", z === 2 ? 1.5 : 1);
    g.append("text")
      .attr("x", innerW + 4).attr("y", yScale(z) + 4)
      .attr("font-size", 9).attr("fill", z === 2 ? "#e15759" : "#999")
      .text(`${z}σ`);
  }

  // Bars
  for (const t of teeth) {
    const bar = g.append("rect")
      .attr("x", xScale(t.fdi))
      .attr("y", yScale(Math.abs(t.z_total)))
      .attr("width", xScale.bandwidth())
      .attr("height", innerH - yScale(Math.abs(t.z_total)))
      .attr("fill", colorScale(Math.abs(t.z_total)))
      .attr("rx", 2);

    bar.append("title")
      .text(`FDI ${t.fdi}\nz_cx=${t.z_cx.toFixed(2)}\nz_cy=${t.z_cy.toFixed(2)}\nz_angle=${t.z_angle.toFixed(2)}\nz_total=${t.z_total.toFixed(2)}`);
  }

  // Axes
  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(g => g.select(".domain").remove())
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end")
    .attr("font-size", 9);

  g.append("g").call(d3.axisLeft(yScale).ticks(5))
    .call(g => g.select(".domain").remove());

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -35)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("|z_total|");

  // Quadrant separator line (between upper and lower arch)
  const upperTeeth = teeth.filter(t => t.fdi >= 11 && t.fdi <= 28);
  const lowerTeeth = teeth.filter(t => t.fdi >= 31 && t.fdi <= 48);
  if (upperTeeth.length > 0 && lowerTeeth.length > 0) {
    const lastUpper = upperTeeth[upperTeeth.length - 1].fdi;
    const firstLower = lowerTeeth[0].fdi;
    const sepX = (xScale(lastUpper) + xScale.bandwidth() + xScale(firstLower)) / 2;
    g.append("line")
      .attr("x1", sepX).attr("x2", sepX)
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#ccc").attr("stroke-dasharray", "3,3");
  }

  return svg.node();
}

display(zScoreChart(indiv, width));
```

## Detalle de dientes

```js
if (indiv && indiv.teeth) {
  const fmt = d3.format(".4f");
  const fmt2 = d3.format(".2f");
  display(Inputs.table(
    [...indiv.teeth].sort((a, b) => Math.abs(b.z_total) - Math.abs(a.z_total)),
    {
      columns: ["fdi", "cx", "cy", "angle", "z_cx", "z_cy", "z_angle", "z_total"],
      header: {
        fdi: "FDI", cx: "X", cy: "Y", angle: "Ángulo",
        z_cx: "z_X", z_cy: "z_Y", z_angle: "z_ángulo", z_total: "z_total"
      },
      format: {
        cx: fmt, cy: fmt, angle: d => d.toFixed(1) + "°",
        z_cx: fmt2, z_cy: fmt2, z_angle: fmt2, z_total: fmt2,
      },
      sort: "z_total",
      reverse: true,
    }
  ));
}
```

---

<div class="note">

**Datos**: ${allPantos.length.toLocaleString()} individuos con normalización por landmarks condíleos.
Z-scores calculados como $z = (x - μ) / σ$ respecto a la media y desvío de cada diente.
$z_{total} = \sqrt{z_x^2 + z_y^2 + z_{angle}^2}$ (norma euclidiana de los z-scores).

</div>
