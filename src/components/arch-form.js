/**
 * Forma de arcada dental (arch form).
 *
 * Dibuja un spline suave pasando por los centroides medios de cada
 * arcada (superior/inferior). Reporta medidas clínicas clásicas:
 *   - Ancho intercanino: distancia 13↔23 (maxilar) y 33↔43 (mandibular)
 *   - Ancho intermolar: distancia 16↔26 (maxilar) y 36↔46 (mandibular)
 *   - Profundidad de arco: distancia media incisivos → línea intermolar
 *
 * Clasificación aproximada (tipo Ricketts):
 *   - Ovalada:     ratio_ancho_largo ≈ 0.65–0.75
 *   - Cuadrada:    ratio > 0.75 (más ancha que larga)
 *   - Triangular:  ratio < 0.65 (más larga que ancha)
 */
import * as d3 from "d3";

// Orden anatómico de cada arcada (de molar a molar, pasando por el centro)
export const ARCH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function dist(a, b) {
  return Math.hypot(a.mean_x - b.mean_x, a.mean_y - b.mean_y);
}

/** Calcula medidas clínicas a partir de tooth_stats. */
export function computeArchMetrics(toothStats) {
  const byFdi = new Map(toothStats.map(s => [s.fdi, s]));
  const res = {};

  function archMetrics(prefix, fdiCanine1, fdiCanine2, fdiMolar1, fdiMolar2, incisivos) {
    const c1 = byFdi.get(fdiCanine1), c2 = byFdi.get(fdiCanine2);
    const m1 = byFdi.get(fdiMolar1), m2 = byFdi.get(fdiMolar2);
    if (!c1 || !c2 || !m1 || !m2) return null;
    const intercanine = dist(c1, c2);
    const intermolar = dist(m1, m2);
    // Profundidad: distancia desde línea intermolar (eje Y medio de los molares)
    // al incisivo medio (promedio Y de los incisivos centrales).
    const midMolarY = (m1.mean_y + m2.mean_y) / 2;
    const incStats = incisivos.map(f => byFdi.get(f)).filter(Boolean);
    if (incStats.length === 0) return null;
    const frontY = d3.mean(incStats, s => s.mean_y);
    const depth = Math.abs(midMolarY - frontY);
    const ratio = intermolar > 0 ? depth / intermolar : null;
    let shape = null;
    if (ratio != null) {
      if (ratio > 0.85) shape = "Triangular";
      else if (ratio < 0.70) shape = "Cuadrada";
      else shape = "Ovalada";
    }
    res[prefix] = {intercanine, intermolar, depth, ratio, shape};
  }

  archMetrics("maxilar",    13, 23, 16, 26, [11, 21]);
  archMetrics("mandibular", 43, 33, 46, 36, [41, 31]);
  return res;
}

/** Construye un spline para la arcada. */
function archPath(arch, byFdi, x, y) {
  const pts = arch.map(f => byFdi.get(f)).filter(Boolean)
    .map(s => [x(s.mean_x), y(s.mean_y)]);
  const line = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
  return line(pts);
}

