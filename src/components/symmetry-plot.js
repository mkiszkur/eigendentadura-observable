/**
 * Simetría bilateral (análisis pareado).
 *
 * Para cada par homólogo se incluyen SOLO las dentaduras con ambos dientes
 * presentes, y la asimetría se calcula por dentadura:
 *   dx_reflect = cx_izq + cx_der      (0 si perfecto)
 *   dy         = cy_izq − cy_der      (0 si misma altura)
 *   distance   = √(dx² + dy²)
 *
 * Las estadísticas se agregan con mediana + IQR (robustas a outliers).
 */
import * as d3 from "d3";

export function mirrorFdi(fdi) {
  const q = Math.floor(fdi / 10);
  const p = fdi % 10;
  const qMirror = {1: 2, 2: 1, 3: 4, 4: 3}[q];
  return qMirror * 10 + p;
}

/* ───────────────── Overlay: medianas pareadas ─────────────────
 *
 * Cada par contribuye con dos puntos: el diente izquierdo real en su
 * posición MEDIANA (cx_l_median, cy_l_median) y el diente derecho
 * homólogo REFLEJADO en (−cx_r_median, cy_r_median). Ambas medianas
 * se calculan SOLO sobre dentaduras con ambos dientes presentes.
 * Una línea une el par; cuanto más corta, más simétrico.
 */
