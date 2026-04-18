/**
 * Renderiza KDE heatmaps para dientes seleccionados.
 * Cada diente tiene su propia grilla y extent.
 * Escala fija (eigendentadura completa) + zoom/pan con scroll y drag.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {
  1: "#4e79a7",
  2: "#59a14f",
  3: "#edc949",
  4: "#e15759",
};

/**
 * @param {Object} options
 * @param {Array<number>} options.selectedFdi
 * @param {Object} options.kdeGrids - {grid_size, teeth: {fdi: {extent, values}}}
 * @param {Array<Object>} options.toothStats
 * @param {number} [options.width=800]
 * @param {number} [options.height=550]
 */
export function kdePlot({selectedFdi, kdeGrids, toothStats, width = 800, height = 550} = {}) {
  const {grid_size, teeth: kdeTeeth} = kdeGrids;
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  // Clip path so zoomed content doesn't overflow
  svg.append("defs").append("clipPath")
    .attr("id", "plot-clip")
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerH);

  const gOuter = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Axes groups (will be updated on zoom)
  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");

  // Clipped content group
  const gClip = gOuter.append("g").attr("clip-path", "url(#plot-clip)");
  const g = gClip.append("g"); // This group gets transformed by zoom

  // Fixed extent: full eigendentadura
  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const viewExtent = {
    x_min: d3.min(xs) - 0.3, x_max: d3.max(xs) + 0.3,
    y_min: d3.min(ys) - 0.3, y_max: d3.max(ys) + 0.3,
  };

  const xScale0 = d3.scaleLinear().domain([viewExtent.x_min, viewExtent.x_max]).range([0, innerW]);
  // Y crece hacia abajo (como en imagen): superiores (y≈0.15) arriba, inferiores (y≈0.27) abajo
  const yScale0 = d3.scaleLinear().domain([viewExtent.y_min, viewExtent.y_max]).range([0, innerH]);
  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  // Axis label texts
  gOuter.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Helper: draw everything with current scales
  function draw() {
    g.selectAll("*").remove();

    // KDE contours for selected teeth
    for (const fdi of selectedFdi) {
      const td = kdeTeeth[String(fdi)];
      if (!td) continue;

      const n = grid_size;
      const e = td.extent;
      const q = Math.floor(fdi / 10);
      const baseColor = QUADRANT_COLORS[q];

      const contours = d3.contours()
        .size([n, n])
        .thresholds(d3.range(0.05, 1.01, 0.05))(td.values);

      const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(t => { const c = d3.color(baseColor); c.opacity = t * 0.7; return c + ""; });

      const xGrid = d3.scaleLinear().domain([0, n]).range([e.x_min, e.x_max]);
      const yGrid = d3.scaleLinear().domain([0, n]).range([e.y_min, e.y_max]);

      const path = d3.geoPath(d3.geoTransform({
        point(x, y) { this.stream.point(xScale(xGrid(x)), yScale(yGrid(y))); }
      }));

      g.append("g").selectAll("path").data(contours).join("path")
        .attr("d", path)
        .attr("fill", d => colorScale(d.value))
        .attr("stroke", baseColor)
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.5);
    }

    // Eigendentadura centroids + σ ellipses
    const selectedSet = new Set(selectedFdi);
    const statsMap = new Map(toothStats.map(s => [s.fdi, s]));

    // Draw σ ellipses for selected teeth (behind centroids)
    for (const fdi of selectedFdi) {
      const s = statsMap.get(fdi);
      if (!s) continue;
      const q = Math.floor(fdi / 10);
      const baseColor = QUADRANT_COLORS[q];

      // Covariance matrix eigendecomposition for ellipse
      const varX = s.std_x * s.std_x;
      const varY = s.std_y * s.std_y;
      const cov = s.cov_xy;
      const trace = varX + varY;
      const det = varX * varY - cov * cov;
      const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
      const lambda1 = (trace + disc) / 2;
      const lambda2 = (trace - disc) / 2;
      const angle = Math.atan2(2 * cov, varX - varY) / 2;  // radians

      // Semi-axes in data coords
      const a1 = Math.sqrt(lambda1);
      const a2 = Math.sqrt(lambda2);

      // Draw 2σ and 1σ ellipses
      for (const nSigma of [2, 1]) {
        const rx = a1 * nSigma;
        const ry = a2 * nSigma;

        // Generate ellipse path in data coordinates, then project
        const nPts = 64;
        const pts = [];
        for (let i = 0; i <= nPts; i++) {
          const t = (i / nPts) * 2 * Math.PI;
          const ex = rx * Math.cos(t);
          const ey = ry * Math.sin(t);
          // Rotate by eigenvector angle
          const dx = ex * Math.cos(angle) - ey * Math.sin(angle);
          const dy = ex * Math.sin(angle) + ey * Math.cos(angle);
          pts.push([xScale(s.mean_x + dx), yScale(s.mean_y + dy)]);
        }

        g.append("path")
          .attr("d", d3.line()(pts))
          .attr("fill", "none")
          .attr("stroke", baseColor)
          .attr("stroke-width", nSigma === 1 ? 2 : 1.5)
          .attr("stroke-dasharray", nSigma === 2 ? "6,4" : "none")
          .attr("opacity", 0.8);

        // Label
        const labelPt = pts[0]; // rightmost point of ellipse
        g.append("text")
          .attr("x", labelPt[0] + 3).attr("y", labelPt[1] - 2)
          .attr("font-size", 9).attr("fill", baseColor).attr("opacity", 0.8)
          .text(`${nSigma}σ`);
      }
    }

    for (const s of toothStats) {
      const cx = xScale(s.mean_x);
      const cy = yScale(s.mean_y);

      const isSel = selectedSet.has(s.fdi);
      const q = Math.floor(s.fdi / 10);

      g.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", isSel ? 5 : 3)
        .attr("fill", isSel ? QUADRANT_COLORS[q] : "#ccc")
        .attr("stroke", isSel ? "#333" : "#aaa")
        .attr("stroke-width", isSel ? 1.5 : 0.5)
        .attr("opacity", isSel ? 1 : 0.5);

      if (isSel) {
        g.append("text").attr("x", cx).attr("y", cy - 9)
          .attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", "bold")
          .attr("fill", QUADRANT_COLORS[q]).text(String(s.fdi));
      }
    }

    if (selectedFdi.length === 0) {
      g.append("text").attr("x", innerW / 2).attr("y", innerH / 2)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#999")
        .text("Seleccioná uno o más dientes en el odontograma ↑");
    }

    // Update axes
    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(8));
  }

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 40])
    .on("zoom", (event) => {
      xScale = event.transform.rescaleX(xScale0);
      yScale = event.transform.rescaleY(yScale0);
      draw();
    });

  // Invisible rect to capture mouse events
  gOuter.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom)
    .on("dblclick.zoom", () => {
      // Double-click resets zoom
      gOuter.select("rect").transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

  // Initial draw
  draw();

  // Hint text
  gOuter.append("text")
    .attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}
