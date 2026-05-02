/**
 * KDE 2D por subpoblación. Superpone contornos de DOS grupos en colores
 * distintos, con la dentadura media completa como contexto en gris.
 * Modos: overlay, split, diff (heatmap KDE A−B).
 *
 * Modo "split" renderiza dos paneles lado a lado (un grupo cada uno).
 * Modo "overlay" superpone ambos sobre el mismo plot.
 */
import * as d3 from "d3";

const POP_COLOR = "#bbb";

function hdrThreshold(values, p) {
  const sorted = [...values].sort((a, b) => b - a);
  const total = sorted.reduce((s, v) => s + v, 0);
  let cum = 0;
  for (const v of sorted) { cum += v; if (cum >= p * total) return v; }
  return sorted.at(-1) ?? 0;
}

function _ellipsePts({mx, my, sx, sy, cov, nSigma, xScale, yScale}) {
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
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * 2 * Math.PI;
    const ex = a1 * Math.cos(t);
    const ey = a2 * Math.sin(t);
    const dx = ex * Math.cos(angle) - ey * Math.sin(angle);
    const dy = ex * Math.sin(angle) + ey * Math.cos(angle);
    pts.push([xScale(mx + dx), yScale(my + dy)]);
  }
  return pts;
}

/**
 * Dibuja contornos KDE de un grupo en `g` ya con xScale/yScale aplicados.
 * La opacidad final se controla por la variable CSS `--layer-${layerIndex}-opacity`
 * en el ancestro <svg>, para que el slider la pueda actualizar sin redibujar.
 */
function _drawGroupContours({g, group, selectedFdi, color, gridSize, layerIndex = 0, xScale, yScale, linesOnly = false, contoursMode = "equi"}) {
  if (!group) return;
  const layer = g.append("g")
    .attr("class", `subpop-layer subpop-layer-${layerIndex}`)
    .style("opacity", `var(--layer-${layerIndex}-opacity, 0.6)`);

  const colorScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(t => { const c = d3.color(color); c.opacity = t; return c + ""; });

  const isSigma = contoursMode === "sigma12" || contoursMode === "sigma123";
  const isHdr = contoursMode === "hdr";
  const effectiveLinesOnly = (linesOnly || isSigma) && !isHdr;

  const equiThresholds = linesOnly
    ? d3.range(0.10, 1.01, 0.15)
    : d3.range(0.05, 1.01, 0.05);

  for (const fdi of selectedFdi) {
    const td = group.teeth[String(fdi)];
    if (!td) continue;

    let thresholds;
    if (contoursMode === "sigma12") {
      const t1 = hdrThreshold(td.values, 0.393);
      const t2 = hdrThreshold(td.values, 0.865);
      thresholds = [t1, t2].sort((a, b) => a - b);
    } else if (contoursMode === "sigma123") {
      const t1 = hdrThreshold(td.values, 0.393);
      const t2 = hdrThreshold(td.values, 0.865);
      const t3 = hdrThreshold(td.values, 0.989);
      thresholds = [t1, t2, t3].sort((a, b) => a - b);
    } else if (contoursMode === "hdr") {
      const t25 = hdrThreshold(td.values, 0.25);
      const t50 = hdrThreshold(td.values, 0.50);
      const t95 = hdrThreshold(td.values, 0.95);
      thresholds = [t95, t50, t25].filter((v, i, a) => a.findIndex(x => Math.abs(x - v) < 1e-12) === i).sort((a, b) => a - b);
    } else {
      thresholds = equiThresholds;
    }

    const n = gridSize;
    const e = td.extent;

    const contours = d3.contours()
      .size([n, n])
      .thresholds(thresholds)(td.values);

    const xGrid = d3.scaleLinear().domain([0, n]).range([e.x_min, e.x_max]);
    const yGrid = d3.scaleLinear().domain([0, n]).range([e.y_min, e.y_max]);

    const path = d3.geoPath(d3.geoTransform({
      point(x, y) { this.stream.point(xScale(xGrid(x)), yScale(yGrid(y))); }
    }));

    layer.append("g").selectAll("path").data(contours).join("path")
      .attr("d", path)
      .attr("fill", isHdr
        ? (d => {
            const idx = thresholds.findIndex(t => Math.abs(d.value - t) < 1e-10);
            if (idx === 0) return "none";  // 95%: solo línea
            const c = d3.color(color);
            c.opacity = idx === thresholds.length - 1 ? 0.42 : 0.18;  // 25%: oscuro · 50%: claro
            return c + "";
          })
        : effectiveLinesOnly ? "none" : d => colorScale(d.value))
      .attr("stroke", color)
      .attr("stroke-width", (isSigma || isHdr) ? 1.8 : (linesOnly ? 1.2 : 0.5))
      .attr("stroke-opacity", effectiveLinesOnly ? 0.85 : (isHdr ? 0.75 : 0.4));

    if (isHdr) {
      const hdrLabels = ["95%", "50%", "25%"];
      contours.forEach((c, ci) => {
        if (!c.coordinates?.[0]?.[0]) return;
        const pts = c.coordinates[0][0];
        const rightmost = pts.reduce((best, p) => p[0] > best[0] ? p : best, pts[0]);
        g.append("text")
          .attr("x", xScale(xGrid(rightmost[0])) + 3)
          .attr("y", yScale(yGrid(rightmost[1])) - 2)
          .attr("font-size", 9).attr("fill", color).attr("opacity", 0.75)
          .text(hdrLabels[ci] ?? "");
      });
    }
  }
}

