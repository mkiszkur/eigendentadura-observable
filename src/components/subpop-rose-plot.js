/**
 * Subpop Rose Plot — comparación angular entre dos subpoblaciones.
 *
 * Para cada diente con datos, dibuja una mini-rosa en su posición anatómica
 * (centroide medio poblacional). Usa la misma convención que rose-plot.js y
 * el modal: 90° dental = 12h, sin amplificación. Eje radial local por
 * (diente, grupo) para que los dos histogramas sean comparables visualmente.
 */
import * as d3 from "d3";

const toArcRad = (deg) => ((90 - deg) * Math.PI) / 180;

/**
 * @param {Object} opts
 * @param {Array}  opts.toothStats  - tooth_stats.json (mean_x, mean_y, mean_angle, fdi)
 * @param {Array}  opts.subpopStats - tooth_stats_subpop.json filtrado al eje
 * @param {Array}  opts.groupNames  - orden de los dos grupos
 * @param {Object} opts.colorMap
 * @param {Object} opts.labelMap
 * @param {Array<number>} [opts.selectedFdi]  - si vacío, todos los dientes
 * @param {number} [opts.width=900]
 * @param {number} [opts.height=580]
 */
export function subpopRosePlot({
  toothStats,
  subpopStats,
  groupNames,
  colorMap,
  labelMap = {},
  selectedFdi = [],
  width = 900,
  height = 580,
} = {}) {
  const margin = {top: 30, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const selSet = new Set(selectedFdi);
  const hasSel = selSet.size > 0;

  // Lookups
  const popByFdi = new Map(toothStats.map(s => [s.fdi, s]));
  const subByKey = new Map(); // `${group}::${fdi}` → row
  for (const s of subpopStats) subByKey.set(`${s.group}::${s.fdi}`, s);

  // Position scales
  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const pad = 0.35;
  const xScale0 = d3.scaleLinear().domain([d3.min(xs) - pad, d3.max(xs) + pad]).range([0, innerW]);
  const yScale0 = d3.scaleLinear().domain([d3.min(ys) - pad, d3.max(ys) + pad]).range([0, innerH]);
  let xScale = xScale0.copy(), yScale = yScale0.copy();

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  svg.append("defs").append("clipPath")
    .attr("id", "subpop-rose-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");
  const gClip = gOuter.append("g").attr("clip-path", "url(#subpop-rose-clip)");
  const gContent = gClip.append("g");

  gOuter.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  function draw(k = 1) {
    gContent.selectAll("*").remove();
    const roseRadius = Math.max(16, Math.min(24 * k, 70));

    for (const pop of toothStats) {
      const fdi = pop.fdi;
      const dimmed = hasSel && !selSet.has(fdi);
      const cx = xScale(pop.mean_x);
      const cy = yScale(pop.mean_y);
      const popMean = pop.mean_angle;

      // Rotamos la mini-rosa para que la media poblacional quede arriba (12h),
      // misma convención que rose-plot.js y angle-rose.js (modal).
      const meanRotation = popMean - 90;
      const toothG = gContent.append("g")
        .attr("transform", `translate(${cx},${cy}) rotate(${meanRotation})`)
        .attr("opacity", dimmed ? 0.12 : 1);

      toothG.append("circle").attr("r", roseRadius)
        .attr("fill", "#fafafa").attr("stroke", "#e0e0e0").attr("stroke-width", 0.5);

      // Línea de referencia = media poblacional (queda apuntando a 12h tras la rotación).
      const popMeanRad = toArcRad(popMean);
      toothG.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", Math.sin(popMeanRad) * roseRadius)
        .attr("y2", -Math.cos(popMeanRad) * roseRadius)
        .attr("stroke", "#888").attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2").attr("opacity", 0.6);

      for (const gName of groupNames) {
        const sub = subByKey.get(`${gName}::${fdi}`);
        if (!sub) continue;
        const color = colorMap[gName] || "#999";
        const hist = sub.angle_histogram || [];
        const binW = sub.bin_width
          || (hist.length >= 2 ? hist[1].angle - hist[0].angle : 5);
        const halfBin = binW / 2;

        // Escala radial local por (grupo, diente) para llenar la rosa.
        const localMax = d3.max(hist, d => d.count) || 1;
        const rScale = d3.scaleLinear().domain([0, localMax]).range([0, roseRadius - 3]);

        const petals = toothG.append("g").attr("class", `petals-${gName}`);
        for (const bin of hist) {
          if (!bin.count) continue;
          const a0 = toArcRad(bin.angle - halfBin);
          const a1 = toArcRad(bin.angle + halfBin);
          petals.append("path")
            .attr("d", d3.arc()
              .innerRadius(0).outerRadius(rScale(bin.count))
              .startAngle(Math.min(a0, a1)).endAngle(Math.max(a0, a1))())
            .attr("fill", color).attr("fill-opacity", 0.35)
            .attr("stroke", color).attr("stroke-opacity", 0.5).attr("stroke-width", 0.4);
        }

        // Flecha = media del grupo en eje absoluto.
        const meanRad = toArcRad(sub.angle_mean);
        toothG.append("line")
          .attr("x1", 0).attr("y1", 0)
          .attr("x2", Math.sin(meanRad) * (roseRadius - 3))
          .attr("y2", -Math.cos(meanRad) * (roseRadius - 3))
          .attr("stroke", color).attr("stroke-width", 2)
          .attr("opacity", 0.95);
        toothG.append("circle")
          .attr("cx", Math.sin(meanRad) * (roseRadius - 3))
          .attr("cy", -Math.cos(meanRad) * (roseRadius - 3))
          .attr("r", 2).attr("fill", color);
      }

      const fontSize = Math.max(8, 9 * Math.min(k, 3));
      // Label fuera del grupo rotado, así no rota.
      gContent.append("text")
        .attr("x", cx).attr("y", cy - roseRadius - 3)
        .attr("text-anchor", "middle").attr("font-size", fontSize)
        .attr("font-weight", "bold").attr("fill", "#333")
        .text(fdi);

      const tooltipParts = [`FDI ${fdi} · pop μ=${popMean.toFixed(1)}°`];
      for (const gName of groupNames) {
        const sub = subByKey.get(`${gName}::${fdi}`);
        if (sub) tooltipParts.push(`${labelMap[gName] || gName}: μ=${sub.angle_mean.toFixed(1)}° σ=${sub.angle_std.toFixed(1)}° n=${sub.n}`);
      }
      toothG.append("title").text(tooltipParts.join("\n"));
    }

    xAxisG.call(d3.axisBottom(xScale).ticks(6));
    yAxisG.call(d3.axisLeft(yScale).ticks(6));
  }

  // Zoom
  const zoom = d3.zoom().scaleExtent([1, 12]).on("zoom", (event) => {
    xScale = event.transform.rescaleX(xScale0);
    yScale = event.transform.rescaleY(yScale0);
    draw(event.transform.k);
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

  // Leyenda
  const leg = gOuter.append("g").attr("transform", `translate(8, 6)`);
  leg.append("rect").attr("width", 240).attr("height", 64)
    .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.96);
  leg.append("text").attr("x", 8).attr("y", 16)
    .attr("font-size", 11).attr("font-weight", "bold").attr("fill", "#333")
    .text("Distribución angular por grupo");
  groupNames.forEach((gName, i) => {
    const yL = 32 + i * 14;
    leg.append("line").attr("x1", 10).attr("y1", yL).attr("x2", 24).attr("y2", yL)
      .attr("stroke", colorMap[gName]).attr("stroke-width", 2);
    leg.append("circle").attr("cx", 26).attr("cy", yL).attr("r", 2).attr("fill", colorMap[gName]);
    leg.append("rect").attr("x", 32).attr("y", yL - 4).attr("width", 14).attr("height", 8)
      .attr("fill", colorMap[gName]).attr("fill-opacity", 0.35).attr("stroke", colorMap[gName]).attr("stroke-opacity", 0.5);
    leg.append("text").attr("x", 50).attr("y", yL + 3)
      .attr("font-size", 10).attr("fill", "#333")
      .text(`${labelMap[gName] || gName}: ↑μ · pétalos = histograma`);
  });

  return svg.node();
}
