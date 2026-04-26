/**
 * Heatmap FDI × feature mostrando la diferencia entre dos subpoblaciones
 * en σ pooled. Filas = features (cx, cy, angle), columnas = FDI en orden
 * anatómico. Color divergente RdBu centrado en 0.
 */
import * as d3 from "d3";

const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const FEATURES = ["cx", "cy", "angle"];
const FEATURE_LABELS = {cx: "Posición X", cy: "Posición Y", angle: "Ángulo"};

/**
 * @param {Object} options
 * @param {Array<Object>} options.axisData    - subset de tooth_stats_subpop con un único axis
 * @param {Array<string>} options.groupNames  - 2 grupos a comparar
 * @param {Object}        options.labelMap    - {group: human label}
 * @param {number}        [options.width=900]
 */
export function subpopDiffHeatmap({axisData, groupNames, labelMap, width = 900} = {}) {
  const fdis = [...new Set(axisData.map(d => d.fdi))].sort((a, b) => a - b);

  const diffs = [];
  for (const fdi of fdis) {
    const byFdi = axisData.filter(d => d.fdi === fdi);
    const g1 = byFdi.find(d => d.group === groupNames[0]);
    const g2 = byFdi.find(d => d.group === groupNames[1]);
    if (!g1 || !g2) continue;

    for (const feat of FEATURES) {
      const m1 = feat === "angle" ? g1.angle_mean : g1[`${feat}_mean`];
      const m2 = feat === "angle" ? g2.angle_mean : g2[`${feat}_mean`];
      const s1 = feat === "angle" ? g1.angle_std : g1[`${feat}_std`];
      const s2 = feat === "angle" ? g2.angle_std : g2[`${feat}_std`];
      const pooled = Math.sqrt((s1 * s1 + s2 * s2) / 2);
      const diffSd = pooled > 0 ? (m1 - m2) / pooled : 0;
      diffs.push({fdi, feature: feat, diffSd, m1, m2});
    }
  }

  const order = [...UPPER_ROW, ...LOWER_ROW].filter(f => fdis.includes(f));
  const cellW = Math.max(18, Math.min(30, (width - 120) / order.length));
  const cellH = 30;
  const margin = {top: 30, right: 20, bottom: 85, left: 80};
  const svgW = margin.left + order.length * cellW + margin.right;
  const svgH = margin.top + FEATURES.length * cellH + margin.bottom;

  const maxAbs = d3.max(diffs, d => Math.abs(d.diffSd)) || 1;
  const color = d3.scaleDiverging().domain([-maxAbs, 0, maxAbs]).interpolator(d3.interpolateRdBu);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, svgW, svgH])
    .attr("width", svgW)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  for (const d of diffs) {
    const col = order.indexOf(d.fdi);
    const row = FEATURES.indexOf(d.feature);
    if (col < 0 || row < 0) continue;
    const rect = g.append("rect")
      .attr("x", col * cellW).attr("y", row * cellH)
      .attr("width", cellW - 1).attr("height", cellH - 1)
      .attr("fill", color(d.diffSd)).attr("rx", 2);
    rect.append("title").text(
      `FDI ${d.fdi} — ${FEATURE_LABELS[d.feature]}\n` +
      `Diff: ${d.diffSd.toFixed(3)} σ\n` +
      `${labelMap[groupNames[0]]}: ${d.m1.toFixed(4)}\n` +
      `${labelMap[groupNames[1]]}: ${d.m2.toFixed(4)}`
    );
  }

  // Quadrant separator
  g.append("line")
    .attr("x1", 8 * cellW - 0.5).attr("x2", 8 * cellW - 0.5)
    .attr("y1", 0).attr("y2", FEATURES.length * cellH)
    .attr("stroke", "#333").attr("stroke-width", 1.5);

  for (let i = 0; i < order.length; i++) {
    g.append("text")
      .attr("x", i * cellW + cellW / 2)
      .attr("y", FEATURES.length * cellH + 14)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#555")
      .attr("transform", `rotate(45, ${i * cellW + cellW / 2}, ${FEATURES.length * cellH + 14})`)
      .text(order[i]);
  }
  for (let i = 0; i < FEATURES.length; i++) {
    g.append("text")
      .attr("x", -6).attr("y", i * cellH + cellH / 2 + 1)
      .attr("text-anchor", "end").attr("dominant-baseline", "central")
      .attr("font-size", 11).attr("fill", "#333")
      .text(FEATURE_LABELS[FEATURES[i]]);
  }

  svg.append("text")
    .attr("x", svgW / 2).attr("y", 18)
    .attr("text-anchor", "middle").attr("font-size", 13)
    .attr("fill", "#333").attr("font-weight", 600)
    .text(`Diferencia (${labelMap[groupNames[0]]} − ${labelMap[groupNames[1]]}) en σ`);

  // Legend
  const legendW = Math.min(220, svgW * 0.4);
  const legendH = 12;
  const legendX = margin.left;
  const legendY = svgH - 18;

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "subpop-diff-grad");
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    grad.append("stop")
      .attr("offset", `${(t * 100).toFixed(1)}%`)
      .attr("stop-color", color(-maxAbs + t * 2 * maxAbs));
  }
  svg.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", legendH)
    .attr("fill", "url(#subpop-diff-grad)")
    .attr("stroke", "#ccc").attr("stroke-width", 0.5).attr("rx", 2);

  const fmt = d3.format(".2f");
  svg.append("text")
    .attr("x", legendX).attr("y", legendY - 4)
    .attr("text-anchor", "start").attr("font-size", 10)
    .attr("fill", color(-maxAbs)).attr("font-weight", 600)
    .text(`−${fmt(maxAbs)}σ`);
  svg.append("text")
    .attr("x", legendX + legendW / 2).attr("y", legendY - 4)
    .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#999").text("0");
  svg.append("text")
    .attr("x", legendX + legendW).attr("y", legendY - 4)
    .attr("text-anchor", "end").attr("font-size", 10)
    .attr("fill", color(maxAbs)).attr("font-weight", 600)
    .text(`+${fmt(maxAbs)}σ`);
  svg.append("text")
    .attr("x", legendX).attr("y", legendY + legendH + 11)
    .attr("text-anchor", "start").attr("font-size", 9).attr("fill", "#888")
    .text(`← ${labelMap[groupNames[1]]} mayor`);
  svg.append("text")
    .attr("x", legendX + legendW).attr("y", legendY + legendH + 11)
    .attr("text-anchor", "end").attr("font-size", 9).attr("fill", "#888")
    .text(`${labelMap[groupNames[0]]} mayor →`);

  return svg.node();
}