/**
 * Dibuja centroides de la población completa (contexto). Visibilidad
 * controlada por la variable CSS `--show-centroids-pop` en el SVG.
 */
function _drawEigendentaduraContext({g, toothStats, selectedFdi, xScale, yScale}) {
  const selSet = new Set(selectedFdi);
  const layer = g.append("g")
    .attr("class", "centroids-pop")
    .style("display", "var(--show-centroids-pop, inline)");
  for (const s of toothStats) {
    const cx = xScale(s.mean_x);
    const cy = yScale(s.mean_y);
    const isSel = selSet.has(s.fdi);
    layer.append("circle")
      .attr("cx", cx).attr("cy", cy)
      .attr("r", isSel ? 4 : 3)
      .attr("fill", isSel ? "#666" : POP_COLOR)
      .attr("stroke", "#888")
      .attr("stroke-width", 0.5)
      .attr("opacity", isSel ? 0.9 : 0.5);
    if (isSel) {
      layer.append("text").attr("x", cx).attr("y", cy - 9)
        .attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", "bold")
        .attr("fill", "#333").text(String(s.fdi));
    }
  }
}

/**
 * Dibuja centroides medios de cada subpoblación (un círculo grande relleno
 * por grupo y FDI seleccionado). Visibilidad controlada por
 * `--show-centroids-${layerIndex}` en el SVG.
 */
function _drawSubpopCentroids({g, subpopStats, groupNames, colorMap, selectedFdi, xScale, yScale}) {
  if (!subpopStats) return;
  const byKey = new Map();
  for (const s of subpopStats) byKey.set(`${s.group}::${s.fdi}`, s);
  groupNames.forEach((gName, i) => {
    const layer = g.append("g")
      .attr("class", `centroids-group centroids-group-${i}`)
      .style("display", `var(--show-centroids-${i}, inline)`);
    const color = colorMap[gName] || "#999";
    for (const fdi of selectedFdi) {
      const s = byKey.get(`${gName}::${fdi}`);
      if (!s) continue;
      layer.append("circle")
        .attr("cx", xScale(s.cx_mean))
        .attr("cy", yScale(s.cy_mean))
        .attr("r", 5)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.9);
    }
  });
}

/**
 * Dibuja elipses de covarianza (1σ rellena, 2σ solo borde) por subpop.
 */
function _drawSubpopEllipses({g, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale}) {
  if (!subpopStats) return;
  const subpopByGroupFdi = new Map();
  for (const s of subpopStats) subpopByGroupFdi.set(`${s.group}::${s.fdi}`, s);

  for (const fdi of selectedFdi) {
    for (const gName of groupNames) {
      const s = subpopByGroupFdi.get(`${gName}::${fdi}`);
      if (!s) continue;
      const color = colorMap[gName] || "#999";
      const base = {mx: s.cx_mean, my: s.cy_mean, sx: s.cx_std, sy: s.cy_std, cov: s.cx_cy_cov ?? 0, xScale, yScale};

      // 2σ — solo borde punteado
      const pts2 = _ellipsePts({...base, nSigma: 2});
      g.append("path")
        .attr("d", d3.line()(pts2))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.2)
        .attr("stroke-dasharray", "5,3")
        .attr("opacity", 0.55);
      g.append("text").attr("x", pts2[0][0] + 3).attr("y", pts2[0][1] - 2)
        .attr("font-size", 9).attr("fill", color).attr("opacity", 0.55).text("2σ");

      // 1σ — relleno semitransparente
      const pts1 = _ellipsePts({...base, nSigma: 1});
      g.append("path")
        .attr("d", d3.line()(pts1))
        .attr("fill", color)
        .attr("fill-opacity", 0.18)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.85);
      g.append("text").attr("x", pts1[0][0] + 3).attr("y", pts1[0][1] - 2)
        .attr("font-size", 9).attr("fill", color).attr("opacity", 0.8).text("1σ");
    }
  }
}

