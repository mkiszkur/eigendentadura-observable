/**
 * Overbite / overjet poblacional.
 *
 * Muestra dos histogramas (overjet y overbite) y un scatter
 * de las dos métricas, calculadas a partir de los centroides de
 * los incisivos centrales (11/21 vs 41/31) en cada dentadura.
 */
import * as d3 from "d3";

function histogramSvg({hist, stats, label, width = 380, height = 180, color = "#4e79a7"} = {}) {
  const margin = {top: 18, right: 14, bottom: 36, left: 38};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%");

  const xMin = d3.min(hist, d => d.x_min);
  const xMax = d3.max(hist, d => d.x_max);
  const yMax = d3.max(hist, d => d.count);

  const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

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
      .text(`${b.x_min.toFixed(3)} – ${b.x_max.toFixed(3)}: ${b.count} dentaduras`);
  }

  // Línea de mediana
  g.append("line")
    .attr("x1", x(stats.median)).attr("x2", x(stats.median))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#222").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
  g.append("text")
    .attr("x", x(stats.median)).attr("y", -4)
    .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#333")
    .text(`med = ${stats.median.toFixed(4)}`);

  // Banda IQR
  g.append("rect")
    .attr("x", x(stats.q1)).attr("y", innerH - 4)
    .attr("width", x(stats.q3) - x(stats.q1)).attr("height", 4)
    .attr("fill", "#222").attr("opacity", 0.6);

  // Ejes
  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".3f")));
  g.append("g").call(d3.axisLeft(y).ticks(4));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 30)
    .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#444")
    .text(label);

  return svg.node();
}

export function occlusionHistograms({occlusionData, width = 800}) {
  const half = Math.min(420, Math.floor(width / 2) - 6);
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = `1fr 1fr`;
  wrap.style.gap = "12px";
  wrap.appendChild(histogramSvg({
    hist: occlusionData.histograms.overjet,
    stats: occlusionData.stats.overjet,
    label: "Overjet (|Δx| en coord. landmark-normalized)",
    color: "#4e79a7",
    width: half, height: 200,
  }));
  wrap.appendChild(histogramSvg({
    hist: occlusionData.histograms.overbite,
    stats: occlusionData.stats.overbite,
    label: "Overbite (Δy entre incisivos sup./inf.)",
    color: "#e15759",
    width: half, height: 200,
  }));
  return wrap;
}

export function occlusionScatter({occlusionData, width = 600, height = 420}) {
  const margin = {top: 20, right: 20, bottom: 50, left: 60};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const points = occlusionData.points;
  const x = d3.scaleLinear().domain(d3.extent(points, p => p.overjet)).nice().range([0, innerW]);
  const y = d3.scaleLinear().domain(d3.extent(points, p => p.overbite)).nice().range([innerH, 0]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Grilla
  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickSize(-innerH).tickFormat(""))
    .selectAll("line").attr("stroke", "#eee");
  g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .selectAll("line").attr("stroke", "#eee");

  // Puntos
  for (const p of points) {
    g.append("circle")
      .attr("cx", x(p.overjet)).attr("cy", y(p.overbite))
      .attr("r", 1.8)
      .attr("fill", "#4e79a7").attr("opacity", 0.35);
  }

  // Mediana
  const sJ = occlusionData.stats.overjet, sB = occlusionData.stats.overbite;
  g.append("circle").attr("cx", x(sJ.median)).attr("cy", y(sB.median))
    .attr("r", 7).attr("fill", "none").attr("stroke", "#111").attr("stroke-width", 2);
  g.append("text").attr("x", x(sJ.median) + 10).attr("y", y(sB.median) - 6)
    .attr("font-size", 11).attr("fill", "#222").attr("font-weight", "bold")
    .text("mediana");

  // Ejes
  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".3f")));
  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".3f")));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#444")
    .text("Overjet (|Δx|)");
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#444")
    .text("Overbite (Δy)");

  return svg.node();
}
