/**
 * Arch-form comparativa entre dos subpoblaciones.
 *
 * Para cada grupo, dibuja dos splines (maxilar 18→28 y mandibular 48→38)
 * usando los centroides medios del grupo (cx_mean, cy_mean por FDI).
 * Reporta métricas clínicas (intercanino, intermolar, profundidad, ratio,
 * tipo de arcada) por grupo en una tabla compacta dentro del SVG.
 *
 * Opciones: showUpper / showLower (arcadas visibles) y showLabels (etiquetas
 * de métricas en el gráfico). Las etiquetas se apilan sin superposición.
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
 * @param {Array}  opts.subpopStats   - tooth_stats_subpop filtrado al eje
 * @param {Array}  opts.groupNames
 * @param {Object} opts.colorMap
 * @param {Object} [opts.labelMap]
 * @param {Array}  [opts.toothStats]  - opcional, para mostrar contorno de población
 * @param {boolean}  [opts.showPopulation=true]
 * @param {string[]} [opts.visibleGroups=null]  - null = todos; array de group names visibles
 * @param {boolean}  [opts.showUpper=true]   - mostrar arcada maxilar
 * @param {boolean}  [opts.showLower=true]   - mostrar arcada mandibular
 * @param {boolean}  [opts.showLabels=true]       - mostrar etiquetas de métricas
 * @param {boolean}  [opts.showMeasurePoints=false] - resaltar caninos y molares de medición
 * @param {number}   [opts.width=820]
 * @param {number}   [opts.height=520]
 */
