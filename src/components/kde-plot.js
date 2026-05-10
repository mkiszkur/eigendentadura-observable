/**
 * Renderiza KDE heatmaps para dientes seleccionados (población completa).
 * Escala fija (eigendentadura completa) + zoom/pan con scroll y drag.
 *
 * displayMode: "kde_std" | "kde" | "elipses" | "hdr"
 *   kde_std  — KDE estándar: relleno equidistante (default)
 *   kde      — KDE contornos: líneas, contoursMode aplica
 *   elipses  — solo elipses ±1σ / ±2σ
 *   hdr      — regiones HDR 25 / 50 / 95 %
 * contoursMode (solo aplica a displayMode="kde"): "equi" | "sigma12" | "sigma123"
 *
 * El SVG y el zoom se crean una sola vez. Llamar node.update(newParams)
 * para actualizar parámetros reactivos sin resetear el zoom/pan.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {
  1: "#4e79a7",
  2: "#59a14f",
  3: "#edc949",
  4: "#e15759",
};

function hdrThreshold(values, p) {
  const sorted = [...values].sort((a, b) => b - a);
  const total = sorted.reduce((s, v) => s + v, 0);
  let cum = 0;
  for (const v of sorted) { cum += v; if (cum >= p * total) return v; }
  return sorted.at(-1) ?? 0;
}

function ellipsePts({mx, my, sx, sy, cov, nSigma, xScale, yScale}) {
  const varX = sx * sx, varY = sy * sy;
  const trace = varX + varY;
  const det = varX * varY - cov * cov;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
  const lambda1 = (trace + disc) / 2;
  const lambda2 = (trace - disc) / 2;
  const angle = Math.atan2(2 * cov, varX - varY) / 2;
  const a1 = Math.sqrt(lambda1) * nSigma;
  const a2 = Math.sqrt(lambda2) * nSigma;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * 2 * Math.PI;
    const ex = a1 * Math.cos(t), ey = a2 * Math.sin(t);
    const dx = ex * Math.cos(angle) - ey * Math.sin(angle);
    const dy = ex * Math.sin(angle) + ey * Math.cos(angle);
    pts.push([xScale(mx + dx), yScale(my + dy)]);
  }
  return pts;
}

export function kdePlot({
  selectedFdi: initSelectedFdi = [],
  kdeGrids,
  toothStats,
  width = 800,
  height = 550,
  gamma: initGamma = 1,
  minThreshold: initMinThreshold = 0.05,
  displayMode: initDisplayMode = "kde_std",
  contoursMode: initContoursMode = "equi",
  showCentroids: initShowCentroids = true,
} = {}) {
  const {grid_size, teeth: kdeTeeth} = kdeGrids;
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  svg.append("defs").append("clipPath")
    .attr("id", "plot-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");
  const gClip = gOuter.append("g").attr("clip-path", "url(#plot-clip)");
  const g = gClip.append("g");

  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const viewExtent = {
    x_min: d3.min(xs) - 0.3, x_max: d3.max(xs) + 0.3,
    y_min: d3.min(ys) - 0.3, y_max: d3.max(ys) + 0.3,
  };

  const xScale0 = d3.scaleLinear().domain([viewExtent.x_min, viewExtent.x_max]).range([0, innerW]);
  const yScale0 = d3.scaleLinear().domain([viewExtent.y_min, viewExtent.y_max]).range([0, innerH]);
  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  gOuter.append("text").attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  const statsMap = new Map(toothStats.map(s => [s.fdi, s]));

  // Mutable params — updated via node.update() without recreating the SVG
  let p = {
    selectedFdi: initSelectedFdi,
    gamma: initGamma,
    minThreshold: initMinThreshold,
    displayMode: initDisplayMode,
    contoursMode: initContoursMode,
    showCentroids: initShowCentroids,
  };

  function drawContours() {
    const {selectedFdi, displayMode, contoursMode, minThreshold, gamma} = p;
    const isStd = displayMode === "kde_std";
    const isHdr = displayMode === "hdr";
    const linesOnly = !isStd && !isHdr;
    const isSigma = !isStd && !isHdr &&
      (contoursMode === "sigma12" || contoursMode === "sigma123");

    const tMin = Math.max(0.01, Math.min(0.99, minThreshold));
    const equiThresholds = linesOnly
      ? d3.range(0.10, 1.01, 0.15)
      : d3.range(tMin, 1.01, 0.05);

    for (const fdi of selectedFdi) {
      const td = kdeTeeth[String(fdi)];
      if (!td) continue;
      const q = Math.floor(fdi / 10);
      const color = QUADRANT_COLORS[q];

      let thresholds;
      if (isSigma && contoursMode === "sigma12") {
        const t1 = hdrThreshold(td.values, 0.393);
        const t2 = hdrThreshold(td.values, 0.865);
        thresholds = [t1, t2].sort((a, b) => a - b);
      } else if (isSigma && contoursMode === "sigma123") {
        const t1 = hdrThreshold(td.values, 0.393);
        const t2 = hdrThreshold(td.values, 0.865);
        const t3 = hdrThreshold(td.values, 0.989);
        thresholds = [t1, t2, t3].sort((a, b) => a - b);
      } else if (isHdr) {
        const t25 = hdrThreshold(td.values, 0.25);
        const t50 = hdrThreshold(td.values, 0.50);
        const t95 = hdrThreshold(td.values, 0.95);
        thresholds = [t95, t50, t25]
          .filter((v, i, a) => a.findIndex(x => Math.abs(x - v) < 1e-12) === i)
          .sort((a, b) => a - b);
      } else {
        thresholds = equiThresholds;
      }

      const n = grid_size;
      const e = td.extent;
      const contours = d3.contours().size([n, n]).thresholds(thresholds)(td.values);

      const xGrid = d3.scaleLinear().domain([0, n]).range([e.x_min, e.x_max]);
      const yGrid = d3.scaleLinear().domain([0, n]).range([e.y_min, e.y_max]);
      const path = d3.geoPath(d3.geoTransform({
        point(x, y) { this.stream.point(xScale(xGrid(x)), yScale(yGrid(y))); }
      }));

      const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(t => { const c = d3.color(color); c.opacity = Math.pow(t, gamma) * 0.7; return c + ""; });

      g.append("g").selectAll("path").data(contours).join("path")
        .attr("d", path)
        .attr("fill", isHdr
          ? (d => {
              const idx = thresholds.findIndex(t => Math.abs(d.value - t) < 1e-10);
              if (idx === 0) return "none";
              const c = d3.color(color);
              c.opacity = idx === thresholds.length - 1 ? 0.42 : 0.18;
              return c + "";
            })
          : (linesOnly ? "none" : d => colorScale(d.value)))
        .attr("stroke", color)
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", isSigma ? 0.85 : (isHdr ? 0.75 : 0.4));

      // Labels para sigma
      if (isSigma) {
        const labels = contoursMode === "sigma12" ? ["1σ", "2σ"] : ["1σ", "2σ", "3σ"];
        contours.forEach((c, ci) => {
          if (!c.coordinates?.[0]?.[0]) return;
          const pts = c.coordinates[0][0];
          const rightmost = pts.reduce((best, pt) => pt[0] > best[0] ? pt : best, pts[0]);
          g.append("text")
            .attr("x", xScale(xGrid(rightmost[0])) + 3)
            .attr("y", yScale(yGrid(rightmost[1])) - 2)
            .attr("font-size", 9).attr("fill", color).attr("opacity", 0.85)
            .text(labels[ci] ?? "");
        });
      }

      // Labels para HDR
      if (isHdr) {
        const hdrLabels = ["95%", "50%", "25%"];
        contours.forEach((c, ci) => {
          if (!c.coordinates?.[0]?.[0]) return;
          const pts = c.coordinates[0][0];
          const rightmost = pts.reduce((best, pt) => pt[0] > best[0] ? pt : best, pts[0]);
          g.append("text")
            .attr("x", xScale(xGrid(rightmost[0])) + 3)
            .attr("y", yScale(yGrid(rightmost[1])) - 2)
            .attr("font-size", 9).attr("fill", color).attr("opacity", 0.85)
            .text(hdrLabels[ci] ?? "");
        });
      }
    }
  }

  function drawEllipses() {
    const {selectedFdi} = p;
    for (const fdi of selectedFdi) {
      const s = statsMap.get(fdi);
      if (!s) continue;
      const q = Math.floor(fdi / 10);
      const color = QUADRANT_COLORS[q];
      const base = {mx: s.mean_x, my: s.mean_y, sx: s.std_x, sy: s.std_y,
                    cov: s.cov_xy, xScale, yScale};

      const pts2 = ellipsePts({...base, nSigma: 2});
      g.append("path").attr("d", d3.line()(pts2))
        .attr("fill", "none").attr("stroke", color)
        .attr("stroke-width", 1.2).attr("stroke-dasharray", "5,3").attr("opacity", 0.55);
      g.append("text").attr("x", pts2[0][0] + 3).attr("y", pts2[0][1] - 2)
        .attr("font-size", 9).attr("fill", color).attr("opacity", 0.55).text("2σ");

      const pts1 = ellipsePts({...base, nSigma: 1});
      g.append("path").attr("d", d3.line()(pts1))
        .attr("fill", color).attr("fill-opacity", 0.18)
        .attr("stroke", color).attr("stroke-width", 2).attr("opacity", 0.85);
      g.append("text").attr("x", pts1[0][0] + 3).attr("y", pts1[0][1] - 2)
        .attr("font-size", 9).attr("fill", color).attr("opacity", 0.8).text("1σ");
    }
  }

  function draw() {
    g.selectAll("*").remove();
    const {selectedFdi, displayMode, showCentroids} = p;
    const selectedSet = new Set(selectedFdi);

    if (displayMode !== "elipses") drawContours();
    if (displayMode === "elipses") drawEllipses();

    for (const s of toothStats) {
      const isSel = selectedSet.has(s.fdi);
      if (!showCentroids) continue;
      const cx = xScale(s.mean_x), cy = yScale(s.mean_y);
      const q = Math.floor(s.fdi / 10);
      g.append("circle").attr("cx", cx).attr("cy", cy)
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

    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(8));
  }

  const zoom = d3.zoom().scaleExtent([1, 40]).on("zoom", (event) => {
    xScale = event.transform.rescaleX(xScale0);
    yScale = event.transform.rescaleY(yScale0);
    draw();
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

  const node = svg.node();
  node.update = (newParams) => { p = {...p, ...newParams}; draw(); };
  return node;
}