/**
 * Renderiza el mapa de diferencia KDE (A − B) como imagen rasterizada.
 * Rojo = más densidad en grupo A; Azul = más densidad en grupo B.
 */
function _drawDiffMap({g, diffData, selectedFdi, xScale, yScale}) {
  if (!diffData) return;
  const gridSize = diffData.grid_size;
  for (const fdi of selectedFdi) {
    const td = diffData.teeth?.[String(fdi)];
    if (!td) continue;
    const {extent: e, values, vmax} = td;
    const n = gridSize;

    const svgX0 = Math.min(xScale(e.x_min), xScale(e.x_max));
    const svgX1 = Math.max(xScale(e.x_min), xScale(e.x_max));
    const svgY0 = Math.min(yScale(e.y_min), yScale(e.y_max));
    const svgY1 = Math.max(yScale(e.y_min), yScale(e.y_max));

    const canvas = document.createElement("canvas");
    canvas.width = n; canvas.height = n;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(n, n);

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const v = values[row * n + col];
        const t = 0.5 + 0.5 * (v / vmax);          // 0=B domina, 1=A domina
        const c = d3.color(d3.interpolateRdBu(1 - t)); // rojo=A, azul=B
        const alpha = Math.round(Math.abs(v) / vmax * 220 + 20);
        const idx = (row * n + col) * 4;
        img.data[idx]   = c.r;
        img.data[idx+1] = c.g;
        img.data[idx+2] = c.b;
        img.data[idx+3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);

    g.append("image")
      .attr("href", canvas.toDataURL())
      .attr("x", svgX0).attr("y", svgY0)
      .attr("width",  svgX1 - svgX0)
      .attr("height", svgY1 - svgY0)
      .attr("preserveAspectRatio", "none");
  }
}

/**
 * Dibuja el bagplot (Rousseeuw 1999): bag (50 % Mahalanobis), loop/fence
 * (bag × 3) y outliers como × para cada subpoblación y FDI seleccionado.
 */
function _drawBagplot({g, bagplotData, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale}) {
  if (!bagplotData || !subpopStats) return;
  const {bag_r, loop_r} = bagplotData;

  const byKey = new Map();
  for (const s of subpopStats) byKey.set(`${s.group}::${s.fdi}`, s);

  for (const fdi of selectedFdi) {
    for (const gName of groupNames) {
      const s = byKey.get(`${gName}::${fdi}`);
      const td = bagplotData.groups[gName]?.teeth?.[String(fdi)];
      if (!s || !td) continue;

      const color = colorMap[gName] || "#999";
      const base = {mx: s.cx_mean, my: s.cy_mean, sx: s.cx_std, sy: s.cy_std,
                    cov: s.cx_cy_cov ?? 0, xScale, yScale};

      // Loop (fence) — borde punteado fino
      g.append("path")
        .attr("d", d3.line()(_ellipsePts({...base, nSigma: loop_r})))
        .attr("fill", "none").attr("stroke", color)
        .attr("stroke-width", 1).attr("stroke-dasharray", "4,3").attr("opacity", 0.45);

      // Bag (50 %) — relleno + borde
      g.append("path")
        .attr("d", d3.line()(_ellipsePts({...base, nSigma: bag_r})))
        .attr("fill", color).attr("fill-opacity", 0.20)
        .attr("stroke", color).attr("stroke-width", 1.8).attr("opacity", 0.85);

      // Mediana (centroide)
      g.append("circle")
        .attr("cx", xScale(s.cx_mean)).attr("cy", yScale(s.cy_mean))
        .attr("r", 4).attr("fill", color).attr("stroke", "white").attr("stroke-width", 1.5);

      // Outliers — marca ×
      const sz = 4;
      for (let i = 0; i < td.outliers_x.length; i++) {
        const ox = xScale(td.outliers_x[i]), oy = yScale(td.outliers_y[i]);
        g.append("line").attr("x1", ox - sz).attr("x2", ox + sz)
          .attr("y1", oy - sz).attr("y2", oy + sz)
          .attr("stroke", color).attr("stroke-width", 1.5).attr("opacity", 0.75);
        g.append("line").attr("x1", ox - sz).attr("x2", ox + sz)
          .attr("y1", oy + sz).attr("y2", oy - sz)
          .attr("stroke", color).attr("stroke-width", 1.5).attr("opacity", 0.75);
      }
    }
  }
}

