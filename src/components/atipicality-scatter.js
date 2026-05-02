/**
 * Scatter atipicidad posicional vs angular.
 * Eje X = z_pos (desvío medio en cx/cy), Eje Y = z_ang (desvío medio en ángulo).
 * Cada punto = una pantomografía.
 */
import * as d3 from "d3";

export function atipicalityScatter(scores, {
  width = 680,
  height = 480,
  colorBy = "origin",   // "origin" | "sex" | "n_teeth"
  minTeeth = 10,
  selectedPanto = null,
} = {}) {
  const data = scores.filter(d => d.n_teeth >= minTeeth && d.z_pos != null && d.z_ang != null);

  const M = {top: 20, right: 160, bottom: 50, left: 55};
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;

  const xExt = d3.extent(data, d => d.z_pos);
  const yExt = d3.extent(data, d => d.z_ang);
  const pad = 0.3;
  const xScale = d3.scaleLinear().domain([xExt[0] - pad, xExt[1] + pad]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([yExt[0] - pad, yExt[1] + pad]).range([innerH, 0]);

  // Color scale
  const origins = [...new Set(data.map(d => d.data_origin).filter(Boolean))].sort();
  const sexes   = [...new Set(data.map(d => d.sex).filter(Boolean))].sort();
  const colorScaleOrig = d3.scaleOrdinal(["#4e79a7","#e15759","#59a14f","#f28e2b"]).domain(origins);
  const colorScaleSex  = d3.scaleOrdinal(["#4e79a7","#e15759"]).domain(sexes);
  const colorScaleN    = d3.scaleSequential(d3.interpolateViridis).domain(d3.extent(data, d => d.n_teeth));

  function getColor(d) {
    if (colorBy === "origin") return colorScaleOrig(d.data_origin) ?? "#aaa";
    if (colorBy === "sex")    return d.sex ? colorScaleSex(d.sex) : "#ccc";
    return colorScaleN(d.n_teeth);
  }

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  svg.append("defs").append("clipPath").attr("id", "atip-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const g = gOuter.append("g").attr("clip-path", "url(#atip-clip)");

  // Grid
  gOuter.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("y1",-innerH));
  gOuter.append("g").call(d3.axisLeft(yScale).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",innerW));

  gOuter.append("text").attr("x", innerW/2).attr("y", innerH + 40)
    .attr("text-anchor","middle").attr("font-size",11).attr("fill","#666")
    .text("Atipicidad posicional (z_pos = desvío promedio en cx/cy)");
  gOuter.append("text").attr("transform","rotate(-90)").attr("x",-innerH/2).attr("y",-42)
    .attr("text-anchor","middle").attr("font-size",11).attr("fill","#666")
    .text("Atipicidad angular (z_ang = desvío promedio en ángulo)");

  // Quadrant labels
  const Q_STYLE = {font: "10px sans-serif", fill: "#bbb"};
  [
    [0.05, 0.05,  "Típico (posición + ángulo)"],
    [0.65, 0.05,  "Atípico posicional"],
    [0.05, 0.82,  "Atípico angular"],
    [0.65, 0.82,  "Atípico (posición + ángulo)"],
  ].forEach(([rx, ry, label]) => {
    gOuter.append("text")
      .attr("x", innerW * rx).attr("y", innerH * ry + 12)
      .attr("font-size", 9).attr("fill", "#ccc").text(label);
  });

  // Reference lines at median
  const medX = d3.median(data, d => d.z_pos);
  const medY = d3.median(data, d => d.z_ang);
  g.append("line").attr("x1", xScale(medX)).attr("y1", 0).attr("x2", xScale(medX)).attr("y2", innerH)
    .attr("stroke","#bbb").attr("stroke-dasharray","4,3").attr("stroke-width",1);
  g.append("line").attr("x1", 0).attr("y1", yScale(medY)).attr("x2", innerW).attr("y2", yScale(medY))
    .attr("stroke","#bbb").attr("stroke-dasharray","4,3").attr("stroke-width",1);

  // Points
  g.selectAll("circle").data(data).join("circle")
    .attr("cx", d => xScale(d.z_pos))
    .attr("cy", d => yScale(d.z_ang))
    .attr("r", d => selectedPanto === d.json_filename ? 6 : 2.5)
    .attr("fill", d => getColor(d))
    .attr("opacity", d => selectedPanto === d.json_filename ? 1 : 0.45)
    .attr("stroke", d => selectedPanto === d.json_filename ? "#222" : "none")
    .attr("stroke-width", 1.5)
    .append("title").text(d =>
      `${d.json_filename}\n${d.data_origin ?? "–"} · ${d.sex ?? "–"} · ${d.n_teeth} dientes\nz_pos=${d.z_pos} · z_ang=${d.z_ang}`
    );

  // Legend
  const lx = innerW + 16;
  const items = colorBy === "origin" ? origins.map(o => ({label: o, color: colorScaleOrig(o)}))
              : colorBy === "sex"    ? sexes.map(s => ({label: s, color: colorScaleSex(s)}))
              : [];
  if (items.length) {
    gOuter.append("text").attr("x", lx).attr("y", 10)
      .attr("font-size", 9).attr("fill", "#888").attr("font-weight","bold")
      .text(colorBy === "origin" ? "Centro" : "Sexo");
    items.forEach(({label, color}, i) => {
      gOuter.append("circle").attr("cx", lx + 5).attr("cy", 24 + i * 18)
        .attr("r", 5).attr("fill", color).attr("opacity", 0.8);
      gOuter.append("text").attr("x", lx + 14).attr("y", 28 + i * 18)
        .attr("font-size", 10).attr("fill", "#333").text(label ?? "N/A");
    });
  }

  return svg.node();
}