export function subpopArchForm({
  subpopStats,
  groupNames,
  colorMap,
  labelMap = {},
  toothStats = null,
  showPopulation = true,
  visibleGroups = null,
  showUpper = true,
  showLower = true,
  showLabels = true,
  showMeasurePoints = false,
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

  // Margen superior ampliado para dejar espacio a las etiquetas apiladas
  const margin = {top: 60, right: 30, bottom: 60, left: 55};
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
    return {node: empty.node(), metrics: {}};
  }
  const xs = allPts.map(p => p[0]);
  const ys = allPts.map(p => p[1]);
  const padX = 0.05, padY = 0.05;
  const xDomain = [d3.min(xs) - padX, d3.max(xs) + padX];
  const yDomain = [d3.min(ys) - padY, d3.max(ys) + padY];
  const dx = xDomain[1] - xDomain[0];
  const dy = yDomain[1] - yDomain[0];
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

  // Splines de población
  if (showPopulation && toothStats) {
    const popMap = new Map(toothStats.map(s => [s.fdi, {cx_mean: s.mean_x, cy_mean: s.mean_y}]));
    const popArchs = [];
    if (showUpper) popArchs.push(ARCH_UPPER);
    if (showLower) popArchs.push(ARCH_LOWER);
    for (const arch of popArchs) {
      g.append("path")
        .attr("d", archPath(arch, popMap, x, y))
        .attr("fill", "none").attr("stroke", "#bbb").attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,4").attr("opacity", 0.7);
    }
  }

  // Splines por grupo
  const visibleFdiSet = new Set([
    ...(showUpper ? ARCH_UPPER : []),
    ...(showLower ? ARCH_LOWER : []),
  ]);
  const activeGroups = visibleGroups ? groupNames.filter(g => visibleGroups.includes(g)) : groupNames;
  activeGroups.forEach((gName) => {
    const map = byGroup.get(gName);
    if (!map || !map.size) return;
    const color = colorMap[gName] || "#999";
    const archs = [];
    if (showUpper) archs.push(ARCH_UPPER);
    if (showLower) archs.push(ARCH_LOWER);
    for (const arch of archs) {
      g.append("path")
        .attr("d", archPath(arch, map, x, y))
        .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2.5)
        .attr("opacity", 0.85);
    }
    for (const [fdi, s] of map) {
      if (!visibleFdiSet.has(fdi)) continue;
      g.append("circle")
        .attr("cx", x(s.cx_mean)).attr("cy", y(s.cy_mean))
        .attr("r", 3).attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 1)
        .attr("opacity", 0.9)
        .append("title").text(`${labelMap[gName] || gName} · FDI ${fdi}\nμ=(${s.cx_mean.toFixed(3)}, ${s.cy_mean.toFixed(3)})\nn=${s.n}`);
    }
  });

  // Líneas de medida: color por tipo de medición, dash por grupo
  // Los valores se muestran en una leyenda top-right (sin texto inline)
  const MEAS_COLORS = {
    "intercanino sup": "#7C3AED",
    "intermolar sup":  "#D97706",
    "intercanino inf": "#059669",
    "intermolar inf":  "#DB2777",
  };
  const GROUP_DASHES = ["none", "7,4"];  // grupo 0: continuo; grupo 1: punteado

  const measDefs = [
    ...(showUpper ? [
      {key: "intercanino sup", f1: 13, f2: 23},
      {key: "intermolar sup",  f1: 16, f2: 26},
    ] : []),
    ...(showLower ? [
      {key: "intercanino inf", f1: 43, f2: 33},
      {key: "intermolar inf",  f1: 46, f2: 36},
    ] : []),
  ];

  // Colectar valores para la leyenda y dibujar líneas
  const measLegend = measDefs.map(({key, f1, f2}) => {
    const color = MEAS_COLORS[key];
    const vals = activeGroups.map((gName, gi) => {
      const map = byGroup.get(gName);
      if (!map) return null;
      const a = map.get(f1), b = map.get(f2);
      if (!a || !b) return null;
      const ax = x(a.cx_mean), ay = y(a.cy_mean);
      const bx = x(b.cx_mean), by = y(b.cy_mean);
      g.append("line").attr("x1", ax).attr("y1", ay).attr("x2", bx).attr("y2", by)
        .attr("stroke", color).attr("stroke-width", gi === 0 ? 2 : 1.5)
        .attr("stroke-dasharray", GROUP_DASHES[gi]).attr("opacity", 0.85);
      g.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 2.5)
        .attr("fill", color).attr("opacity", 0.85);
      g.append("circle").attr("cx", bx).attr("cy", by).attr("r", 2.5)
        .attr("fill", color).attr("opacity", 0.85);
      return Math.hypot(a.cx_mean - b.cx_mean, a.cy_mean - b.cy_mean);
    });
    return {key, color, vals};
  });

  // Leyenda de medidas (top-right) — posiciones X fijas
  if (showLabels && measLegend.length) {
    const nG    = activeGroups.length;
    const legW  = nG > 1 ? 210 : 175;
    const COL_LABEL = 30;          // inicio del texto de etiqueta
    const COL_V = nG > 1
      ? [legW - 62, legW - 8]      // dos grupos: dos columnas de valores
      : [legW - 8];                // un grupo: una columna
    const legRowH  = 18;
    const legHeadH = nG > 1 ? 16 : 0;
    const legH     = 8 + legHeadH + measLegend.length * legRowH + 6;
    const lx       = innerW - legW - 2;

    const mleg = g.append("g").attr("transform", `translate(${lx}, 6)`);
    mleg.append("rect").attr("width", legW).attr("height", legH)
      .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.96);

    // Encabezado de grupos
    if (nG > 1) {
      activeGroups.forEach((gName, gi) => {
        const cx2 = COL_V[gi];
        mleg.append("line")
          .attr("x1", cx2 - 22).attr("y1", 11).attr("x2", cx2 - 6).attr("y2", 11)
          .attr("stroke", colorMap[gName] || "#999").attr("stroke-width", 2)
          .attr("stroke-dasharray", GROUP_DASHES[gi]);
        mleg.append("text")
          .attr("x", cx2 - 24).attr("y", 11).attr("dy", "0.32em")
          .attr("text-anchor", "end").attr("font-size", 8.5)
          .attr("fill", colorMap[gName] || "#999")
          .text(labelMap[gName] || gName);
      });
    }

    let yRow = 8 + legHeadH;
    measLegend.forEach(({key, color, vals}) => {
      // Swatch
      mleg.append("line")
        .attr("x1", 6).attr("y1", yRow + 7).attr("x2", 24).attr("y2", yRow + 7)
        .attr("stroke", color).attr("stroke-width", 2.5);
      // Etiqueta
      mleg.append("text")
        .attr("x", COL_LABEL).attr("y", yRow + 7).attr("dy", "0.32em")
        .attr("font-size", 9).attr("fill", "#555")
        .text(key);
      // Valores alineados a columnas fijas
      vals.forEach((v, gi) => {
        if (v == null) return;
        mleg.append("text")
          .attr("x", COL_V[gi]).attr("y", yRow + 7).attr("dy", "0.32em")
          .attr("text-anchor", "end").attr("font-size", 9).attr("font-weight", "bold")
          .attr("fill", colorMap[activeGroups[gi]] || "#444")
          .text(v.toFixed(3));
      });
      yRow += legRowH;
    });
  }

  // Puntos de medición resaltados (caninos y molares)
  const CANINE_FDIS = new Set([13, 23, 43, 33]);
  const MOLAR_FDIS  = new Set([16, 26, 46, 36]);
  if (showMeasurePoints) {
    activeGroups.forEach((gName) => {
      const map = byGroup.get(gName);
      if (!map) return;
      const color = colorMap[gName] || "#999";
      for (const [fdi, s] of map) {
        if (!CANINE_FDIS.has(fdi) && !MOLAR_FDIS.has(fdi)) continue;
        if (!visibleFdiSet.has(fdi)) continue;
        const r = CANINE_FDIS.has(fdi) ? 6 : 7;
        g.append("circle")
          .attr("cx", x(s.cx_mean)).attr("cy", y(s.cy_mean))
          .attr("r", r).attr("fill", "none")
          .attr("stroke", color).attr("stroke-width", 2.2).attr("opacity", 0.9);
      }
    });
  }

  // Ejes
  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
  g.append("g").call(d3.axisLeft(y).ticks(8));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 44)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Métricas
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
