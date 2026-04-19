/**
 * Rose Plot — mini histogramas circulares de orientación angular por diente,
 * dispuestos en la posición anatómica de cada pieza (como la eigendentadura).
 *
 * Cada mini rose muestra la distribución de desviaciones angulares respecto
 * a la media del diente. El eje angular está amplificado (±30° de dato →
 * ±150° visual) para que la forma de la distribución sea legible.
 * La escala radial es local (per-tooth) para llenar cada rosa.
 * La línea vertical (12h) representa la orientación media del diente.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

/**
 * @param {Object} opts
 * @param {Array} opts.angleHistograms  - tooth_angle_histograms.json
 * @param {Array} opts.toothStats       - tooth_stats.json (for mean_x, mean_y)
 * @param {Array<number>} opts.selectedFdi - FDI numbers to highlight
 * @param {number} opts.width
 * @param {number} opts.height
 */
export function rosePlot({angleHistograms, toothStats, selectedFdi = [], width = 900, height = 600} = {}) {
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

  // Angular amplification: map ±maxDevDeg data degrees → ±maxVisualRad visual radians
  const maxDevDeg = 30;  // data range shown: ±30° from mean
  const maxVisualRad = (150 / 180) * Math.PI; // visual range: ±150° (fills most of circle)
  const ampFactor = maxVisualRad / (maxDevDeg * Math.PI / 180);

  // Position scales
  const xs = toothStats.map(s => s.mean_x);
  const ys = toothStats.map(s => s.mean_y);
  const pad = 0.35;
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
    .text("↑ = media · Pétalos = distribución");
  legend.append("text").attr("x", 0).attr("y", 38)
    .attr("font-size", 9).attr("fill", "#999")
    .text(`Escala angular: ±${maxDevDeg}° → ±${Math.round(maxVisualRad * 180 / Math.PI)}° visual`);

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

    // Rose radius in pixels
    const roseRadius = Math.max(20, Math.min(16 * k, 65));

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
      const toothG = g.append("g").attr("transform", `translate(${cx},${cy})`);

      // Background circle
      toothG.append("circle")
        .attr("r", roseRadius)
        .attr("fill", "none")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 0.5)
        .attr("opacity", dimmed ? 0.15 : 0.4);

      // Draw petals (deviation from mean, amplified)
      const binW = hist.bin_width;
      const halfBin = binW / 2;
      for (const bin of hist.histogram) {
        // Deviation from mean in degrees
        const devStart = (bin.angle - halfBin) - meanAngle;
        const devEnd = (bin.angle + halfBin) - meanAngle;

        // Skip bins far outside visible range
        if (Math.min(devStart, devEnd) > maxDevDeg || Math.max(devStart, devEnd) < -maxDevDeg) continue;

        // Clamp to visible range
        const clampedStart = Math.max(devStart, -maxDevDeg);
        const clampedEnd = Math.min(devEnd, maxDevDeg);

        // Amplified visual angles: 0° deviation = 12-o'clock (negative y)
        // Positive deviation → clockwise
        const startRad = -(clampedStart * Math.PI / 180) * ampFactor;
        const endRad = -(clampedEnd * Math.PI / 180) * ampFactor;

        const r = rScale(bin.count);

        toothG.append("path")
          .attr("d", d3.arc()
            .innerRadius(0)
            .outerRadius(r)
            .startAngle(Math.min(startRad, endRad))
            .endAngle(Math.max(startRad, endRad))())
          .attr("fill", color)
          .attr("fill-opacity", alpha)
          .attr("stroke", color)
          .attr("stroke-opacity", strokeAlpha)
          .attr("stroke-width", 0.5);
      }

      // Mean angle line (always points up = 12 o'clock = 0 deviation)
      toothG.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", 0).attr("y2", -roseRadius)
        .attr("stroke", dimmed ? "#ccc" : "#333")
        .attr("stroke-width", dimmed ? 0.5 : 1.5)
        .attr("opacity", dimmed ? 0.15 : 0.6);

      // FDI label
      const fontSize = Math.max(7, 7 * Math.min(k, 4));
      toothG.append("text")
        .attr("y", -roseRadius - 3)
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

  gOuter.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "none").attr("pointer-events", "all")
    .call(zoom)
    .on("dblclick.zoom", () => {
      gOuter.select("rect").transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

  draw();

  gOuter.append("text")
    .attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}
