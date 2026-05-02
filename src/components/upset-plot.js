/**
 * UpSet plot — co-ocurrencias de patologías a nivel dentadura.
 *
 * Layout estándar:
 *   - TOP RIGHT:  barras verticales = tamaño de cada intersección (n pacientes)
 *   - BOTTOM LEFT: barras horizontales = tamaño total de cada set
 *   - BOTTOM RIGHT: dot matrix (puntos conectados = qué sets forman cada intersección)
 */
import * as d3 from "d3";

export function upsetPlot(upset, {
  width = 780,
  maxIntersections = 20,
} = {}) {
  const {sets, set_counts, n_pantos, intersections} = upset;
  const N = sets.length;
  const inters = intersections.slice(0, maxIntersections);

  // ── Layout ─────────────────────────────────────────────────────────────
  const ROW_H       = 26;
  const INTER_BAR_H = 130;
  const CNT_W       = 42;   // ancho para etiqueta numérica izquierda
  const BAR_AREA_W  = 82;   // ancho para barras horizontales de set-size
  const LBL_W       = 120;  // ancho para etiqueta de patología
  const LEFT_W      = CNT_W + BAR_AREA_W + LBL_W;   // = 244
  const COL_W       = Math.max(26, Math.floor((width - LEFT_W - 10) / inters.length));
  const CHART_W     = inters.length * COL_W;
  const DOT_H       = N * ROW_H;
  const TOP         = 22;
  const BOT         = 18;
  const totalH      = TOP + INTER_BAR_H + DOT_H + BOT;
  const effectiveW  = LEFT_W + CHART_W + 10;

  const dotY0 = TOP + INTER_BAR_H;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, effectiveW, totalH])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  // ── 1. Fondos alternos (filas completas) ──────────────────────────────
  sets.forEach((_, si) => {
    if (si % 2 === 0) {
      svg.append("rect")
        .attr("x", 0).attr("y", dotY0 + si * ROW_H)
        .attr("width", effectiveW).attr("height", ROW_H)
        .attr("fill", "#f7f8fa");
    }
  });

  // ── 2. Barras de set-size (columna izquierda, debajo del área de barras) ──
  const setBarScale = d3.scaleLinear()
    .domain([0, d3.max(set_counts)])
    .range([0, BAR_AREA_W - 4]);

  // Encabezados de columna
  svg.append("text")
    .attr("x", CNT_W + (BAR_AREA_W - 4) / 2).attr("y", dotY0 - 5)
    .attr("text-anchor", "middle").attr("font-size", 8).attr("fill", "#aaa")
    .text("n total");
  svg.append("text")
    .attr("x", LEFT_W - LBL_W / 2).attr("y", dotY0 - 5)
    .attr("text-anchor", "middle").attr("font-size", 8).attr("fill", "#aaa")
    .text("Patología");

  sets.forEach((label, si) => {
    const cy = dotY0 + si * ROW_H + ROW_H / 2;
    const barW = setBarScale(set_counts[si]);

    // Número a la izquierda
    svg.append("text")
      .attr("x", CNT_W - 3).attr("y", cy + 4)
      .attr("text-anchor", "end").attr("font-size", 9).attr("fill", "#555")
      .text(set_counts[si].toLocaleString("es-AR"));

    // Barra horizontal
    svg.append("rect")
      .attr("x", CNT_W + 2).attr("y", cy - 7)
      .attr("width", barW).attr("height", 14)
      .attr("fill", "#6baed6").attr("rx", 2).attr("opacity", 0.85);

    // Etiqueta de patología (alineada a la derecha, junto al separador)
    svg.append("text")
      .attr("x", LEFT_W - 6).attr("y", cy + 4)
      .attr("text-anchor", "end").attr("font-size", 10.5).attr("fill", "#333")
      .text(label);
  });

  // Línea separadora vertical
  svg.append("line")
    .attr("x1", LEFT_W - 0.5).attr("y1", dotY0 - 12)
    .attr("x2", LEFT_W - 0.5).attr("y2", dotY0 + DOT_H)
    .attr("stroke", "#ddd").attr("stroke-width", 1);

  // ── 3. Dot matrix ─────────────────────────────────────────────────────
  const gDots = svg.append("g")
    .attr("transform", `translate(${LEFT_W},${dotY0})`);

  // Líneas de fila
  sets.forEach((_, si) => {
    const cy = si * ROW_H + ROW_H / 2;
    gDots.append("line")
      .attr("x1", 0).attr("y1", cy).attr("x2", CHART_W).attr("y2", cy)
      .attr("stroke", "#ebebeb").attr("stroke-width", 1);
  });

  // Conectores + puntos
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

  // ── 4. Barras de intersección (arriba, sobre el dot matrix) ──────────
  const interScale = d3.scaleLinear()
    .domain([0, d3.max(inters, d => d.count)])
    .range([INTER_BAR_H, 0]).nice();

  const gInter = svg.append("g")
    .attr("transform", `translate(${LEFT_W},${TOP})`);

  gInter.append("g")
    .call(d3.axisLeft(interScale).ticks(4).tickFormat(d3.format(",d")))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").attr("stroke", "#eee").attr("x2", CHART_W));

  gInter.append("text")
    .attr("x", -4).attr("y", -8)
    .attr("text-anchor", "end").attr("font-size", 9).attr("fill", "#888")
    .text("Pacientes");

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

  // ── Nota al pie ───────────────────────────────────────────────────────
  svg.append("text")
    .attr("x", LEFT_W + CHART_W / 2).attr("y", totalH - 2)
    .attr("text-anchor", "middle").attr("font-size", 8.5).attr("fill", "#bbb")
    .text("Intersecciones ordenadas por frecuencia");

  return svg.node();
}
