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

const MEAS_COLORS = {
  "intercanino sup": "#7C3AED",
  "intermolar sup":  "#D97706",
  "intercanino inf": "#059669",
  "intermolar inf":  "#DB2777",
};

const MEAS_FDIS = {
  "intercanino sup": [13, 23],
  "intermolar sup":  [16, 26],
  "intercanino inf": [43, 33],
  "intermolar inf":  [46, 36],
};

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
  showLabels = false,
  showMeasurePoints = false,
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
  const unit = Math.min(innerW / dx, innerH / dy);
  const usedW = dx * unit;
  const usedH = dy * unit;
  const offX = (innerW - usedW) / 2;
  const offY = (innerH - usedH) / 2;
  const x = d3.scaleLinear().domain(xDomain).range([offX, offX + usedW]);
  const y = d3.scaleLinear().domain(yDomain).range([offY, offY + usedH]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Plano sagital
  g.append("line").attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#ddd").attr("stroke-dasharray", "3,3").attr("stroke-width", 1);

  const COLOR_UPPER = "#4e79a7";
  const COLOR_LOWER = "#e15759";
  const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

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
    function drawMeasure(measName) {
      const [fdi1, fdi2] = MEAS_FDIS[measName];
      const a = byFdi.get(fdi1), b = byFdi.get(fdi2);
      if (!a || !b) return;
      const color = MEAS_COLORS[measName];
      const ax = x(a.mean_x), ay = y(a.mean_y);
      const bx = x(b.mean_x), by = y(b.mean_y);

      g.append("line")
        .attr("x1", ax).attr("y1", ay).attr("x2", bx).attr("y2", by)
        .attr("stroke", color).attr("stroke-width", 1.3)
        .attr("stroke-dasharray", "5,3").attr("opacity", 0.9);
      g.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 2).attr("fill", color);
      g.append("circle").attr("cx", bx).attr("cy", by).attr("r", 2).attr("fill", color);

      if (showLabels) {
        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2;
        const offset = measName.includes("sup") ? -6 : 14;
        g.append("text").attr("x", midX).attr("y", midY + offset - 4)
          .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", color)
          .attr("font-weight", "bold")
          .text(`${measName}: ${dist(a, b).toFixed(3)}`);
      }
    }

    for (const measName of Object.keys(MEAS_COLORS)) drawMeasure(measName);

    // Leyenda de medidas — esquina superior derecha
    const measNames = Object.keys(MEAS_COLORS);
    const legW = 200;
    const legH = 14 + measNames.length * 18 + 6;
    const legX = innerW - legW - 4;
    const legY = 4;
    const measLeg = g.append("g").attr("transform", `translate(${legX},${legY})`);
    measLeg.append("rect").attr("width", legW).attr("height", legH)
      .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.95);
    measNames.forEach((measName, i) => {
      const [fdi1, fdi2] = MEAS_FDIS[measName];
      const a = byFdi.get(fdi1), b = byFdi.get(fdi2);
      const color = MEAS_COLORS[measName];
      const row = measLeg.append("g").attr("transform", `translate(8,${12 + i * 18})`);
      row.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 18).attr("y2", 0)
        .attr("stroke", color).attr("stroke-width", 2).attr("stroke-dasharray", "5,3");
      row.append("text").attr("x", 24).attr("y", 4)
        .attr("font-size", 10).attr("fill", color).text(measName);
      if (a && b) {
        row.append("text").attr("x", legW - 16).attr("y", 4)
          .attr("text-anchor", "end").attr("font-size", 10)
          .attr("fill", "#333").attr("font-weight", "bold")
          .text(dist(a, b).toFixed(3));
      }
    });
  }

  // Anillos sobre los puntos de medición (caninos y molares clave)
  if (showMeasurePoints) {
    const ringDefs = [
      {fdi: 13, meas: "intercanino sup", r: 6}, {fdi: 23, meas: "intercanino sup", r: 6},
      {fdi: 43, meas: "intercanino inf", r: 6}, {fdi: 33, meas: "intercanino inf", r: 6},
      {fdi: 16, meas: "intermolar sup",  r: 7}, {fdi: 26, meas: "intermolar sup",  r: 7},
      {fdi: 46, meas: "intermolar inf",  r: 7}, {fdi: 36, meas: "intermolar inf",  r: 7},
    ];
    for (const {fdi, meas, r} of ringDefs) {
      const s = byFdi.get(fdi);
      if (!s) continue;
      g.append("circle")
        .attr("cx", x(s.mean_x)).attr("cy", y(s.mean_y))
        .attr("r", r).attr("fill", "none")
        .attr("stroke", MEAS_COLORS[meas]).attr("stroke-width", 2);
    }
  }

  // Centroides de cada diente
  for (const s of toothStats) {
    const isSel = selSet.has(s.fdi);
    const isUpper = Math.floor(s.fdi / 10) <= 2;
    g.append("circle")
      .attr("cx", x(s.mean_x)).attr("cy", y(s.mean_y))
      .attr("r", isSel ? 5 : 3)
      .attr("fill", QUADRANT_COLORS[s.quadrant] ?? (isUpper ? COLOR_UPPER : COLOR_LOWER))
      .attr("stroke", "#fff").attr("stroke-width", 1.2)
      .attr("opacity", isSel ? 1 : 0.8);
    if (isSel) {
      g.append("text").attr("x", x(s.mean_x)).attr("y", y(s.mean_y) + (isUpper ? -8 : 16))
        .attr("text-anchor", "middle").attr("font-size", 10)
        .attr("font-weight", "bold").attr("fill", QUADRANT_COLORS[s.quadrant] ?? "#333")
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

  // Leyenda de arcadas — esquina superior izquierda
  const leg = g.append("g").attr("transform", "translate(8,6)");
  leg.append("rect").attr("width", 180).attr("height", 48)
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
