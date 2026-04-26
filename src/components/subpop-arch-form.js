/**
 * Arch-form comparativa entre dos subpoblaciones.
 *
 * Para cada grupo, dibuja dos splines (maxilar 18→28 y mandibular 48→38)
 * usando los centroides medios del grupo (cx_mean, cy_mean por FDI).
 * Reporta métricas clínicas (intercanino, intermolar, profundidad, ratio,
 * tipo de arcada) por grupo en una tabla compacta dentro del SVG.
 */
import * as d3 from "d3";

const ARCH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const ARCH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function dist(a, b) { return Math.hypot(a.cx_mean - b.cx_mean, a.cy_mean - b.cy_mean); }

function archMetricsForGroup(byFdi) {
  function compute(c1, c2, m1, m2, incs) {
    const C1 = byFdi.get(c1), C2 = byFdi.get(c2);
    const M1 = byFdi.get(m1), M2 = byFdi.get(m2);
    if (!C1 || !C2 || !M1 || !M2) return null;
    const intercanine = dist(C1, C2);
    const intermolar = dist(M1, M2);
    const midMolarY = (M1.cy_mean + M2.cy_mean) / 2;
    const incStats = incs.map(f => byFdi.get(f)).filter(Boolean);
    if (!incStats.length) return null;
    const frontY = d3.mean(incStats, s => s.cy_mean);
    const depth = Math.abs(midMolarY - frontY);
    const ratio = intermolar > 0 ? depth / intermolar : null;
    let shape = null;
    if (ratio != null) {
      shape = ratio > 0.85 ? "Triangular" : ratio < 0.70 ? "Cuadrada" : "Ovalada";
    }
    return {intercanine, intermolar, depth, ratio, shape};
  }
  return {
    maxilar:    compute(13, 23, 16, 26, [11, 21]),
    mandibular: compute(43, 33, 46, 36, [41, 31]),
  };
}

function archPath(arch, byFdi, x, y) {
  const pts = arch.map(f => byFdi.get(f)).filter(Boolean)
    .map(s => [x(s.cx_mean), y(s.cy_mean)]);
  return d3.line().curve(d3.curveCatmullRom.alpha(0.5))(pts);
}

/**
 * @param {Object} opts
 * @param {Array}  opts.subpopStats  - tooth_stats_subpop filtrado al eje
 * @param {Array}  opts.groupNames
 * @param {Object} opts.colorMap
 * @param {Object} [opts.labelMap]
 * @param {Array}  [opts.toothStats] - opcional, para mostrar contorno de población
 * @param {boolean} [opts.showPopulation=true]
 * @param {number} [opts.width=820]
 * @param {number} [opts.height=520]
 */
