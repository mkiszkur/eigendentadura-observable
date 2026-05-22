/**
 * Índice de Bolton poblacional.
 *
 * Dos histogramas (anterior y overall) con líneas de referencia
 * para la norma clínica (Bolton 1958/1962): media y media ± 1 SD.
 */
import * as d3 from "d3";

function histogramSvg({hist, stats, norm, label, width = 420, height = 220, color = "#4e79a7"} = {}) {
  const margin = {top: 22, right: 16, bottom: 40, left: 42};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%");

  const xMin = Math.min(d3.min(hist, d => d.x_min), norm.mean - 3 * norm.std);
  const xMax = Math.max(d3.max(hist, d => d.x_max), norm.mean + 3 * norm.std);
  const yMax = d3.max(hist, d => d.count);

  const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Banda ± 1 SD de la norma (rango clínicamente aceptable).
  g.append("rect")
    .attr("x", x(norm.mean - norm.std))
    .attr("y", 0)
    .attr("width", x(norm.mean + norm.std) - x(norm.mean - norm.std))
    .attr("height", innerH)
    .attr("fill", "#2ca02c").attr("opacity", 0.10);

  // Barras con hover states (U-018: feedback interactivo consistente)
  for (const b of hist) {
    g.append("rect")
      .attr("x", x(b.x_min) + 0.5)
      .attr("y", y(b.count))
      .attr("width", Math.max(0, x(b.x_max) - x(b.x_min) - 1))
      .attr("height", innerH - y(b.count))
      .attr("fill", color).attr("opacity", 0.78)
      .style("cursor", "pointer")
      .on("mouseover", function() {
        d3.select(this).transition().duration(120).attr("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(120).attr("opacity", 0.78);
      })
      .append("title")
      .text(`Bolton ${b.x_min.toFixed(1)} – ${b.x_max.toFixed(1)}: ${b.count} dentaduras`);
  }

  // Mediana de la población observada
  g.append("line")
    .attr("x1", x(stats.median)).attr("x2", x(stats.median))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#222").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
  g.append("text")
    .attr("x", x(stats.median)).attr("y", -8)
    .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#333")
    .text(`med obs = ${stats.median.toFixed(2)}`);

  // Línea de la media de Bolton (norma)
  g.append("line")
    .attr("x1", x(norm.mean)).attr("x2", x(norm.mean))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#2ca02c").attr("stroke-width", 2);
  g.append("text")
    .attr("x", x(norm.mean)).attr("y", innerH + 22)
    .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#2ca02c")
    .attr("font-weight", "bold")
    .text(`Bolton μ = ${norm.mean}`);

  // Banda IQR observada
  g.append("rect")
    .attr("x", x(stats.q1)).attr("y", innerH - 4)
    .attr("width", x(stats.q3) - x(stats.q1)).attr("height", 4)
    .attr("fill", "#222").attr("opacity", 0.6);

  // Ejes
  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".1f")));
  g.append("g").call(d3.axisLeft(y).ticks(4));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 36)
    .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#444")
    .text(label);

  return svg.node();
}

export function boltonHistograms({boltonData, width = 900}) {
  const half = Math.min(440, Math.floor(width / 2) - 8);
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = `1fr 1fr`;
  wrap.style.gap = "12px";

  if (boltonData.stats.anterior) {
    wrap.appendChild(histogramSvg({
      hist:  boltonData.histograms.anterior,
      stats: boltonData.stats.anterior,
      norm:  boltonData.norms.anterior,
      label: `Bolton anterior (n = ${boltonData.eligibility.anterior})`,
      color: "#4e79a7",
      width: half, height: 240,
    }));
  }
  if (boltonData.stats.overall) {
    wrap.appendChild(histogramSvg({
      hist:  boltonData.histograms.overall,
      stats: boltonData.stats.overall,
      norm:  boltonData.norms.overall,
      label: `Bolton overall (n = ${boltonData.eligibility.overall})`,
      color: "#e15759",
      width: half, height: 240,
    }));
  }
  return wrap;
}