export function symmetryOverlay({
  symmetryData,
  toothStats,          // opcional: si se pasa, usa el mismo dominio que el KDE heatmap
  selectedFdi = [],
  highlightTopN = 3,
  useMean = false,     // si true usa mean en vez de median
  width = 800,
  height = 500,
} = {}) {
  const pairs = symmetryData.pairs;
  const selSet = new Set(selectedFdi);

  const xKeyL = useMean ? "cx_l_mean" : "cx_l_median";
  const yKeyL = useMean ? "cy_l_mean" : "cy_l_median";
  const xKeyR = useMean ? "cx_r_mean" : "cx_r_median";
  const yKeyR = useMean ? "cy_r_mean" : "cy_r_median";

  // Puntos a graficar
  const points = pairs.flatMap(p => {
    const pos = p.summary_positions;
    return [
      {side: "L", fdi: p.fdi_l, pair: p, x: pos[xKeyL], y: pos[yKeyL]},
      {side: "R", fdi: p.fdi_r, pair: p, x: -pos[xKeyR], y: pos[yKeyR]},
    ];
  });

  const margin = {top: 30, right: 30, bottom: 50, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%").style("height", "auto");

  const padX = 0.03, padY = 0.03;
  let xMin, xMax, yMin, yMax;
  if (toothStats && toothStats.length) {
    // Mismo dominio que el KDE heatmap (padding 0.3) para alineación visual.
    const xs = toothStats.map(s => s.mean_x);
    const ys = toothStats.map(s => s.mean_y);
    xMin = d3.min(xs) - 0.3; xMax = d3.max(xs) + 0.3;
    yMin = d3.min(ys) - 0.3; yMax = d3.max(ys) + 0.3;
  } else {
    const xExt = d3.extent(points, d => d.x);
    const yExt = d3.extent(points, d => d.y);
    xMin = Math.min(xExt[0], 0) - padX;
    xMax = Math.max(xExt[1], 0) + padX;
    yMin = yExt[0] - padY;
    yMax = yExt[1] + padY;
  }
  // Aspecto 1:1 para no deformar la anatomía.
  const dx = xMax - xMin;
  const dy = yMax - yMin;
  const unit = Math.min(innerW / dx, innerH / dy);
  const usedW = dx * unit;
  const usedH = dy * unit;
  const offX = (innerW - usedW) / 2;
  const offY = (innerH - usedH) / 2;
  const x = d3.scaleLinear().domain([xMin, xMax]).range([offX, offX + usedW]);
  // Maxilar (Y menor) arriba: mapeo directo min→top.
  const y = d3.scaleLinear().domain([yMin, yMax]).range([offY, offY + usedH]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Clip para que el zoom no se desborde.
  const clipId = `sym-clip-${Math.random().toString(36).slice(2, 8)}`;
  svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", innerW).attr("height", innerH);

  // Ejes (fuera del clip; se actualizan con zoom).
  const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = g.append("g");
  xAxisG.call(d3.axisBottom(x).ticks(8));
  yAxisG.call(d3.axisLeft(y).ticks(8));

  // Contenido zoomable.
  const gClip = g.append("g").attr("clip-path", `url(#${clipId})`);
  const gContent = gClip.append("g");

  // Plano sagital
  gContent.append("line").attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#888").attr("stroke-dasharray", "4,3").attr("stroke-width", 1);
  gContent.append("text").attr("x", x(0)).attr("y", -8)
    .attr("font-size", 10).attr("fill", "#666").attr("text-anchor", "middle")
    .text("plano sagital (x = 0)");

  // Escala de color por magnitud de asimetría (orange→red, evita amarillos invisibles en fondo blanco)
  const minDist = d3.min(pairs, p => p.stats.distance.median) || 0;
  const maxDist = d3.max(pairs, p => p.stats.distance.median) || 0.01;
  const color = d3.scaleSequential(d3.interpolateOrRd).domain([minDist * 0.5, maxDist]);

  const COLOR_L = "#2f6feb";
  const COLOR_R = "#d95f0e";

  // Pares ordenados de menor a mayor asimetría (los más asimétricos se dibujan al final)
  const pairsByAsym = [...pairs].sort((a, b) => a.stats.distance.median - b.stats.distance.median);
  // Top N más asimétricos: los últimos N en la lista ordenada ascendente
  const topNSet = new Set(
    highlightTopN > 0 ? pairsByAsym.slice(-highlightTopN).map(p => p.fdi_r) : []
  );

  for (const p of pairsByAsym) {
    const isSel = selSet.has(p.fdi_r) || selSet.has(p.fdi_l);
    const topN = topNSet.has(p.fdi_r);
    const emph = isSel || topN;
    const pos = p.summary_positions;
    const lx = x(pos[xKeyL]);
    const ly = y(pos[yKeyL]);
    const rx = x(-pos[xKeyR]);
    const ry = y(pos[yKeyR]);

    // Línea par (color = magnitud de asimetría mediana, grosor proporcional)
    const dist = p.stats.distance.median;
    const lineW = emph ? 4 : 2 + (dist / maxDist) * 2;
    gContent.append("line")
      .attr("x1", lx).attr("y1", ly).attr("x2", rx).attr("y2", ry)
      .attr("stroke", color(dist))
      .attr("stroke-width", lineW)
      .attr("opacity", emph ? 1 : 0.85)
      .attr("stroke-linecap", "round");

    gContent.append("circle").attr("cx", lx).attr("cy", ly)
      .attr("r", emph ? 5 : 4)
      .attr("fill", COLOR_L).attr("stroke", "#fff").attr("stroke-width", 1);
    // Círculo derecho reflejado: color = asimetría
    gContent.append("circle").attr("cx", rx).attr("cy", ry)
      .attr("r", emph ? 5 : 4)
      .attr("fill", color(dist))
      .attr("stroke", "#333").attr("stroke-width", 0.8);

    if (emph) {
      gContent.append("text").attr("x", lx).attr("y", ly - 9)
        .attr("text-anchor", "middle").attr("font-size", 10)
        .attr("font-weight", "bold").attr("fill", COLOR_L).text(String(p.fdi_l));
      gContent.append("text").attr("x", rx).attr("y", ry + 16)
        .attr("text-anchor", "middle").attr("font-size", 10)
        .attr("font-weight", "bold").attr("fill", COLOR_R).text(`${p.fdi_r}′`);
    }
  }

  // Etiquetas de ejes
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text(`X (landmark-normalized) — posiciones ${useMean ? "medias" : "medianas"} pareadas`);
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Leyenda símbolos
  const leg = g.append("g").attr("transform", "translate(8,6)");
  leg.append("rect").attr("width", 260).attr("height", 48)
    .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.92);
  leg.append("circle").attr("cx", 14).attr("cy", 16).attr("r", 5).attr("fill", COLOR_L);
  leg.append("text").attr("x", 25).attr("y", 20).attr("font-size", 11).attr("fill", "#333")
    .text(`Izquierdo (${useMean ? "media" : "mediana"})`);
  leg.append("circle").attr("cx", 14).attr("cy", 36).attr("r", 5)
    .attr("fill", color(maxDist / 2)).attr("stroke", "#333").attr("stroke-width", 1);
  leg.append("text").attr("x", 25).attr("y", 40).attr("font-size", 11).attr("fill", "#333")
    .text(`Derecho reflejado — color ≡ asimetría`);

  // Gradiente
  const legendW = 180, legendH = 8;
  const defs = svg.append("defs");
  const gradId = `sym-grad-${Math.random().toString(36).slice(2, 8)}`;
  const grad = defs.append("linearGradient").attr("id", gradId)
    .attr("x1", "0%").attr("x2", "100%");
  for (let i = 0; i <= 10; i++) {
    grad.append("stop").attr("offset", `${i * 10}%`)
      .attr("stop-color", color(maxDist * i / 10));
  }
  const lg = g.append("g").attr("transform", `translate(${innerW - legendW},0)`);
  lg.append("text").attr("x", 0).attr("y", -4).attr("font-size", 10).attr("fill", "#666")
    .text("color / largo de línea ≡ asimetría mediana");
  lg.append("rect").attr("width", legendW).attr("height", legendH)
    .attr("fill", `url(#${gradId})`).attr("stroke", "#ccc");
  lg.append("text").attr("x", 0).attr("y", legendH + 10).attr("font-size", 10).attr("fill", "#666").text("0");
  lg.append("text").attr("x", legendW).attr("y", legendH + 10).attr("font-size", 10).attr("fill", "#666")
    .attr("text-anchor", "end").text(maxDist.toFixed(3));

  // Zoom + pan (rueda / drag). Doble-click restablece.
  const zoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .translateExtent([[-innerW * 2, -innerH * 2], [innerW * 3, innerH * 3]])
    .on("zoom", (event) => {
      const t = event.transform;
      gContent.attr("transform", t);
      xAxisG.call(d3.axisBottom(t.rescaleX(x)).ticks(8));
      yAxisG.call(d3.axisLeft(t.rescaleY(y)).ticks(8));
    });
  // Capa invisible para capturar eventos en toda el área del plot.
  g.insert("rect", ":first-child")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "transparent")
    .style("cursor", "grab");
  svg.call(zoom)
    .on("dblclick.zoom", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));

  return svg.node();
}

