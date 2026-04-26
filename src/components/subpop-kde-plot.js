/**
 * KDE 2D por subpoblación. Igual al kdePlot poblacional pero superpone
 * las contornos de DOS grupos en colores distintos, con la dentadura
 * media completa como contexto en gris.
 *
 * Modo "split" renderiza dos paneles lado a lado (un grupo cada uno).
 * Modo "overlay" superpone ambos sobre el mismo plot.
 */
import * as d3 from "d3";

const POP_COLOR = "#bbb";

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
function _drawGroupContours({g, group, selectedFdi, color, gridSize, layerIndex = 0, xScale, yScale}) {
  if (!group) return;
  const layer = g.append("g")
    .attr("class", `subpop-layer subpop-layer-${layerIndex}`)
    .style("opacity", `var(--layer-${layerIndex}-opacity, 0.6)`);

  // colorScale: opacidad creciente con la densidad (replica kde-plot.js).
  const colorScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(t => { const c = d3.color(color); c.opacity = t; return c + ""; });

  for (const fdi of selectedFdi) {
    const td = group.teeth[String(fdi)];
    if (!td) continue;

    const n = gridSize;
    const e = td.extent;

    const contours = d3.contours()
      .size([n, n])
      .thresholds(d3.range(0.05, 1.01, 0.05))(td.values);

    const xGrid = d3.scaleLinear().domain([0, n]).range([e.x_min, e.x_max]);
    const yGrid = d3.scaleLinear().domain([0, n]).range([e.y_min, e.y_max]);

    const path = d3.geoPath(d3.geoTransform({
      point(x, y) { this.stream.point(xScale(xGrid(x)), yScale(yGrid(y))); }
    }));

    layer.append("g").selectAll("path").data(contours).join("path")
      .attr("d", path)
      .attr("fill", d => colorScale(d.value))
      .attr("stroke", color)
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.4);
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
 * Dibuja elipses analíticas (1σ) por subpop usando subpopStats.
 */
function _drawSubpopEllipses({g, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale}) {
  if (!subpopStats) return;
  const selSet = new Set(selectedFdi);
  const subpopByGroupFdi = new Map();
  for (const s of subpopStats) {
    subpopByGroupFdi.set(`${s.group}::${s.fdi}`, s);
  }
  for (const fdi of selectedFdi) {
    if (!selSet.has(fdi)) continue;
    for (const gName of groupNames) {
      const s = subpopByGroupFdi.get(`${gName}::${fdi}`);
      if (!s) continue;
      const color = colorMap[gName] || "#999";
      const pts = _ellipsePts({
        mx: s.cx_mean, my: s.cy_mean,
        sx: s.cx_std,  sy: s.cy_std,
        cov: 0,  // no tenemos covarianza en subpop_stats; aproximación con elipse axial
        nSigma: 1,
        xScale, yScale,
      });
      g.append("path")
        .attr("d", d3.line()(pts))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3")
        .attr("opacity", 0.65);
    }
  }
}

/**
 * @param {Object} options
 * @param {Array<number>}  options.selectedFdi
 * @param {Object}         options.kdeData     - {axis, grid_size, groups: {name: {teeth: {...}, n_pantos, n_per_fdi}}}
 * @param {Array<Object>}  options.toothStats  - eigendentadura completa (contexto)
 * @param {Array<Object>}  [options.subpopStats]  - tooth_stats_subpop filtrado al eje (opcional, para elipses 1σ)
 * @param {"overlay"|"split"} [options.mode="overlay"]
 * @param {Object}         options.colorMap     - {groupName: hexColor}
 * @param {Object}         options.labelMap     - {groupName: humanLabel}
 * @param {boolean}        [options.showEllipses=false]
 * @param {number}         [options.width=900]
 * @param {number}         [options.height=550]
 */
export function subpopKdePlot({
  selectedFdi,
  kdeData,
  toothStats,
  subpopStats = null,
  mode = "overlay",
  colorMap,
  labelMap,
  showEllipses = false,
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

  if (mode === "split") {
    return _renderSplit({groupNames, groups, gridSize, toothStats, subpopStats,
                         colorMap, labelMap, selectedFdi, showEllipses,
                         viewExtent, width, height});
  }
  return _renderOverlay({groupNames, groups, gridSize, toothStats, subpopStats,
                         colorMap, labelMap, selectedFdi, showEllipses,
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

function _renderOverlay({groupNames, groups, gridSize, toothStats, subpopStats,
                          colorMap, labelMap, selectedFdi, showEllipses,
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
    groupNames.forEach((gName, i) => {
      _drawGroupContours({
        g: gContent, group: groups[gName], selectedFdi,
        color: colorMap[gName], gridSize, layerIndex: i, xScale, yScale,
      });
    });
    if (showEllipses) {
      _drawSubpopEllipses({g: gContent, subpopStats, groupNames, selectedFdi, colorMap, xScale, yScale});
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

function _renderSplit({groupNames, groups, gridSize, toothStats, subpopStats,
                        colorMap, labelMap, selectedFdi, showEllipses,
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
      _drawGroupContours({
        g: gContent, group: groups[gName], selectedFdi,
        color: colorMap[gName], gridSize, layerIndex: i, xScale, yScale,
      });
      if (showEllipses) {
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