/**
 * @param {Object} options
 * @param {Array<number>}  options.selectedFdi
 * @param {Object}         options.kdeData       - {axis, grid_size, groups: {name: {teeth, n_pantos}}}
 * @param {Array<Object>}  options.toothStats    - eigendentadura completa (contexto)
 * @param {Array<Object>}  [options.subpopStats] - tooth_stats_subpop filtrado al eje
 * @param {Object}         [options.diffData]    - kde_diff_*.json para modo "diff"
 * @param {Object}         [options.bagplotData] - bagplot_outliers_*.json para modo "bagplot"
 * @param {"overlay"|"split"} [options.mode="overlay"]
 * @param {Object}         options.colorMap
 * @param {Object}         options.labelMap
 * @param {"kde_std"|"kde"|"hdr"|"elipses"|"ambos"|"diff"|"bagplot"} [options.displayMode="kde_std"]
 * @param {"equi"|"sigma12"|"sigma123"} [options.contoursMode="equi"]
 * @param {number}         [options.width=900]
 * @param {number}         [options.height=550]
 */
export function subpopKdePlot({
  selectedFdi,
  kdeData,
  toothStats,
  subpopStats = null,
  diffData = null,
  bagplotData = null,
  mode = "overlay",
  colorMap,
  labelMap,
  displayMode = "kde_std",
  contoursMode = "equi",
  width = 900,
  height = 550,
} = {}) {
  const {grid_size: gridSize, groups} = kdeData;
  const groupNames = Object.keys(groups);

  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const viewExtent = {
    x_min: d3.min(xs) - 0.3, x_max: d3.max(xs) + 0.3,
    y_min: d3.min(ys) - 0.3, y_max: d3.max(ys) + 0.3,
  };

  if (mode === "split" && displayMode !== "diff") {
    return _renderSplit({groupNames, groups, gridSize, toothStats, subpopStats, bagplotData,
                         colorMap, labelMap, selectedFdi, displayMode, contoursMode,
                         viewExtent, width, height});
  }
  return _renderOverlay({groupNames, groups, gridSize, toothStats, subpopStats, diffData, bagplotData,
                         colorMap, labelMap, selectedFdi, displayMode, contoursMode,
                         viewExtent, width, height});
}

function _setupPanel({svg, x, y, w, h, viewExtent, label = null}) {
  svg.append("defs").append("clipPath")
    .attr("id", `panel-clip-${label || "main"}`)
    .append("rect").attr("width", w).attr("height", h);

  const g0 = svg.append("g").attr("transform", `translate(${x},${y})`);
  const xAxisG = g0.append("g").attr("transform", `translate(0,${h})`);
  const yAxisG = g0.append("g");
  const gClip = g0.append("g").attr("clip-path", `url(#panel-clip-${label || "main"})`);
  const gContent = gClip.append("g");

  const xScale0 = d3.scaleLinear().domain([viewExtent.x_min, viewExtent.x_max]).range([0, w]);
  const yScale0 = d3.scaleLinear().domain([viewExtent.y_min, viewExtent.y_max]).range([0, h]);

  return {g0, gContent, xScale0, yScale0, xAxisG, yAxisG};
}

