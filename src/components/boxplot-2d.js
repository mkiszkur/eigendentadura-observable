/**
 * 2D Boxplots — dispersión posicional de cada diente (IQR).
 *
 * Cada diente se representa como un rectángulo IQR (Q1–Q3) en X e Y,
 * con whiskers a 1.5×IQR y un punto en la mediana.
 * El layout refleja la posición anatómica natural (dentadura).
 * Soporta zoom (scroll) y pan (drag). Doble-clic resetea.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

/**
 * @param {Object} opts
 * @param {Array} opts.boxplotStats  - tooth_boxplot_stats.json array
 * @param {Array<number>} opts.selectedFdi - FDI numbers to highlight
 * @param {number} opts.width
 * @param {number} opts.height
 * @returns {SVGElement}
 */
export function boxplot2dPlot({boxplotStats, selectedFdi = [], showAngleArcs = false, showOutliers = false, outlierPoints = [], width = 800, height = 550} = {}) {
  const margin = {top: 20, right: 30, bottom: 45, left: 55};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const selectedSet = new Set(selectedFdi);
  const hasSelection = selectedSet.size > 0;

  const allStats = boxplotStats;
  const xMin = d3.min(allStats, d => d.wlo_x);
  const xMax = d3.max(allStats, d => d.whi_x);
  const yMin = d3.min(allStats, d => d.wlo_y);
  const yMax = d3.max(allStats, d => d.whi_y);

  const padX = (xMax - xMin) * 0.05;
  const padY = (yMax - yMin) * 0.05;

  const xScale0 = d3.scaleLinear()
    .domain([xMin - padX, xMax + padX])
    .range([0, innerW]);

  const yScale0 = d3.scaleLinear()
    .domain([yMin - padY, yMax + padY])
    .range([0, innerH]);

  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  // Clip path
  svg.append("defs").append("clipPath")
    .attr("id", "bp2d-clip")
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerH);

  const gOuter = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const gClip = gOuter.append("g")
    .attr("clip-path", "url(#bp2d-clip)");

  const gContent = gClip.append("g");

  // Axes groups
  const xAxisG = gOuter.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = gOuter.append("g");

  // Axis labels
  gOuter.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("X (landmark-normalized)");
  gOuter.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("fill", "#666").attr("text-anchor", "middle").attr("font-size", 11)
    .text("Y (landmark-normalized)");

  // Legend (outside clip, fixed position)
  const legend = gOuter.append("g").attr("transform", `translate(${innerW - 100}, 10)`);
  for (const [i, [q, c]] of Object.entries(QUADRANT_COLORS).entries()) {
    legend.append("rect")
      .attr("x", 0).attr("y", i * 18)
      .attr("width", 12).attr("height", 12)
      .attr("fill", c).attr("fill-opacity", 0.4)
      .attr("stroke", c);
    legend.append("text")
      .attr("x", 18).attr("y", i * 18 + 10)
      .attr("font-size", 11).attr("fill", "#333")
      .text(`Q${q}`);
  }

  // Build outlier lookup map: fdi → points[]
  const outlierMap = new Map(outlierPoints.map(d => [d.fdi, d.points]));

  // Outlier legend entry
  if (showOutliers) {
    const y0 = Object.keys(QUADRANT_COLORS).length * 18 + 6;
    legend.append("circle")
      .attr("cx", 6).attr("cy", y0 + 5)
      .attr("r", 2.5).attr("fill", "#e15759").attr("opacity", 0.5);
    legend.append("text")
      .attr("x", 18).attr("y", y0 + 9)
      .attr("font-size", 10).attr("fill", "#555")
      .text("Outliers");
  }

  // Angle arc legend entry (only when enabled)
  if (showAngleArcs) {
    const y0 = Object.keys(QUADRANT_COLORS).length * 18 + 6;
    legend.append("path")
      .attr("d", d3.arc().innerRadius(0).outerRadius(6)
        .startAngle(-0.5).endAngle(0.5)())
      .attr("transform", `translate(6,${y0 + 6})`)
      .attr("fill", "#888").attr("opacity", 0.4)
      .attr("stroke", "#888").attr("stroke-width", 0.5);
    legend.append("text")
      .attr("x", 18).attr("y", y0 + 10)
      .attr("font-size", 10).attr("fill", "#555")
      .text("IQR angular");
  }

  function draw(k = 1) {
    gContent.selectAll("*").remove();

    // Grid
    gContent.append("g").selectAll("line").data(yScale.ticks(8)).join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#f0f0f0");
    gContent.append("g").selectAll("line").data(xScale.ticks(8)).join("line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("stroke", "#f0f0f0");

    // Midline
    gContent.append("line")
      .attr("x1", xScale(0)).attr("x2", xScale(0))
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "cyan").attr("stroke-dasharray", "4,3").attr("opacity", 0.5);

    // Draw each tooth
    for (const t of allStats) {
      const selected = selectedSet.has(t.fdi);
      const dimmed = hasSelection && !selected;
      const color = QUADRANT_COLORS[t.quadrant] || "#999";
      const alpha = dimmed ? 0.08 : 0.25;
      const strokeAlpha = dimmed ? 0.15 : 0.7;
      const labelAlpha = dimmed ? 0.15 : 1;

      const x1 = xScale(t.q1_x);
      const x3 = xScale(t.q3_x);
      const y1 = yScale(t.q1_y);
      const y3 = yScale(t.q3_y);
      const mx = xScale(t.med_x);
      const my = yScale(t.med_y);

      const toothG = gContent.append("g");

      // IQR rectangle
      toothG.append("rect")
        .attr("x", Math.min(x1, x3))
        .attr("y", Math.min(y1, y3))
        .attr("width", Math.abs(x3 - x1))
        .attr("height", Math.abs(y3 - y1))
        .attr("fill", color)
        .attr("fill-opacity", alpha)
        .attr("stroke", color)
        .attr("stroke-opacity", strokeAlpha)
        .attr("stroke-width", dimmed ? 0.5 : 1.5);

      // Whiskers — horizontal
      toothG.append("line")
        .attr("x1", xScale(t.wlo_x)).attr("x2", x1)
        .attr("y1", my).attr("y2", my)
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);
      toothG.append("line")
        .attr("x1", x3).attr("x2", xScale(t.whi_x))
        .attr("y1", my).attr("y2", my)
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);

      // Whiskers — vertical
      toothG.append("line")
        .attr("x1", mx).attr("x2", mx)
        .attr("y1", yScale(t.wlo_y)).attr("y2", y1)
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);
      toothG.append("line")
        .attr("x1", mx).attr("x2", mx)
        .attr("y1", y3).attr("y2", yScale(t.whi_y))
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);

      // Whisker caps — horizontal
      const capY = Math.abs(y3 - y1) * 0.15;
      toothG.append("line")
        .attr("x1", xScale(t.wlo_x)).attr("x2", xScale(t.wlo_x))
        .attr("y1", my - capY).attr("y2", my + capY)
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);
      toothG.append("line")
        .attr("x1", xScale(t.whi_x)).attr("x2", xScale(t.whi_x))
        .attr("y1", my - capY).attr("y2", my + capY)
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);

      // Whisker caps — vertical
      const capX = Math.abs(x3 - x1) * 0.15;
      toothG.append("line")
        .attr("x1", mx - capX).attr("x2", mx + capX)
        .attr("y1", yScale(t.wlo_y)).attr("y2", yScale(t.wlo_y))
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);
      toothG.append("line")
        .attr("x1", mx - capX).attr("x2", mx + capX)
        .attr("y1", yScale(t.whi_y)).attr("y2", yScale(t.whi_y))
        .attr("stroke", color).attr("stroke-opacity", strokeAlpha).attr("stroke-width", 1);

      // Median dot — radius scales with zoom
      const dotR = (dimmed ? 2 : 3.5) * Math.min(k, 6);
      toothG.append("circle")
        .attr("cx", mx).attr("cy", my)
        .attr("r", dotR)
        .attr("fill", color)
        .attr("fill-opacity", dimmed ? 0.2 : 1)
        .attr("stroke", "white")
        .attr("stroke-width", dimmed ? 0 : 1);

      // FDI label — font scales with zoom
      const fontSize = (dimmed ? 5 : 8) * Math.min(k, 6);
      toothG.append("text")
        .attr("x", mx).attr("y", my - dotR - 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "auto")
        .attr("font-size", fontSize)
        .attr("fill", color)
        .attr("font-weight", "bold")
        .attr("opacity", labelAlpha)
        .text(t.fdi);

      // Tooltip
      if (!dimmed) {
        toothG.append("title")
          .text(`FDI ${t.fdi} (n=${t.n})\nMediana: (${t.med_x.toFixed(4)}, ${t.med_y.toFixed(4)})\nIQR X: [${t.q1_x.toFixed(4)}, ${t.q3_x.toFixed(4)}]\nIQR Y: [${t.q1_y.toFixed(4)}, ${t.q3_y.toFixed(4)}]\nÁngulo: med=${t.med_angle?.toFixed(1)}° IQR=[${t.q1_angle?.toFixed(1)}°, ${t.q3_angle?.toFixed(1)}°]`);
      }

      // Angle dispersion arc (IQR wedge + whisker arc + median line)
      if (showAngleArcs && t.med_angle != null) {
        const arcRadius = Math.max(35, 22 * Math.min(k, 6));
        // Convert data angle (90°=vertical) to d3.arc convention (0=12-o'clock, CW+)
        const toD3 = (deg) => -(deg - 90) * Math.PI / 180;

        // IQR wedge (filled)
        const iq1 = toD3(t.q1_angle);
        const iq3 = toD3(t.q3_angle);
        toothG.append("path")
          .attr("d", d3.arc()
            .innerRadius(0)
            .outerRadius(arcRadius)
            .startAngle(Math.min(iq1, iq3))
            .endAngle(Math.max(iq1, iq3))())
          .attr("transform", `translate(${mx},${my})`)
          .attr("fill", color)
          .attr("opacity", dimmed ? 0.05 : 0.35)
          .attr("stroke", color)
          .attr("stroke-width", 1)
          .attr("stroke-opacity", dimmed ? 0.1 : 0.6);

        // Whisker arc (outline only)
        const iw1 = toD3(t.wlo_angle);
        const iw2 = toD3(t.whi_angle);
        toothG.append("path")
          .attr("d", d3.arc()
            .innerRadius(arcRadius - 2)
            .outerRadius(arcRadius)
            .startAngle(Math.min(iw1, iw2))
            .endAngle(Math.max(iw1, iw2))())
          .attr("transform", `translate(${mx},${my})`)
          .attr("fill", color)
          .attr("fill-opacity", dimmed ? 0.02 : 0.15)
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("opacity", dimmed ? 0.05 : 0.5);

        // Median line (radial)
        const medD3 = toD3(t.med_angle);
        const mlx = mx + arcRadius * Math.sin(medD3);
        const mly = my - arcRadius * Math.cos(medD3);
        toothG.append("line")
          .attr("x1", mx).attr("y1", my)
          .attr("x2", mlx).attr("y2", mly)
          .attr("stroke", color)
          .attr("stroke-width", dimmed ? 0.5 : 2)
          .attr("opacity", dimmed ? 0.1 : 0.7);
      }
    }

    // Outlier points layer
    if (showOutliers) {
      for (const t of allStats) {
        const selected = selectedSet.has(t.fdi);
        const dimmed = hasSelection && !selected;
        const color = QUADRANT_COLORS[t.quadrant] || "#999";
        const pts = outlierMap.get(t.fdi) ?? [];
        gContent.selectAll(null).data(pts).join("circle")
          .attr("cx", d => xScale(d.cx))
          .attr("cy", d => yScale(d.cy))
          .attr("r", 1.8)
          .attr("fill", color)
          .attr("opacity", dimmed ? 0.05 : 0.35)
          .attr("stroke", "none");
      }
    }

    // Update axes
    xAxisG.call(d3.axisBottom(xScale).ticks(8)).call(g => g.select(".domain").remove());
    yAxisG.call(d3.axisLeft(yScale).ticks(8)).call(g => g.select(".domain").remove());
  }

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([1, 40])
    .on("zoom", (event) => {
      xScale = event.transform.rescaleX(xScale0);
      yScale = event.transform.rescaleY(yScale0);
      draw(event.transform.k);
    });

  gOuter.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "none")
    .attr("pointer-events", "all")
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
