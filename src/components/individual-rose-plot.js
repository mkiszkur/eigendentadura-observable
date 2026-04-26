/**
 * Individual Rose Plot — mini-rosa por diente con la distribución angular
 * poblacional como pétalos y el ángulo del individuo como flecha radial.
 *
 * Convención (igual a rose-plot.js y angle-rose.js):
 *   - 90° dental = 12h, sin amplificación.
 *   - Cada mini-rosa se rota por la media poblacional para que la media
 *     siempre apunte a 12h. La flecha del individuo aparece desplazada del
 *     centro la cantidad correspondiente a su desviación angular real.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};
const toArcRad = (deg) => ((90 - deg) * Math.PI) / 180;

/**
 * @param {Object} opts
 * @param {Array}  opts.angleHistograms - tooth_angle_histograms.json
 * @param {Array}  opts.toothStats      - tooth_stats_lm.json (mean_x, mean_y por FDI)
 * @param {Object} opts.indiv           - individual con `teeth: [{fdi, cx, cy, angle, z_angle, z_total}]`
 * @param {number} [opts.width=900]
 * @param {number} [opts.height=560]
 */
export function individualRosePlot({
  angleHistograms,
  toothStats,
  indiv,
  onToothClick = null,
  width = 900,
  height = 560,
} = {}) {
  const margin = {top: 25, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const histByFdi = new Map(angleHistograms.map(h => [h.fdi, h]));
  const indivByFdi = new Map((indiv?.teeth || []).map(t => [t.fdi, t]));

  // Posición anatómica desde tooth_stats poblacional.
  const xs = toothStats.map(s => s.mean_x ?? s.cx_mean);
  const ys = toothStats.map(s => s.mean_y ?? s.cy_mean);
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
    .attr("id", "indiv-rose-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");
  const gClip = gOuter.append("g").attr("clip-path", "url(#indiv-rose-clip)");
  const g = gClip.append("g");

  gOuter.append("text").attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text").attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Leyenda
  const leg = gOuter.append("g").attr("transform", `translate(8, 4)`);
  leg.append("rect").attr("width", 230).attr("height", 56)
    .attr("fill", "#fff").attr("stroke", "#ddd").attr("rx", 3).attr("opacity", 0.95);
  leg.append("text").attr("x", 8).attr("y", 14)
    .attr("font-size", 11).attr("font-weight", "bold").attr("fill", "#333")
    .text("Distribución angular por diente");
  leg.append("rect").attr("x", 10).attr("y", 22).attr("width", 12).attr("height", 6)
    .attr("fill", "#888").attr("fill-opacity", 0.55);
  leg.append("text").attr("x", 28).attr("y", 28)
    .attr("font-size", 10).attr("fill", "#333")
    .text("Pétalos = histograma poblacional");
  leg.append("line").attr("x1", 14).attr("y1", 42).attr("x2", 14).attr("y2", 50)
    .attr("stroke", "#e15759").attr("stroke-width", 2);
  leg.append("circle").attr("cx", 14).attr("cy", 42).attr("r", 2.5).attr("fill", "#e15759");
  leg.append("text").attr("x", 28).attr("y", 47)
    .attr("font-size", 10).attr("fill", "#333")
    .text("Flecha = ángulo del individuo");

  function draw(k = 1) {
    g.selectAll("*").remove();

    g.append("g").selectAll("line").data(yScale.ticks(6)).join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#f0f0f0");
    g.append("g").selectAll("line").data(xScale.ticks(6)).join("line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("stroke", "#f0f0f0");

    const roseRadius = Math.max(20, Math.min(18 * k, 70));

    for (const stats of toothStats) {
      const fdi = stats.fdi;
      const hist = histByFdi.get(fdi);
      if (!hist) continue;

      const cx = xScale(stats.mean_x ?? stats.cx_mean);
      const cy = yScale(stats.mean_y ?? stats.cy_mean);
      const popMean = hist.mean_angle;
      const color = QUADRANT_COLORS[hist.quadrant] || "#888";

      // Rotamos toda la mini-rosa para que la media poblacional quede a 12h.
      const meanRotation = popMean - 90;
      const toothG = g.append("g")
        .attr("transform", `translate(${cx},${cy}) rotate(${meanRotation})`);

      // Fondo
      toothG.append("circle")
        .attr("r", roseRadius)
        .attr("fill", "none")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.4);

      // Pétalos (histograma poblacional)
      const localMax = d3.max(hist.histogram, d => d.count) || 1;
      const rScale = d3.scaleLinear().domain([0, localMax]).range([0, roseRadius]);
      const binW = hist.bin_width
        || (hist.histogram.length >= 2 ? hist.histogram[1].angle - hist.histogram[0].angle : 5);
      const halfBin = binW / 2;
      for (const bin of hist.histogram) {
        if (!bin.count) continue;
        const a0 = toArcRad(bin.angle - halfBin);
        const a1 = toArcRad(bin.angle + halfBin);
        toothG.append("path")
          .attr("d", d3.arc()
            .innerRadius(0).outerRadius(rScale(bin.count))
            .startAngle(Math.min(a0, a1)).endAngle(Math.max(a0, a1))())
          .attr("fill", color).attr("fill-opacity", 0.45)
          .attr("stroke", color).attr("stroke-opacity", 0.4).attr("stroke-width", 0.4);
      }

      // Línea radial: media poblacional (apunta a 12h tras la rotación).
      const meanRad = toArcRad(popMean);
      toothG.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", Math.sin(meanRad) * roseRadius)
        .attr("y2", -Math.cos(meanRad) * roseRadius)
        .attr("stroke", "#333").attr("stroke-width", 1.2).attr("opacity", 0.55);

      // Flecha del individuo (si tiene ese diente).
      const tIndiv = indivByFdi.get(fdi);
      if (tIndiv && Number.isFinite(tIndiv.angle)) {
        const indivRad = toArcRad(tIndiv.angle);
        const r = roseRadius - 2;
        const x2 = Math.sin(indivRad) * r;
        const y2 = -Math.cos(indivRad) * r;
        toothG.append("line")
          .attr("x1", 0).attr("y1", 0)
          .attr("x2", x2).attr("y2", y2)
          .attr("stroke", "#e15759").attr("stroke-width", 2.2)
          .attr("opacity", 0.95);
        toothG.append("circle")
          .attr("cx", x2).attr("cy", y2)
          .attr("r", 2.5).attr("fill", "#e15759");

        toothG.append("title")
          .text(`FDI ${fdi}\nPoblación μ=${popMean.toFixed(1)}° σ=${hist.std_angle.toFixed(1)}° (n=${hist.n})\nIndividuo: ${tIndiv.angle.toFixed(1)}° · z=${(tIndiv.z_angle ?? 0).toFixed(2)}`);
      } else {
        toothG.append("title")
          .text(`FDI ${fdi}\nPoblación μ=${popMean.toFixed(1)}° σ=${hist.std_angle.toFixed(1)}° (n=${hist.n})\nIndividuo: sin dato`);
      }

      // Label fuera del grupo rotado para mantener orientación.
      const fontSize = Math.max(8, 8 * Math.min(k, 4));
      g.append("text")
        .attr("x", cx).attr("y", cy - roseRadius - 3)
        .attr("text-anchor", "middle").attr("font-size", fontSize)
        .attr("font-weight", "bold").attr("fill", color)
        .text(fdi);

      // Click target: abre el detalle.
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
  const zoom = d3.zoom().scaleExtent([1, 12]).on("zoom", (event) => {
    xScale = event.transform.rescaleX(xScale0);
    yScale = event.transform.rescaleY(yScale0);
    draw(event.transform.k);
  });
  const zoomRect = gOuter.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "none").attr("pointer-events", "all");
  gOuter.call(zoom)
    .on("dblclick.zoom", () => {
      gOuter.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });
  zoomRect.lower();

  draw();

  gOuter.append("text").attr("x", innerW).attr("y", -5)
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#aaa")
    .text("Scroll para zoom · Drag para mover · Doble-clic para resetear");

  return svg.node();
}
