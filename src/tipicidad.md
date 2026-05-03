---
title: Tipicidad y outliers
---

# Tipicidad y outliers

¿Qué hace a una dentadura "típica" o "atípica"? Esta sección analiza la distribución de la **tipicidad posicional y angular** en la población completa, identifica las dentaduras más y menos representativas, y permite visualizarlas sobre la eigendentadura.

**${individuals.length.toLocaleString("es-AR")} pantomografías** con z-scores calculados (posición y ángulo de cada diente relativo a la media poblacional).

```js
import {atipicalityScatter} from "./components/atipicality-scatter.js";
import * as d3 from "d3";
```

```js
const toothStats       = await FileAttachment("data/tooth_stats.json").json();
const typicalityExtremes = await FileAttachment("data/typicality_extremes.json").json();
const individuals      = await FileAttachment("data/individual_scores.json").json();
```

## Atipicidad posicional vs angular — población completa

¿Son los pacientes atípicos por su **posición** dental, por su **ángulo** de rotación, o por ambas cosas?
Cada punto es una pantomografía. Las líneas punteadas marcan la mediana de la población en cada eje.

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X (z_pos)** — atipicidad posicional: desvío promedio de los centroides dentales respecto a la media poblacional, en desvíos estándar. Valores altos = dientes muy desplazados de su posición típica.
- **Eje Y (z_ang)** — atipicidad angular: desvío medio del ángulo de cada diente respecto al ángulo poblacional.
- **Líneas punteadas** — mediana de la población en cada eje; dividen el espacio en 4 cuadrantes.
- **Color** — codificado según el selector (centro clínico o sexo biológico).

Un paciente en el cuadrante superior derecho tiene dientes desplazados _y_ rotados respecto a la distribución esperada.

</details>

```js
const colorByInput = Inputs.select(
  new Map([["Centro clínico", "origin"], ["Sexo", "sex"]]),
  {label: "Colorear por", value: "origin"}
);
const colorBy = Generators.input(colorByInput);
display(colorByInput);
```

```js
display(atipicalityScatter(individuals, {
  width: Math.min(width, 700),
  height: 460,
  colorBy,
  minTeeth: 10,
  selectedPanto: null,
}));
```

<div class="note">

**Datos**: ${individuals.length.toLocaleString()} pantomografías con normalización por landmarks condíleos.
Z-scores calculados como $z = (x - μ) / σ$ respecto a la media y desvío de cada diente.
$z_{pos} = \sqrt{z_x^2 + z_y^2}$ promediado sobre todos los dientes.
$z_{ang}$ = media de $|z_{angle}|$ por diente.

</div>

## Distribución de z̄ — ranking de outliers

Histograma de z̄ (score de tipicidad geométrica) para las **${typicalityExtremes.total_eligible.toLocaleString()} dentaduras** elegibles (≥${typicalityExtremes.min_teeth} dientes). Los **${typicalityExtremes.n_extremes} outliers formales** más atípicos aparecen en rojo.

<details>
<summary>Cómo leer este gráfico y la tabla</summary>

- **Eje X (z̄)** — score de tipicidad: promedio de la distancia z estandarizada por diente. z̄ ≈ 1.0 indica dientes muy cercanos al promedio; z̄ > 2.5 indica dentadura globalmente atípica.
- **Barras rojas** — las ${typicalityExtremes.n_extremes} dentaduras con mayor z̄ (outliers formales): sus dientes se ubican, en promedio, más lejos de la posición esperada.
- **Barras azules** — resto de la población.
- **Tabla** — ranking de los outliers más atípicos; hacé clic en una fila para seleccionarla y visualizarla en el gráfico de abajo.

</details>

```js
{
  const threshold = typicalityExtremes.atypical[typicalityExtremes.atypical.length - 1]?.z_mean ?? Infinity;
  display(Plot.plot({
    width: Math.min(width, 620),
    height: 220,
    marginBottom: 45,
    x: {label: "z̄ (score de tipicidad)", domain: [0, d3.max(individuals, d => d.z_mean) + 0.1]},
    y: {label: "N° dentaduras"},
    color: {domain: ["Población", "Outliers formales"], range: ["#4c78a8", "#e15759"], legend: true},
    marks: [
      Plot.rectY(
        individuals.filter(d => d.n_teeth >= typicalityExtremes.min_teeth),
        Plot.binX(
          {y: "count"},
          {
            x: "z_mean",
            fill: d => d.z_mean >= threshold ? "Outliers formales" : "Población",
            thresholds: 60,
          }
        )
      ),
      Plot.ruleX([threshold], {stroke: "#e15759", strokeDasharray: "5,3", strokeWidth: 1.5}),
    ],
  }));
}
```

```js
{
  function simplifyFn(fn) {
    return fn.replace(/^database_original__/, "").replace(/__json_url\.json$/, "").replace(/\.json$/, "");
  }
  const atypRows = typicalityExtremes.atypical.map(d => ({
    "Rank (atípica)": d.rank,
    "ID": simplifyFn(d.json_filename),
    "Dientes": d.n_teeth,
    "z̄": d.z_mean,
  }));
  const typRows = typicalityExtremes.typical.map(d => ({
    "Rank (típica)": d.rank,
    "ID": simplifyFn(d.json_filename),
    "Dientes": d.n_teeth,
    "z̄": d.z_mean,
  }));

  display(html`<div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-top:0.5rem;">
    <div>
      <div style="font-size:0.78rem; font-weight:600; color:#e15759; margin-bottom:4px;">✕ ${typicalityExtremes.n_extremes} más atípicas</div>
      ${Inputs.table(atypRows, {format: {"z̄": d3.format(".4f")}, rows: typicalityExtremes.n_extremes})}
    </div>
    <div>
      <div style="font-size:0.78rem; font-weight:600; color:#2a7f62; margin-bottom:4px;">◆ ${typicalityExtremes.n_extremes} más típicas</div>
      ${Inputs.table(typRows, {format: {"z̄": d3.format(".4f")}, rows: typicalityExtremes.n_extremes})}
    </div>
  </div>`);
}
```

