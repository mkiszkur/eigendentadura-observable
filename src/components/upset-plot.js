/**
 * UpSet plot — co-ocurrencias de patologías a nivel dentadura.
 *
 * Layout: panel izquierdo fijo (barras horizontales + etiquetas) +
 * panel derecho desplazable (barras verticales + dot matrix).
 */
import * as d3 from "d3";

export function upsetPlot(upset, {
  width = 780,
  maxIntersections = 20,
} = {}) {
  const {sets, set_counts, intersections} = upset;
  const N = sets.length;
  const inters = intersections.slice(0, maxIntersections);

  // ── Layout ─────────────────────────────────────────────────────────────
  const ROW_H       = 32;
  const INTER_BAR_H = 175;
  const CNT_W       = 42;
  const BAR_AREA_W  = 82;
  const LBL_W       = 120;
  const LEFT_W      = CNT_W + BAR_AREA_W + LBL_W;   // = 244
  const COL_W       = Math.max(26, Math.floor((width - LEFT_W - 10) / inters.length));
  const CHART_W     = inters.length * COL_W;
  const DOT_H       = N * ROW_H;
  const TOP         = 22;
  const BOT         = 18;
  const totalH      = TOP + INTER_BAR_H + DOT_H + BOT;
  const dotY0       = TOP + INTER_BAR_H;

  const setBarScale = d3.scaleLinear()
    .domain([0, d3.max(set_counts)])
    .range([0, BAR_AREA_W - 4]);

  const interScale = d3.scaleLinear()
    .domain([0, d3.max(inters, d => d.count)])
    .range([INTER_BAR_H, 0]).nice();

  // ── Panel izquierdo (fijo) ─────────────────────────────────────────────
  const leftSvg = d3.create("svg")
    .attr("viewBox", [0, 0, LEFT_W, totalH])
    .attr("width", LEFT_W)
    .attr("height", totalH)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("display", "block");

  // Fondo blanco explícito (cubre contenido al hacer scroll)
  leftSvg.append("rect")
    .attr("x", 0).attr("y", 0)
    .attr("width", LEFT_W).attr("height", totalH)
    .attr("fill", "white");

  // Fondos alternos de filas
  sets.forEach((_, si) => {
    if (si % 2 === 0) {
      leftSvg.append("rect")
        .attr("x", 0).attr("y", dotY0 + si * ROW_H)
        .attr("width", LEFT_W).attr("height", ROW_H)
        .attr("fill", "#f7f8fa");
    }
  });

  // Encabezados
  leftSvg.append("text")
    .attr("x", CNT_W + (BAR_AREA_W - 4) / 2).attr("y", dotY0 - 5)
    .attr("text-anchor", "middle").attr("font-size", 8).attr("fill", "#aaa")
    .text("n total");
  leftSvg.append("text")
    .attr("x", LEFT_W - LBL_W / 2).attr("y", dotY0 - 5)
    .attr("text-anchor", "middle").attr("font-size", 8).attr("fill", "#aaa")
    .text("Patología");

  // Eje Y (escala de intersecciones) en el borde derecho del panel
  const gAxis = leftSvg.append("g")
    .attr("transform", `translate(${LEFT_W},${TOP})`);
  gAxis.append("g")
    .call(d3.axisLeft(interScale).ticks(4).tickFormat(d3.format(",d")))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove());  // grid lines van en panel derecho
  gAxis.append("text")
    .attr("x", -4).attr("y", -9)
    .attr("text-anchor", "end").attr("font-size", 9).attr("fill", "#888")
    .text("Pacientes");

  // Barras horizontales + etiquetas de patología
  sets.forEach((label, si) => {
    const cy = dotY0 + si * ROW_H + ROW_H / 2;
    const barW = setBarScale(set_counts[si]);

    leftSvg.append("text")
      .attr("x", CNT_W - 3).attr("y", cy + 4)
      .attr("text-anchor", "end").attr("font-size", 9).attr("fill", "#555")
      .text(set_counts[si].toLocaleString("es-AR"));

    leftSvg.append("rect")
      .attr("x", CNT_W + 2).attr("y", cy - 7)
      .attr("width", barW).attr("height", 14)
      .attr("fill", "#6baed6").attr("rx", 2).attr("opacity", 0.85);

    leftSvg.append("text")
      .attr("x", LEFT_W - 6).attr("y", cy + 4)
      .attr("text-anchor", "end").attr("font-size", 10.5).attr("fill", "#333")
      .text(label);
  });

  // Borde derecho separador
  leftSvg.append("line")
    .attr("x1", LEFT_W - 0.5).attr("y1", TOP)
    .attr("x2", LEFT_W - 0.5).attr("y2", dotY0 + DOT_H)
    .attr("stroke", "#ddd").attr("stroke-width", 1);

  // ── Panel derecho (desplazable) ────────────────────────────────────────
  const rightW = CHART_W + 10;
  const rightSvg = d3.create("svg")
    .attr("viewBox", [0, 0, rightW, totalH])
    .attr("width", rightW)
    .attr("height", totalH)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("display", "block");

  // Fondos alternos de filas (coinciden con panel izquierdo)
  sets.forEach((_, si) => {
    if (si % 2 === 0) {
      rightSvg.append("rect")
        .attr("x", 0).attr("y", dotY0 + si * ROW_H)
        .attr("width", rightW).attr("height", ROW_H)
        .attr("fill", "#f7f8fa");
    }
  });

  // Grid lines horizontales del eje Y
  const gGrid = rightSvg.append("g").attr("transform", `translate(0,${TOP})`);
  gGrid.append("g")
    .call(d3.axisLeft(interScale).ticks(4))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text").remove())
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#eee").attr("x1", 0).attr("x2", CHART_W));

  // Dot matrix — líneas de fila
  const gDots = rightSvg.append("g").attr("transform", `translate(0,${dotY0})`);
  sets.forEach((_, si) => {
    const cy = si * ROW_H + ROW_H / 2;
    gDots.append("line")
      .attr("x1", 0).attr("y1", cy).attr("x2", CHART_W).attr("y2", cy)
      .attr("stroke", "#ebebeb").attr("stroke-width", 1);
  });

  // Dot matrix — conectores + puntos
  inters.forEach((inter, ci) => {
    const x = ci * COL_W + COL_W / 2;
    const activeSet = new Set(inter.sets);
    const actIdxs = sets.map((l, i) => activeSet.has(l) ? i : -1).filter(i => i >= 0);

    if (actIdxs.length > 1) {
      const y1 = actIdxs[0] * ROW_H + ROW_H / 2;
      const y2 = actIdxs.at(-1) * ROW_H + ROW_H / 2;
      gDots.append("line")
        .attr("x1", x).attr("y1", y1).attr("x2", x).attr("y2", y2)
        .attr("stroke", "#2171b5").attr("stroke-width", 2.5);
    }

    sets.forEach((lbl, si) => {
      const cy = si * ROW_H + ROW_H / 2;
      const active = activeSet.has(lbl);
      gDots.append("circle")
        .attr("cx", x).attr("cy", cy)
        .attr("r", active ? 7 : 4)
        .attr("fill", active ? "#2171b5" : "#ddd")
        .append("title")
        .text(`${inter.sets.join(" + ")}\n${inter.count.toLocaleString("es-AR")} pacientes`);
    });
  });

  // Barras de intersección (arriba)
  const gInter = rightSvg.append("g").attr("transform", `translate(0,${TOP})`);
  inters.forEach((inter, ci) => {
    const x = ci * COL_W + COL_W / 2;
    const isSingle = inter.sets.length === 1;
    const y0 = interScale(inter.count);
    const barH = INTER_BAR_H - y0;

    gInter.append("rect")
      .attr("x", x - COL_W * 0.38).attr("y", y0)
      .attr("width", COL_W * 0.76).attr("height", barH)
      .attr("fill", isSingle ? "#6baed6" : "#2171b5").attr("rx", 2);

    if (barH > 18) {
      gInter.append("text")
        .attr("x", x).attr("y", y0 - 3)
        .attr("text-anchor", "middle").attr("font-size", 7.5).attr("fill", "#444")
        .text(inter.count.toLocaleString("es-AR"));
    }
  });

  // Nota al pie
  rightSvg.append("text")
    .attr("x", CHART_W / 2).attr("y", totalH - 2)
    .attr("text-anchor", "middle").attr("font-size", 8.5).attr("fill", "#bbb")
    .text("Intersecciones ordenadas por frecuencia");

  // ── Wrapper: panel fijo + panel desplazable ────────────────────────────
  const wrapper = d3.create("div")
    .style("display", "flex")
    .style("align-items", "flex-start");

  wrapper.append("div")
    .style("flex-shrink", "0")
    .style("box-shadow", "2px 0 6px rgba(0,0,0,0.07)")
    .style("z-index", "1")
    .style("position", "relative")
    .append(() => leftSvg.node());

  wrapper.append("div")
    .style("overflow-x", "auto")
    .style("flex", "1")
    .append(() => rightSvg.node());

  return wrapper.node();
}
