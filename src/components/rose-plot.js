/**
 * Rose Plot — mini histogramas circulares de orientación angular por diente,
 * dispuestos en la posición anatómica de cada pieza (como la eigendentadura).
 *
 * Cada mini-rosa usa la misma convención que el modal de detalle:
 * 90° dental = 12h, sin amplificación. Eje radial local por diente.
 * La línea radial gris representa la orientación media del diente.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

// Convención compartida con angle-rose.js: 0 rad = 12h (arriba), CW positivo.
const toArcRad = (deg) => ((90 - deg) * Math.PI) / 180;

/**
 * @param {Object} opts
 * @param {Array} opts.angleHistograms  - tooth_angle_histograms.json
 * @param {Array} opts.toothStats       - tooth_stats.json (for mean_x, mean_y)
 * @param {Array<number>} opts.selectedFdi - FDI numbers to highlight
 * @param {number} opts.width
 * @param {number} opts.height
 */
export function rosePlot({angleHistograms, toothStats, selectedFdi = [], onToothClick = null, width = 900, height = 600, rotateToMean = true} = {}) {
  const margin = {top: 25, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const selectedSet = new Set(selectedFdi);
  const hasSelection = selectedSet.size > 0;

  // Build lookups
  const statsByFdi = {};
  for (const s of toothStats) statsByFdi[s.fdi] = s;
  const histByFdi = {};
  for (const h of angleHistograms) histByFdi[h.fdi] = h;
  // Position scales
  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const pad = 0.05;
  const xScale0 = d3.scaleLinear().domain([d3.min(xs) - pad, d3.max(xs) + pad]).range([0, innerW]);
  const yScale0 = d3.scaleLinear().domain([d3.min(ys) - pad, d3.max(ys) + pad]).range([0, innerH]);
  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  svg.append("defs").append("clipPath")
    .attr("id", "rose-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");
  const gClip = gOuter.append("g").attr("clip-path", "url(#rose-clip)");
  const g = gClip.append("g");

  // Axis labels
  gOuter.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Legend (fixed)
  const legend = gOuter.append("g").attr("transform", `translate(${innerW - 160}, 5)`);
  legend.append("line")
    .attr("x1", 0).attr("y1", 6).attr("x2", 14).attr("y2", 6)
    .attr("stroke", "#333").attr("stroke-width", 1.5);
  legend.append("text").attr("x", 18).attr("y", 10)
    .attr("font-size", 10).attr("fill", "#555").text("Ángulo medio");
  legend.append("text").attr("x", 0).attr("y", 26)
    .attr("font-size", 9).attr("fill", "#999")
    .text("↑ = 90° dental (vertical) · pétalos = histograma");

  // Base radius proportional to average area available per tooth at k=1
  const baseRadius = Math.max(18, Math.sqrt((innerW * innerH) / Math.max(1, toothStats.length)) * 0.40);

  function draw(k = 1) {
    g.selectAll("*").remove();

    // Grid
    g.append("g").selectAll("line").data(yScale.ticks(6)).join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#f0f0f0");
    g.append("g").selectAll("line").data(xScale.ticks(6)).join("line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("stroke", "#f0f0f0");

    // Midline
    g.append("line")
      .attr("x1", xScale(0)).attr("x2", xScale(0))
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "cyan").attr("stroke-dasharray", "4,3").attr("opacity", 0.4);

    const roseRadius = baseRadius * k;

    for (const stats of toothStats) {
      const fdi = stats.fdi;
      const hist = histByFdi[fdi];
      if (!hist) continue;

      const cx = xScale(stats.mean_x);
      const cy = yScale(stats.mean_y);
      const color = QUADRANT_COLORS[stats.quadrant] || "#999";
      const selected = selectedSet.has(fdi);
      const dimmed = hasSelection && !selected;
      const alpha = dimmed ? 0.1 : 0.65;
      const strokeAlpha = dimmed ? 0.05 : 0.5;

      // Per-tooth max count for local radial scale
      const localMax = d3.max(hist.histogram, d => d.count);
      const rScale = d3.scaleLinear().domain([0, localMax]).range([0, roseRadius]);

      const meanAngle = stats.mean_angle;
      const meanRotation = rotateToMean ? meanAngle - 90 : 0;
      const toothG = g.append("g")
        .attr("transform", `translate(${cx},${cy}) rotate(${meanRotation})`);

      // Background circle
      toothG.append("circle")
        .attr("r", roseRadius)
        .attr("fill", "none")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 0.5)
        .attr("opacity", dimmed ? 0.15 : 0.4);

      // Draw petals usando ángulo absoluto (90° dental = 12h, sin amplificar)
      const binW = hist.bin_width
        || (hist.histogram.length >= 2 ? hist.histogram[1].angle - hist.histogram[0].angle : 5);
      const halfBin = binW / 2;
      for (const bin of hist.histogram) {
        if (!bin.count) continue;
        const a0 = toArcRad(bin.angle - halfBin);
        const a1 = toArcRad(bin.angle + halfBin);
        const r = rScale(bin.count);

        toothG.append("path")
          .attr("d", d3.arc()
            .innerRadius(0)
            .outerRadius(r)
            .startAngle(Math.min(a0, a1))
            .endAngle(Math.max(a0, a1))())
          .attr("fill", color)
          .attr("fill-opacity", alpha)
          .attr("stroke", color)
          .attr("stroke-opacity", strokeAlpha)
          .attr("stroke-width", 0.5);
      }

      // Línea radial = ángulo medio del diente. Tras la rotación queda
      // siempre apuntando hacia arriba (12h), igual que el modal.
      const meanRad = toArcRad(meanAngle);
      toothG.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", Math.sin(meanRad) * roseRadius)
        .attr("y2", -Math.cos(meanRad) * roseRadius)
        .attr("stroke", dimmed ? "#ccc" : "#333")
        .attr("stroke-width", dimmed ? 0.5 : 1.5)
        .attr("opacity", dimmed ? 0.15 : 0.7);

      // FDI label — colocado afuera del grupo rotado para no rotar con la rosa.
      const fontSize = Math.max(9, Math.min(15, roseRadius * 0.42));
      g.append("text")
        .attr("x", cx).attr("y", cy - roseRadius - 3)
        .attr("text-anchor", "middle")
        .attr("font-size", fontSize)
        .attr("fill", dimmed ? "#ccc" : color)
        .attr("font-weight", "bold")
        .text(fdi);

      // Tooltip
      if (!dimmed) {
        toothG.append("title")
          .text(`FDI ${fdi} (n=${hist.n})\nÁngulo medio: ${meanAngle.toFixed(1)}°\nDesv. est.: ${hist.std_angle.toFixed(1)}°\nMax bin: ${localMax}`);
      }

      // Click target (encima del rect de zoom): abre el detalle.
      if (onToothClick) {
        toothG.append("circle")
          .attr("r", roseRadius + 4)
          .attr("fill", "transparent")
          .style("cursor", "pointer")
          .style("pointer-events", "all")
          .on("click", (event) => { event.stopPropagation(); onToothClick(fdi); });
      }
    }

    xAxisG.call(d3.axisBottom(xScale).ticks(6)).call(g => g.select(".domain").remove());
    yAxisG.call(d3.axisLeft(yScale).ticks(6)).call(g => g.select(".domain").remove());
  }

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      xScale = event.transform.rescaleX(xScale0);
      yScale = event.transform.rescaleY(yScale0);
      draw(event.transform.k);
    });

  const zoomRect = gOuter.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "none").attr("pointer-events", "all");
  zoomRect.lower();
  // Aplicamos zoom en gOuter para capturar wheel/drag incluso sobre los dientes.
  gOuter.call(zoom)
    .on("dblclick.zoom", () => {
      gOuter.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });
  // Dejamos el rect debajo de los dientes para permitir clicks sobre ellos.
  zoomRect.lower();

  draw();

  gOuter.append("text")
    .attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}