## Dentaduras típicas y atípicas

Dentaduras individuales ordenadas por su score de tipicidad (z̄: promedio de la distancia z por diente). Se muestran las **${typicalityExtremes.n_extremes} más típicas** (menor z̄) y las **${typicalityExtremes.n_extremes} más atípicas** (mayor z̄), de un total de ${typicalityExtremes.total_eligible.toLocaleString()} dentaduras con ≥${typicalityExtremes.min_teeth} dientes. Seleccioná una en los combos para visualizarla sobre la eigendentadura.

<details>
<summary>Cómo leer este gráfico</summary>

Seleccioná una dentadura típica (◆) y/o atípica (✕) en los combos para visualizarla sobre la eigendentadura (puntos grises).

- **◆ Verde** — dentadura típica: sus dientes se ubican cerca del promedio poblacional (z̄ bajo).
- **✕ Rojo** — dentadura atípica: uno o más dientes se desvían notablemente del promedio (z̄ alto).
- **Flechas** — desvío angular de cada diente respecto a la media poblacional. La flecha apunta hacia arriba cuando el ángulo coincide con el promedio; se inclina según la diferencia angular.
- **z̄** — promedio de la distancia z estandarizada por pieza.

Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

```js
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

    const arrowLen = Math.max(12, 12 * Math.min(k, 6));

    for (const s of toothStats) {
      const cx = xScale(s.mean_x);
      const cy = yScale(s.mean_y);
      g.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", Math.max(3, 3 * Math.min(k, 6)))
        .attr("fill", "#ddd").attr("stroke", "#bbb").attr("stroke-width", 0.5).attr("opacity", 0.6);
      g.append("line")
        .attr("x1", cx).attr("y1", cy).attr("x2", cx).attr("y2", cy - arrowLen)
        .attr("stroke", "#ccc").attr("stroke-width", 1.5).attr("opacity", 0.5);
      g.append("text")
        .attr("x", cx).attr("y", cy - arrowLen - 3)
        .attr("text-anchor", "middle")
        .attr("font-size", Math.max(8, 8 * Math.min(k, 4)))
        .attr("fill", "#ccc").text(String(s.fdi));
    }

    const angleMeanByFdi = {};
    for (const s of toothStats) angleMeanByFdi[s.fdi] = s.mean_angle;

    function drawIndividual(record, marker) {
      if (!record) return;
      const color = marker === "typical" ? "#2a7f62" : "#c0392b";
      for (const t of record.teeth) {
        const cx = xScale(t.cx);
        const cy = yScale(t.cy);
        const r = Math.max(4, 4 * Math.min(k, 4));
        if (marker === "typical") {
          const d = r * 1.2;
          g.append("path")
            .attr("d", `M${cx},${cy - d}L${cx + d},${cy}L${cx},${cy + d}L${cx - d},${cy}Z`)
            .attr("fill", color).attr("stroke", "#333").attr("stroke-width", 1).attr("opacity", 0.85);
        } else {
          const d = r;
          g.append("path")
            .attr("d", `M${cx - d},${cy - d}L${cx + d},${cy + d}M${cx + d},${cy - d}L${cx - d},${cy + d}`)
            .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2.5)
            .attr("stroke-linecap", "round").attr("opacity", 0.85);
        }
        if (t.angle != null && angleMeanByFdi[t.fdi] != null) {
          const deltaAngle = t.angle - angleMeanByFdi[t.fdi];
          const rad = (-Math.PI / 2) + (deltaAngle * Math.PI / 180);
          const ax = cx + arrowLen * Math.cos(rad);
          const ay = cy + arrowLen * Math.sin(rad);
          const headLen = Math.max(4, 4 * Math.min(k, 4));
          const headAngle = 0.5;
          g.append("line")
            .attr("x1", cx).attr("y1", cy).attr("x2", ax).attr("y2", ay)
            .attr("stroke", color).attr("stroke-width", 2).attr("opacity", 0.7);
          g.append("path")
            .attr("d", `M${ax},${ay}L${ax - headLen * Math.cos(rad - headAngle)},${ay - headLen * Math.sin(rad - headAngle)}M${ax},${ay}L${ax - headLen * Math.cos(rad + headAngle)},${ay - headLen * Math.sin(rad + headAngle)}`)
            .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
            .attr("stroke-linecap", "round").attr("opacity", 0.7);
        }
        g.append("text")
          .attr("x", cx).attr("y", cy - r - 3)
          .attr("text-anchor", "middle")
          .attr("font-size", Math.max(9, 9 * Math.min(k, 3)))
          .attr("font-weight", "bold").attr("fill", color).text(String(t.fdi));
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

<div style="border-left: 4px solid #54a24b; background: #f7fff7; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La mayoría de los individuos son <strong>consistentemente típicos o consistentemente atípicos</strong> en posición y ángulo simultáneamente: la dentadura de un individuo tiende a ser globalmente regular o globalmente irregular, sin disociación marcada entre las dos dimensiones. Los outliers formales (mayor z̄) se distribuyen sin concentración en ningún subgrupo clínico o demográfico particular.
</div>