function _renderOverlay({groupNames, groups, gridSize, toothStats, subpopStats, diffData = null, bagplotData = null,
                          colorMap, labelMap, selectedFdi, displayMode, contoursMode,
                          viewExtent, width, height}) {
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("--layer-0-opacity", 0.6)
    .style("--layer-1-opacity", 0.4);

  const {gContent, xScale0, yScale0, xAxisG, yAxisG, g0} =
    _setupPanel({svg, x: margin.left, y: margin.top, w: innerW, h: innerH, viewExtent});

  let xScale = xScale0.copy(), yScale = yScale0.copy();

  g0.append("text").attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  g0.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  function draw() {
    gContent.selectAll("*").remove();
    if (displayMode === "diff") {
      _drawDiffMap({g: gContent, diffData, selectedFdi, xScale, yScale});
      _drawSubpopEllipses({g: gContent, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale});
    } else if (displayMode === "bagplot") {
      _drawBagplot({g: gContent, bagplotData, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale});
    } else {
      if (displayMode !== "elipses") {
        groupNames.forEach((gName, i) => {
          _drawGroupContours({
            g: gContent, group: groups[gName], selectedFdi,
            color: colorMap[gName], gridSize, layerIndex: i, xScale, yScale,
            linesOnly: displayMode === "kde",
            contoursMode: displayMode === "hdr" ? "hdr" : contoursMode,
          });
        });
      }
      if (displayMode === "elipses" || displayMode === "ambos") {
        _drawSubpopEllipses({g: gContent, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale});
      }
    }
    _drawEigendentaduraContext({g: gContent, toothStats, selectedFdi, xScale, yScale});
    _drawSubpopCentroids({g: gContent, subpopStats, groupNames, colorMap, selectedFdi, xScale, yScale});

    if (selectedFdi.length === 0) {
      gContent.append("text").attr("x", innerW / 2).attr("y", innerH / 2)
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
  g0.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "none").attr("pointer-events", "all")
    .call(zoom)
    .on("dblclick.zoom", () => {
      g0.select("rect").transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

  draw();

  g0.append("text").attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}

function _renderSplit({groupNames, groups, gridSize, toothStats, subpopStats, bagplotData = null,
                        colorMap, labelMap, selectedFdi, displayMode, contoursMode,
                        viewExtent, width, height}) {
  const gap = 24;
  const margin = {top: 30, right: 16, bottom: 45, left: 50};
  const panelW = (width - margin.left - margin.right - gap) / 2;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("--layer-0-opacity", 0.6)
    .style("--layer-1-opacity", 0.4);

  groupNames.forEach((gName, i) => {
    const x0 = margin.left + i * (panelW + gap);
    const {g0, gContent, xScale0, yScale0, xAxisG, yAxisG} = _setupPanel({
      svg, x: x0, y: margin.top, w: panelW, h: innerH, viewExtent,
      label: gName.replace(/[^a-z0-9]/gi, ""),
    });
    let xScale = xScale0.copy(), yScale = yScale0.copy();

    // Title
    g0.append("text").attr("x", panelW / 2).attr("y", -10)
      .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 600)
      .attr("fill", colorMap[gName])
      .text(`${labelMap[gName] || gName} (n=${groups[gName].n_pantos})`);

    function draw() {
      gContent.selectAll("*").remove();
      if (displayMode === "bagplot") {
        const singleGroupStats = subpopStats ? subpopStats.filter(s => s.group === gName) : null;
        _drawBagplot({g: gContent, bagplotData, subpopStats: singleGroupStats,
                      groupNames: [gName], selectedFdi, colorMap, xScale, yScale});
      } else if (displayMode !== "elipses") {
        _drawGroupContours({
          g: gContent, group: groups[gName], selectedFdi,
          color: colorMap[gName], gridSize, layerIndex: i, xScale, yScale,
          linesOnly: displayMode === "kde",
          contoursMode: displayMode === "hdr" ? "hdr" : contoursMode,
        });
      }
      if ((displayMode === "elipses" || displayMode === "ambos") && displayMode !== "bagplot") {
        _drawSubpopEllipses({
          g: gContent, subpopStats, groupNames: [gName], selectedFdi,
          colorMap, xScale, yScale,
        });
      }
      _drawEigendentaduraContext({g: gContent, toothStats, selectedFdi, xScale, yScale});
      // En split, mostramos solo el centroide del grupo del panel; reutilizamos
      // la clase --show-centroids-${i} del orden global de groupNames.
      _drawSubpopCentroids({
        g: gContent,
        subpopStats: subpopStats ? subpopStats.filter(s => s.group === gName) : null,
        groupNames: groupNames.map((n, idx) => idx === i ? gName : "_unused_"),
        colorMap, selectedFdi, xScale, yScale,
      });
      gContent.selectAll(".centroids-group").each(function(_, idx) {
        if (idx !== i) d3.select(this).remove();
      });

      if (selectedFdi.length === 0) {
        gContent.append("text").attr("x", panelW / 2).attr("y", innerH / 2)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#999")
          .text("Seleccioná dientes ↑");
      }
      xAxisG.call(d3.axisBottom(xScale).ticks(6));
      yAxisG.call(d3.axisLeft(yScale).ticks(6));
    }

    const zoom = d3.zoom().scaleExtent([1, 40]).on("zoom", (event) => {
      xScale = event.transform.rescaleX(xScale0);
      yScale = event.transform.rescaleY(yScale0);
      draw();
    });
    g0.append("rect")
      .attr("width", panelW).attr("height", innerH)
      .attr("fill", "none").attr("pointer-events", "all")
      .call(zoom)
      .on("dblclick.zoom", () => {
        g0.select("rect").transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });

    draw();
  });

  return svg.node();
}