/* ───────────────── Scatter: nubes pareadas ───────────────── */

/**
 * Para cada par: dibuja la nube de puntos izquierdos (cx_l, cy_l) en azul
 * y los derechos reflejados (−cx_r, cy_r) en naranja. Un marcador más grande
 * indica la mediana de cada nube. Si las nubes se superponen, hay simetría;
 * desplazamientos sistemáticos indican asimetría.
 */
export function symmetryScatter({
  symmetryData,
  selectedFdi = [],
  width = 900,
  height = 560,
} = {}) {
  const pairs = symmetryData.pairs;
  const selSet = new Set(selectedFdi);

  const margin = {top: 30, right: 30, bottom: 55, left: 60};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%").style("height", "auto");

  // Dominio desde todas las nubes
  let xMin = +Infinity, xMax = -Infinity, yMin = +Infinity, yMax = -Infinity;
  for (const p of pairs) {
    for (const pt of p.points) {
      if (pt.cx_l < xMin) xMin = pt.cx_l; if (pt.cx_l > xMax) xMax = pt.cx_l;
      if (pt.cx_r_flipped < xMin) xMin = pt.cx_r_flipped; if (pt.cx_r_flipped > xMax) xMax = pt.cx_r_flipped;
      if (pt.cy_l < yMin) yMin = pt.cy_l; if (pt.cy_l > yMax) yMax = pt.cy_l;
      if (pt.cy_r < yMin) yMin = pt.cy_r; if (pt.cy_r > yMax) yMax = pt.cy_r;
    }
  }
  const padX = 0.04, padY = 0.04;
  const x = d3.scaleLinear().domain([xMin - padX, xMax + padX]).range([0, innerW]);
  // Y invertida (superior arriba anatómicamente)
  const y = d3.scaleLinear().domain([yMax + padY, yMin - padY]).range([0, innerH]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  if (xMin < 0 && xMax > 0) {
    g.append("line").attr("x1", x(0)).attr("x2", x(0))
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#888").attr("stroke-dasharray", "4,3").attr("stroke-width", 1);
    g.append("text").attr("x", x(0)).attr("y", -8)
      .attr("font-size", 10).attr("fill", "#666").attr("text-anchor", "middle")
      .text("plano sagital");
  }

  const COLOR_L = "#2f6feb";
  const COLOR_R = "#d95f0e";

  svg.append("defs").append("clipPath").attr("id", "sym-sc-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);
  const gClip = g.append("g").attr("clip-path", "url(#sym-sc-clip)");

  // Primero pares NO seleccionados (pálidos), luego los seleccionados (encima)
  const sorted = [...pairs].sort((a, b) => {
    const sa = selSet.has(a.fdi_r) || selSet.has(a.fdi_l);
    const sb = selSet.has(b.fdi_r) || selSet.has(b.fdi_l);
    return (sa === sb) ? 0 : (sa ? 1 : -1);
  });

  for (const p of sorted) {
    const isSel = selSet.has(p.fdi_r) || selSet.has(p.fdi_l);
    const op = isSel ? 0.55 : 0.12;
    const r = 1.6;
    for (const pt of p.points) {
      gClip.append("circle").attr("cx", x(pt.cx_l)).attr("cy", y(pt.cy_l))
        .attr("r", r).attr("fill", COLOR_L).attr("opacity", op);
      gClip.append("circle").attr("cx", x(pt.cx_r_flipped)).attr("cy", y(pt.cy_r))
        .attr("r", r).attr("fill", COLOR_R).attr("opacity", op);
    }
  }

  // Marcadores mediana + línea mediana-a-mediana (arriba de todo)
  for (const p of pairs) {
    const isSel = selSet.has(p.fdi_r) || selSet.has(p.fdi_l);
    const pos = p.summary_positions;
    const lx = x(pos.cx_l_median);
    const ly = y(pos.cy_l_median);
    const rx = x(-pos.cx_r_median);
    const ry = y(pos.cy_r_median);

    g.append("line").attr("x1", lx).attr("y1", ly).attr("x2", rx).attr("y2", ry)
      .attr("stroke", "#555").attr("stroke-width", isSel ? 2 : 1)
      .attr("opacity", isSel ? 1 : 0.5);
    g.append("circle").attr("cx", lx).attr("cy", ly).attr("r", isSel ? 5 : 3.5)
      .attr("fill", COLOR_L).attr("stroke", "#fff").attr("stroke-width", 1);
    g.append("circle").attr("cx", rx).attr("cy", ry).attr("r", isSel ? 5 : 3.5)
      .attr("fill", COLOR_R).attr("stroke", "#fff").attr("stroke-width", 1);

    if (isSel) {
      g.append("text").attr("x", lx).attr("y", ly - 9)
        .attr("text-anchor", "middle").attr("font-size", 10)
        .attr("font-weight", "bold").attr("fill", COLOR_L).text(String(p.fdi_l));
      g.append("text").attr("x", rx).attr("y", ry + 16)
        .attr("text-anchor", "middle").attr("font-size", 10)
        .attr("font-weight", "bold").attr("fill", COLOR_R).text(`${p.fdi_r}′`);
    }
  }

  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
  g.append("g").call(d3.axisLeft(y).ticks(8));
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  const leg = g.append("g").attr("transform", "translate(8,6)");
  leg.append("rect").attr("width", 330).attr("height", 46)
    .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.95);
  leg.append("circle").attr("cx", 14).attr("cy", 16).attr("r", 5).attr("fill", COLOR_L);
  leg.append("text").attr("x", 25).attr("y", 20).attr("font-size", 11).attr("fill", "#333")
    .text("● Izquierdo real (cx_izq, cy_izq)");
  leg.append("circle").attr("cx", 14).attr("cy", 34).attr("r", 5).attr("fill", COLOR_R);
  leg.append("text").attr("x", 25).attr("y", 38).attr("font-size", 11).attr("fill", "#333")
    .text("● Derecho reflejado (−cx_der, cy_der)");
  leg.append("text").attr("x", 185).attr("y", 20).attr("font-size", 10).attr("fill", "#666")
    .text(`${pairs.length} pares homólogos`);
  leg.append("text").attr("x", 185).attr("y", 36).attr("font-size", 10).attr("fill", "#666")
    .text("puntos opacos = par seleccionado");

  return svg.node();
}

/* ───────────────── Boxplot: distribución de la distancia ───────────────── */

export function symmetryBoxplot({
  symmetryData,
  selectedFdi = [],
  width = 900,
  height = 360,
} = {}) {
  const selSet = new Set(selectedFdi);

  // Orden anatómico: 18↔28, 17↔27, ..., 11↔21, 41↔31, ..., 48↔38
  const fdiOrder = [18, 17, 16, 15, 14, 13, 12, 11, 48, 47, 46, 45, 44, 43, 42, 41];
  const byRight = new Map(symmetryData.pairs.map(p => [p.fdi_r, p]));
  const ordered = fdiOrder.map(f => byRight.get(f)).filter(Boolean);

  const margin = {top: 20, right: 20, bottom: 55, left: 70};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width).attr("height", height)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%").style("height", "auto");

  const labels = ordered.map(p => `${p.fdi_r} ↔ ${p.fdi_l}`);
  const xBand = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.25);
  const maxY = d3.max(ordered, p => p.stats.distance.p95) * 1.08;
  const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]).nice();

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  for (const p of ordered) {
    const s = p.stats.distance;
    const label = `${p.fdi_r} ↔ ${p.fdi_l}`;
    const bx = xBand(label);
    const bw = xBand.bandwidth();
    const cx = bx + bw / 2;
    const isSel = selSet.has(p.fdi_r) || selSet.has(p.fdi_l);
    const color = isSel ? "#c0392b" : "#7a8ea8";
    const opacity = isSel ? 0.95 : 0.75;

    // Whiskers (p05 → p95)
    g.append("line").attr("x1", cx).attr("x2", cx)
      .attr("y1", y(s.p05)).attr("y2", y(s.p95))
      .attr("stroke", color).attr("opacity", opacity);
    g.append("line").attr("x1", cx - 6).attr("x2", cx + 6)
      .attr("y1", y(s.p05)).attr("y2", y(s.p05))
      .attr("stroke", color).attr("opacity", opacity);
    g.append("line").attr("x1", cx - 6).attr("x2", cx + 6)
      .attr("y1", y(s.p95)).attr("y2", y(s.p95))
      .attr("stroke", color).attr("opacity", opacity);

    // Caja IQR
    g.append("rect")
      .attr("x", bx).attr("width", bw)
      .attr("y", y(s.q3)).attr("height", y(s.q1) - y(s.q3))
      .attr("fill", color).attr("opacity", opacity * 0.4)
      .attr("stroke", color);

    // Mediana
    g.append("line").attr("x1", bx).attr("x2", bx + bw)
      .attr("y1", y(s.median)).attr("y2", y(s.median))
      .attr("stroke", color).attr("stroke-width", 2);

    // n pareado
    g.append("text")
      .attr("x", cx).attr("y", y(s.p95) - 5)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#888")
      .text(`n=${p.n_paired}`);
  }

  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xBand))
    .selectAll("text")
    .attr("transform", "rotate(-35)").attr("text-anchor", "end").attr("font-size", 10);

  g.append("g").call(d3.axisLeft(y).ticks(6));
  g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -55)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Distancia de asimetría (unidades LM)");

  return svg.node();
}
