/**
 * Violines marginales por subpoblación.
 *
 * Dos violines verticales simétricos por celda (uno por grupo), igual al
 * estándar de seaborn. Eje Y = valores de posición; anchura = densidad.
 * Columna izquierda = distribución X (mesio-distal).
 * Columna derecha   = distribución Y (supero-inferior).
 *
 * Normalización: cada violín al propio máximo → ambos llenan la misma altura.
 * La concentración se lee por el ancho del violín sobre el eje Y compartido.
 */
import * as d3 from "d3";

export function subpopViolinPlot({
  selectedFdi,
  violinData,
  colorMap,
  labelMap,
  width = 900,
}) {
  const groupNames = Object.keys(violinData.groups);
  const labelW  = 40;
  const gap     = 16;
  const cellW   = Math.floor((width - labelW - gap) / 2);
  const cellH   = 160;
  const rowH    = cellH + 12;
  const headerH = 24;
  const totalH  = headerH + selectedFdi.length * rowH + 20;

  const svg = d3.create("svg")
    .attr("width", width).attr("height", totalH)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  // Encabezados de columna
  [["Posición X (mesio-distal)", 0], ["Posición Y (supero-inferior)", 1]].forEach(([txt, col]) => {
    svg.append("text")
      .attr("x", labelW + col * (cellW + gap) + cellW / 2).attr("y", 16)
      .attr("text-anchor", "middle").attr("font-size", 12)
      .attr("font-weight", 600).attr("fill", "#444").text(txt);
  });

  selectedFdi.forEach((fdi, row) => {
    const y0 = headerH + row * rowH;

    // Etiqueta FDI
    svg.append("text")
      .attr("x", labelW - 7).attr("y", y0 + cellH / 2 + 4)
      .attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 600)
      .attr("fill", "#444").text(String(fdi));

    _drawViolinCell(svg, {x: labelW,               y: y0, w: cellW, h: cellH,
                          coord: "x", fdi: String(fdi), violinData, groupNames, colorMap, labelMap});
    _drawViolinCell(svg, {x: labelW + cellW + gap,  y: y0, w: cellW, h: cellH,
                          coord: "y", fdi: String(fdi), violinData, groupNames, colorMap, labelMap});
  });

  // Leyenda inferior
  const ly = totalH - 6;
  groupNames.forEach((gName, i) => {
    const lx = width - 10 - (groupNames.length - i) * 95;
    svg.append("rect").attr("x", lx).attr("y", ly - 11).attr("width", 13).attr("height", 13)
      .attr("fill", colorMap[gName] || "#999").attr("opacity", 0.5).attr("rx", 2);
    svg.append("text").attr("x", lx + 17).attr("y", ly)
      .attr("font-size", 11).attr("fill", "#555").text(labelMap[gName] || gName);
  });

  return svg.node();
}

function _drawViolinCell(svg, {x, y, w, h, coord, fdi, violinData, groupNames, colorMap, labelMap}) {
  const g = svg.append("g").attr("transform", `translate(${x},${y})`);

  const groups = groupNames.map(gName => {
    const td = violinData.groups[gName]?.teeth?.[fdi];
    if (!td) return null;
    return {
      gName,
      n:      td.n,
      range:  coord === "x" ? td.x_range  : td.y_range,
      values: coord === "x" ? td.x_values : td.y_values,
      median: coord === "x" ? td.median_x : td.median_y,
      q25:    coord === "x" ? td.q25_x    : td.q25_y,
      q75:    coord === "x" ? td.q75_x    : td.q75_y,
    };
  }).filter(Boolean);

  if (groups.length < 1) return;

  const padL  = 32;   // espacio para eje Y
  const padB  = 18;   // espacio para etiquetas de grupo
  const plotW = w - padL;
  const plotH = h - padB;

  // Eje Y compartido — rango combinado de ambos grupos
  const rMin   = Math.min(...groups.map(g => g.range[0]));
  const rMax   = Math.max(...groups.map(g => g.range[1]));
  const yScale = d3.scaleLinear().domain([rMin, rMax]).range([plotH, 0]);

  // Fondo
  g.append("rect").attr("x", padL).attr("width", plotW).attr("height", plotH)
    .attr("fill", "#f9f9f9").attr("rx", 3);

  // Eje Y
  const axG = g.append("g").attr("transform", `translate(${padL},0)`);
  axG.call(d3.axisLeft(yScale).ticks(4).tickSize(3)).style("font-size", "9px");
  axG.select(".domain").attr("stroke", "#ccc");
  axG.selectAll(".tick line").attr("stroke", "#ccc");

  const nG       = groups.length;
  const slotW    = plotW / nG;
  const maxHalfW = slotW * 0.42;
  const boxHalfW = maxHalfW * 0.52;  // caja IQR ≈ 52 % del ancho del violín

  groups.forEach((grp, i) => {
    const {range, values, median, q25, q75, n, gName} = grp;
    const color = colorMap[gName] || "#999";
    const N     = values.length;
    const step  = (range[1] - range[0]) / (N - 1);
    const cx    = padL + (i + 0.5) * slotW;

    // Violín al fondo (más transparente — forma secundaria)
    const grpMax = Math.max(...values);
    const scale  = grpMax > 0 ? maxHalfW / grpMax : 0;

    const areaFn = d3.area()
      .y((_, j) => yScale(range[0] + j * step))
      .x0(v => cx - v * scale)
      .x1(v => cx + v * scale)
      .curve(d3.curveBasis);

    g.append("path").datum(values)
      .attr("d", areaFn)
      .attr("fill", color).attr("fill-opacity", 0.18)
      .attr("stroke", color).attr("stroke-width", 1).attr("stroke-opacity", 0.5);

    // Caja IQR proporcional al ancho del violín
    const yQ25 = yScale(q25), yQ75 = yScale(q75);
    g.append("rect")
      .attr("x", cx - boxHalfW).attr("y", yQ75)
      .attr("width", boxHalfW * 2).attr("height", Math.abs(yQ25 - yQ75))
      .attr("fill", color).attr("fill-opacity", 0.28)
      .attr("stroke", color).attr("stroke-width", 1.8);

    // Línea de mediana dentro de la caja
    const my = yScale(median);
    g.append("line")
      .attr("x1", cx - boxHalfW).attr("x2", cx + boxHalfW)
      .attr("y1", my).attr("y2", my)
      .attr("stroke", color).attr("stroke-width", 2.5);

    // Bigotes (1.5 × IQR, clampados al rango de datos)
    const iqr   = q75 - q25;
    const wLow  = Math.max(rMin, q25 - 1.5 * iqr);
    const wHigh = Math.min(rMax, q75 + 1.5 * iqr);
    const whiskerX = cx;
    for (const [wY1, wY2] of [[yScale(wLow), yQ25], [yScale(wHigh), yQ75]]) {
      g.append("line")
        .attr("x1", whiskerX).attr("x2", whiskerX)
        .attr("y1", wY1).attr("y2", wY2)
        .attr("stroke", color).attr("stroke-width", 1.5).attr("stroke-opacity", 0.7);
      g.append("line")
        .attr("x1", cx - boxHalfW * 0.4).attr("x2", cx + boxHalfW * 0.4)
        .attr("y1", wY1).attr("y2", wY1)
        .attr("stroke", color).attr("stroke-width", 1.5).attr("stroke-opacity", 0.7);
    }

    // Etiqueta del grupo + N debajo del violín
    g.append("text")
      .attr("x", cx).attr("y", plotH + padB - 3)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", color)
      .text(`${labelMap[gName] || gName} (n=${n})`);
  });
}
