/**
 * Radar Polar — dispersión angular de los 32 dientes.
 *
 * Los 32 FDI se disponen como spokes en orden anatómico (18→11→21→28 arriba,
 * 48→41→31→38 abajo). El radio de cada spoke representa la dispersión
 * angular (std_angle o IQR). Permite comparar de un vistazo qué dientes
 * tienen más variabilidad rotacional.
 *
 * Opcionalmente puede superponer el ángulo mediano como segunda serie.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

// Anatomical order: upper 18→11→21→28 then lower 48→41→31→38
const FDI_ORDER = [
  18,17,16,15,14,13,12,11,
  21,22,23,24,25,26,27,28,
  38,37,36,35,34,33,32,31,
  41,42,43,44,45,46,47,48
];

/**
 * @param {Object} opts
 * @param {Array} opts.boxplotStats - tooth_boxplot_stats.json
 * @param {Array} opts.toothStats   - tooth_stats.json
 * @param {Array<number>} opts.selectedFdi - highlighted FDI
 * @param {string} opts.metric - "std" | "iqr" | "whisker_range"
 * @param {number} opts.width
 * @param {number} opts.height
 */
export function radarAngularPlot({boxplotStats, toothStats, selectedFdi = [], metric = "iqr", width = 600, height = 600} = {}) {
  const margin = 60;
  const radius = Math.min(width, height) / 2 - margin;

  const selectedSet = new Set(selectedFdi);
  const hasSelection = selectedSet.size > 0;

  // Build lookups
  const bpByFdi = {};
  for (const b of boxplotStats) bpByFdi[b.fdi] = b;
  const statsByFdi = {};
  for (const s of toothStats) statsByFdi[s.fdi] = s;

  // Filter to available FDIs in order
  const fdis = FDI_ORDER.filter(f => bpByFdi[f]);
  const n = fdis.length;
  const angleSlice = (2 * Math.PI) / n;

  // Compute metric values
  function getValue(fdi) {
    const bp = bpByFdi[fdi];
    const st = statsByFdi[fdi];
    if (!bp) return 0;
    if (metric === "std") return st?.std_angle ?? 0;
    if (metric === "iqr") return bp.q3_angle - bp.q1_angle;
    if (metric === "whisker_range") return bp.whi_angle - bp.wlo_angle;
    return 0;
  }

  const values = fdis.map(f => getValue(f));
  const maxVal = d3.max(values) * 1.1;

  const rScale = d3.scaleLinear().domain([0, maxVal]).range([0, radius]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  // Concentric grid circles
  const levels = 5;
  for (let i = 1; i <= levels; i++) {
    const r = (radius / levels) * i;
    g.append("circle")
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-dasharray", i === levels ? "none" : "2,2");
    // Value label
    g.append("text")
      .attr("x", 4).attr("y", -r - 2)
      .attr("font-size", 9).attr("fill", "#aaa")
      .text(`${(maxVal / levels * i).toFixed(1)}°`);
  }

  // Spokes + labels
  for (let i = 0; i < n; i++) {
    const angle = angleSlice * i - Math.PI / 2;
    const fdi = fdis[i];
    const quadrant = Math.floor(fdi / 10);

    // Spoke line (d3.lineRadial convention: x=sin, y=-cos)
    g.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", radius * Math.sin(angle))
      .attr("y2", -radius * Math.cos(angle))
      .attr("stroke", "#e8e8e8")
      .attr("stroke-width", 0.5);

    // FDI label
    const labelR = radius + 14;
    const lx = labelR * Math.sin(angle);
    const ly = -labelR * Math.cos(angle);
    const selected = selectedSet.has(fdi);
    const dimmed = hasSelection && !selected;
    g.append("text")
      .attr("x", lx).attr("y", ly)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", dimmed ? 8 : 10)
      .attr("font-weight", selected ? "bold" : "normal")
      .attr("fill", dimmed ? "#ccc" : QUADRANT_COLORS[quadrant] || "#666")
      .text(fdi);
  }

  // Filled polygon (IQR/std area)
  const line = d3.lineRadial()
    .angle((d, i) => angleSlice * i - Math.PI / 2)
    .radius((d, i) => rScale(getValue(fdis[i])))
    .curve(d3.curveLinearClosed);

  // Area fill
  g.append("path")
    .attr("d", line(fdis))
    .attr("fill", "#4e79a7")
    .attr("fill-opacity", 0.15)
    .attr("stroke", "#4e79a7")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6);

  // Dots at vertices
  for (let i = 0; i < n; i++) {
    const fdi = fdis[i];
    const angle = angleSlice * i - Math.PI / 2;
    const r = rScale(getValue(fdi));
    const quadrant = Math.floor(fdi / 10);
    const selected = selectedSet.has(fdi);
    const dimmed = hasSelection && !selected;
    const color = QUADRANT_COLORS[quadrant] || "#999";

    g.append("circle")
      .attr("cx", r * Math.sin(angle))
      .attr("cy", -r * Math.cos(angle))
      .attr("r", dimmed ? 2 : 4)
      .attr("fill", dimmed ? "#ddd" : color)
      .attr("stroke", dimmed ? "none" : "white")
      .attr("stroke-width", 1);

    // Tooltip
    if (!dimmed) {
      const val = getValue(fdi);
      const bp = bpByFdi[fdi];
      g.append("title")
        .text(`FDI ${fdi}\n${metric === "iqr" ? "IQR" : metric === "std" ? "Desv. est." : "Rango whisker"}: ${val.toFixed(1)}°\nMediana: ${bp.med_angle.toFixed(1)}°`);
    }
  }

  // Quadrant separation lines (between upper/lower and left/right)
  const separators = [
    {label: "Q1←→Q2", idx: 7.5},   // between 11 and 21
    {label: "Q2←→Q3", idx: 15.5},  // between 28 and 38
    {label: "Q3←→Q4", idx: 23.5},  // between 31 and 41
  ];
  for (const sep of separators) {
    const angle = angleSlice * sep.idx - Math.PI / 2;
    g.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", (radius + 5) * Math.sin(angle))
      .attr("y2", -(radius + 5) * Math.cos(angle))
      .attr("stroke", "#bbb")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
  }

  // Title
  const metricLabel = metric === "iqr" ? "IQR angular" : metric === "std" ? "Desv. est. angular" : "Rango whisker angular";
  svg.append("text")
    .attr("x", width / 2).attr("y", 18)
    .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#555")
    .text(`Dispersión angular por diente — ${metricLabel}`);

  return svg.node();
}