export function archForm({
  toothStats,
  selectedFdi = [],
  showMeasurements = true,
  width = 800,
  height = 500,
} = {}) {
  const byFdi = new Map(toothStats.map(s => [s.fdi, s]));
  const metrics = computeArchMetrics(toothStats);
  const selSet = new Set(selectedFdi);

  const margin = {top: 30, right: 30, bottom: 50, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%").style("height", "auto");

  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const padX = 0.05, padY = 0.05;
  const xDomain = [d3.min(xs) - padX, d3.max(xs) + padX];
  const yDomain = [d3.min(ys) - padY, d3.max(ys) + padY];
  const dx = xDomain[1] - xDomain[0];
  const dy = yDomain[1] - yDomain[0];
  // Aspecto 1:1 (isométrico) para no deformar la forma de la arcada.
  const unit = Math.min(innerW / dx, innerH / dy);
  const usedW = dx * unit;
  const usedH = dy * unit;
  const offX = (innerW - usedW) / 2;
  const offY = (innerH - usedH) / 2;
  const x = d3.scaleLinear().domain(xDomain).range([offX, offX + usedW]);
  // Maxilar arriba (Y menor arriba): mapeo directo.
  const y = d3.scaleLinear().domain(yDomain).range([offY, offY + usedH]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Plano sagital
  g.append("line").attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#ddd").attr("stroke-dasharray", "3,3").attr("stroke-width", 1);

  // Splines de las arcadas
  const COLOR_UPPER = "#4e79a7";
  const COLOR_LOWER = "#e15759";

  g.append("path")
    .attr("d", archPath(ARCH_UPPER, byFdi, x, y))
    .attr("fill", "none")
    .attr("stroke", COLOR_UPPER).attr("stroke-width", 2.5)
    .attr("opacity", 0.85);

  g.append("path")
    .attr("d", archPath(ARCH_LOWER, byFdi, x, y))
    .attr("fill", "none")
    .attr("stroke", COLOR_LOWER).attr("stroke-width", 2.5)
    .attr("opacity", 0.85);

  // Medidas clínicas
  if (showMeasurements) {
    function drawMeasure(fdi1, fdi2, color, label, offset = 0) {
      const a = byFdi.get(fdi1), b = byFdi.get(fdi2);
      if (!a || !b) return;
      const ax = x(a.mean_x), ay = y(a.mean_y);
      const bx = x(b.mean_x), by = y(b.mean_y);
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2 + offset;
      g.append("line")
        .attr("x1", ax).attr("y1", ay).attr("x2", bx).attr("y2", by)
        .attr("stroke", color).attr("stroke-width", 1.3)
        .attr("stroke-dasharray", "5,3").attr("opacity", 0.9);
      g.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 2).attr("fill", color);
      g.append("circle").attr("cx", bx).attr("cy", by).attr("r", 2).attr("fill", color);
      const distPx = dist(a, b);
      g.append("text").attr("x", midX).attr("y", midY - 4)
        .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", color)
        .attr("font-weight", "bold")
        .text(`${label}: ${distPx.toFixed(3)}`);
    }
    drawMeasure(13, 23, "#2a6a9e", "intercanino sup", -6);
    drawMeasure(16, 26, "#2a6a9e", "intermolar sup", -6);
    drawMeasure(43, 33, "#a84038", "intercanino inf", 14);
    drawMeasure(46, 36, "#a84038", "intermolar inf", 14);
  }

  // Centroides de cada diente
  for (const s of toothStats) {
    const isSel = selSet.has(s.fdi);
    const isUpper = Math.floor(s.fdi / 10) <= 2;
    g.append("circle")
      .attr("cx", x(s.mean_x)).attr("cy", y(s.mean_y))
      .attr("r", isSel ? 5 : 3)
      .attr("fill", isUpper ? COLOR_UPPER : COLOR_LOWER)
      .attr("stroke", "#fff").attr("stroke-width", 1.2)
      .attr("opacity", isSel ? 1 : 0.8);
    if (isSel) {
      g.append("text").attr("x", x(s.mean_x)).attr("y", y(s.mean_y) + (isUpper ? -8 : 16))
        .attr("text-anchor", "middle").attr("font-size", 10)
        .attr("font-weight", "bold").attr("fill", "#333")
        .text(String(s.fdi));
    }
  }

  // Ejes
  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
  g.append("g").call(d3.axisLeft(y).ticks(8));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Leyenda
  const leg = g.append("g").attr("transform", "translate(8,6)");
  leg.append("rect").attr("width", 230).attr("height", 48)
    .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.95);
  leg.append("line").attr("x1", 10).attr("y1", 16).attr("x2", 30).attr("y2", 16)
    .attr("stroke", COLOR_UPPER).attr("stroke-width", 2.5);
  leg.append("text").attr("x", 36).attr("y", 20).attr("font-size", 11).attr("fill", "#333")
    .text(`Maxilar${metrics.maxilar?.shape ? ` (${metrics.maxilar.shape})` : ""}`);
  leg.append("line").attr("x1", 10).attr("y1", 36).attr("x2", 30).attr("y2", 36)
    .attr("stroke", COLOR_LOWER).attr("stroke-width", 2.5);
  leg.append("text").attr("x", 36).attr("y", 40).attr("font-size", 11).attr("fill", "#333")
    .text(`Mandibular${metrics.mandibular?.shape ? ` (${metrics.mandibular.shape})` : ""}`);

  return svg.node();
}