export function subpopArchForm({
  subpopStats,
  groupNames,
  colorMap,
  labelMap = {},
  toothStats = null,
  showPopulation = true,
  width = 820,
  height = 520,
} = {}) {
  // Index por grupo
  const byGroup = new Map();
  for (const gName of groupNames) byGroup.set(gName, new Map());
  for (const s of subpopStats) {
    const m = byGroup.get(s.group);
    if (m) m.set(s.fdi, s);
  }

  const margin = {top: 30, right: 30, bottom: 50, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Domain: usar todos los puntos disponibles (subpop + opcional pop)
  const allPts = [];
  for (const m of byGroup.values()) {
    for (const s of m.values()) allPts.push([s.cx_mean, s.cy_mean]);
  }
  if (showPopulation && toothStats) {
    for (const s of toothStats) allPts.push([s.mean_x, s.mean_y]);
  }
  if (!allPts.length) {
    const empty = d3.create("svg").attr("viewBox", [0, 0, width, height]).attr("width", width);
    empty.append("text").attr("x", width / 2).attr("y", height / 2)
      .attr("text-anchor", "middle").attr("fill", "#999").attr("font-size", 13)
      .text("Sin datos suficientes");
    return empty.node();
  }
  const xs = allPts.map(p => p[0]);
  const ys = allPts.map(p => p[1]);
  const padX = 0.05, padY = 0.05;
  const xDomain = [d3.min(xs) - padX, d3.max(xs) + padX];
  const yDomain = [d3.min(ys) - padY, d3.max(ys) + padY];
  const dx = xDomain[1] - xDomain[0];
  const dy = yDomain[1] - yDomain[0];
  // Aspecto isométrico
  const unit = Math.min(innerW / dx, innerH / dy);
  const usedW = dx * unit, usedH = dy * unit;
  const offX = (innerW - usedW) / 2, offY = (innerH - usedH) / 2;
  const x = d3.scaleLinear().domain(xDomain).range([offX, offX + usedW]);
  const y = d3.scaleLinear().domain(yDomain).range([offY, offY + usedH]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%").style("height", "auto");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Plano sagital
  g.append("line").attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#ddd").attr("stroke-dasharray", "3,3");

  // Splines de población (si está)
  if (showPopulation && toothStats) {
    const popMap = new Map(toothStats.map(s => [s.fdi, {cx_mean: s.mean_x, cy_mean: s.mean_y}]));
    for (const arch of [ARCH_UPPER, ARCH_LOWER]) {
      g.append("path")
        .attr("d", archPath(arch, popMap, x, y))
        .attr("fill", "none").attr("stroke", "#bbb").attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,4").attr("opacity", 0.7);
    }
  }

  // Splines por grupo
  groupNames.forEach((gName) => {
    const map = byGroup.get(gName);
    if (!map || !map.size) return;
    const color = colorMap[gName] || "#999";
    for (const arch of [ARCH_UPPER, ARCH_LOWER]) {
      g.append("path")
        .attr("d", archPath(arch, map, x, y))
        .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2.5)
        .attr("opacity", 0.85);
    }
    // Centroides
    for (const s of map.values()) {
      g.append("circle")
        .attr("cx", x(s.cx_mean)).attr("cy", y(s.cy_mean))
        .attr("r", 3).attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 1)
        .attr("opacity", 0.9)
        .append("title").text(`${labelMap[gName] || gName} · FDI ${s.fdi}\nμ=(${s.cx_mean.toFixed(3)}, ${s.cy_mean.toFixed(3)})\nn=${s.n}`);
    }
  });

  // Líneas de medida (intercanino / intermolar) por grupo.
  function drawMeasure(map, fdi1, fdi2, color, label, yOffset) {
    const a = map.get(fdi1), b = map.get(fdi2);
    if (!a || !b) return;
    const ax = x(a.cx_mean), ay = y(a.cy_mean);
    const bx = x(b.cx_mean), by = y(b.cy_mean);
    g.append("line")
      .attr("x1", ax).attr("y1", ay).attr("x2", bx).attr("y2", by)
      .attr("stroke", color).attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "5,3").attr("opacity", 0.85);
    g.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 2.5).attr("fill", color);
    g.append("circle").attr("cx", bx).attr("cy", by).attr("r", 2.5).attr("fill", color);
    const distVal = Math.hypot(a.cx_mean - b.cx_mean, a.cy_mean - b.cy_mean);
    g.append("text").attr("x", (ax + bx) / 2).attr("y", (ay + by) / 2 + yOffset)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", color)
      .attr("font-weight", "bold")
      .text(`${label}: ${distVal.toFixed(3)}`);
  }
  groupNames.forEach((gName, gi) => {
    const map = byGroup.get(gName);
    if (!map || !map.size) return;
    const color = colorMap[gName] || "#999";
    // Para que las etiquetas no se pisen entre grupos, alterno el offset vertical.
    const sign = gi === 0 ? -1 : 1;
    drawMeasure(map, 13, 23, color, `intercanino sup (${labelMap[gName] || gName})`, -8 + sign * -6);
    drawMeasure(map, 16, 26, color, `intermolar sup (${labelMap[gName] || gName})`,  -8 + sign * -6);
    drawMeasure(map, 43, 33, color, `intercanino inf (${labelMap[gName] || gName})`, 16 + sign * 6);
    drawMeasure(map, 46, 36, color, `intermolar inf (${labelMap[gName] || gName})`,  16 + sign * 6);
  });

  // Ejes
  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
  g.append("g").call(d3.axisLeft(y).ticks(8));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Métricas comparativas
  const metricsByGroup = new Map();
  for (const gName of groupNames) {
    const map = byGroup.get(gName);
    if (map && map.size) metricsByGroup.set(gName, archMetricsForGroup(map));
  }

  // Leyenda
  const leg = g.append("g").attr("transform", "translate(8,6)");
  const lh = 18 + groupNames.length * 16 + (showPopulation ? 16 : 0);
  leg.append("rect").attr("width", 230).attr("height", lh)
    .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.95);
  let yL = 16;
  if (showPopulation && toothStats) {
    leg.append("line").attr("x1", 10).attr("y1", yL).attr("x2", 30).attr("y2", yL)
      .attr("stroke", "#bbb").attr("stroke-width", 2).attr("stroke-dasharray", "5,4");
    leg.append("text").attr("x", 36).attr("y", yL + 3).attr("font-size", 11).attr("fill", "#666")
      .text("Población completa");
    yL += 16;
  }
  groupNames.forEach((gName) => {
    const m = metricsByGroup.get(gName);
    leg.append("line").attr("x1", 10).attr("y1", yL).attr("x2", 30).attr("y2", yL)
      .attr("stroke", colorMap[gName]).attr("stroke-width", 2.5);
    const shapeUp = m?.maxilar?.shape;
    const shapeLo = m?.mandibular?.shape;
    const txt = `${labelMap[gName] || gName}` + (shapeUp ? ` (${shapeUp.charAt(0)}/${shapeLo?.charAt(0) || "?"})` : "");
    leg.append("text").attr("x", 36).attr("y", yL + 3).attr("font-size", 11).attr("fill", "#333")
      .text(txt);
    yL += 16;
  });

  return {node: svg.node(), metrics: Object.fromEntries(metricsByGroup)};
}
