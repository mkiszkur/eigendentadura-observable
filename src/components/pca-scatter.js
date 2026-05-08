/**
 * Scatter plot 2D — PC1 vs PC2 o UMAP1 vs UMAP2, coloreado por cluster.
 *
 * Soporta zoom (scroll) y pan (drag). Doble-clic resetea.
 * Hover muestra el ID de la pantomografía.
 * Clic en un punto llama a onDotClick(d) si se provee.
 * Clic en leyenda toggle visibilidad del cluster.
 * Cluster -1 (ruido, HDBSCAN) se dibuja en gris claro.
 */
import * as d3 from "d3";

const CLUSTER_COLORS = [
  "#4e79a7", "#e15759", "#59a14f", "#f28e2b", "#76b7b2",
  "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab",
];
const NOISE_COLOR = "#cccccc";

/**
 * @param {Object} opts
 * @param {Array} opts.dentitions - [{id, pc1, pc2, u1, u2}, ...]
 * @param {Array<number>} opts.labels - cluster label per dentition (same order). -1 = noise.
 * @param {Object} [opts.pcaMeta] - {explained_variance, ...} (only when projection='pca')
 * @param {string} [opts.projection='pca'] - 'pca' | 'umap'
 * @param {string} [opts.title]
 * @param {number} [opts.width=800]
 * @param {number} [opts.height=550]
 * @param {Function} [opts.onDotClick] - called with (d) when a dot is clicked
 * @returns {SVGElement}
 */
export function pcaScatterPlot({
  dentitions, labels = [], pcaMeta,
  projection = "pca",
  title = "", width = 800, height = 550,
  onDotClick = null,
} = {}) {
  const margin = {top: 20, right: 30, bottom: 50, left: 60};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xField = projection === "umap" ? "u1" : "pc1";
  const yField = projection === "umap" ? "u2" : "pc2";
  let xLabel, yLabel;
  if (projection === "umap") {
    xLabel = "UMAP 1";
    yLabel = "UMAP 2";
  } else {
    const pc1Var = pcaMeta.explained_variance[0];
    const pc2Var = pcaMeta.explained_variance[1];
    xLabel = `PC1 (${(pc1Var * 100).toFixed(1)}%)`;
    yLabel = `PC2 (${(pc2Var * 100).toFixed(1)}%)`;
  }

  // Scales
  const xExt = d3.extent(dentitions, d => d[xField]);
  const yExt = d3.extent(dentitions, d => d[yField]);
  const padX = (xExt[1] - xExt[0]) * 0.05;
  const padY = (yExt[1] - yExt[0]) * 0.05;

  const xScale0 = d3.scaleLinear()
    .domain([xExt[0] - padX, xExt[1] + padX])
    .range([0, innerW]);
  const yScale0 = d3.scaleLinear()
    .domain([yExt[0] - padY, yExt[1] + padY])
    .range([innerH, 0]);

  let xScale = xScale0.copy();
  let yScale = yScale0.copy();

  // Merge labels into data
  const data = dentitions.map((d, i) => ({...d, cluster: labels[i] ?? 0}));

  // Cluster IDs (excluding noise for legend ordering)
  const clusterIds = [...new Set(data.map(d => d.cluster))]
    .filter(c => c !== -1)
    .sort((a, b) => a - b);
  const colorForCluster = (c) => c === -1 ? NOISE_COLOR : CLUSTER_COLORS[clusterIds.indexOf(c) % CLUSTER_COLORS.length];

  // Hidden clusters state
  const hiddenClusters = new Set();

  // SVG
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("font", "12px sans-serif");

  // Clip
  const clipUid = `clip-scatter-${Math.random().toString(36).slice(2, 8)}`;
  svg.append("defs").append("clipPath").attr("id", clipUid)
    .append("rect").attr("width", innerW).attr("height", innerH);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Axes
  const xAxisG = g.append("g")
    .attr("transform", `translate(0,${innerH})`);
  const yAxisG = g.append("g");

  function updateAxes() {
    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(8));
  }
  updateAxes();

  // Axis labels
  g.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "13px")
    .text(xLabel);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "13px")
    .text(yLabel);

  // Points group
  const plotArea = g.append("g").attr("clip-path", `url(#${clipUid})`);

  // Origin cross
  const originG = plotArea.append("g").attr("class", "origin");
  function drawOrigin() {
    originG.selectAll("*").remove();
    const ox = xScale(0), oy = yScale(0);
    originG.append("line")
      .attr("x1", ox).attr("x2", ox).attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#ccc").attr("stroke-dasharray", "4,4");
    originG.append("line")
      .attr("x1", 0).attr("x2", innerW).attr("y1", oy).attr("y2", oy)
      .attr("stroke", "#ccc").attr("stroke-dasharray", "4,4");
  }
  drawOrigin();

  // Tooltip
  const tooltip = d3.select(document.body).append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "6px 10px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.15)")
    .style("z-index", 1000);

  // Draw points
  const dots = plotArea.selectAll("circle.dot")
    .data(data)
    .join("circle")
    .attr("class", "dot")
    .attr("r", 3)
    .attr("cx", d => xScale(d[xField]))
    .attr("cy", d => yScale(d[yField]))
    .attr("fill", d => colorForCluster(d.cluster))
    .attr("opacity", d => d.cluster === -1 ? 0.3 : 0.6)
    .attr("stroke", "none")
    .style("cursor", onDotClick ? "pointer" : "default")
    .on("mouseenter", (event, d) => {
      if (hiddenClusters.has(d.cluster)) return;
      d3.select(event.currentTarget).attr("r", 6).attr("opacity", 1).attr("stroke", "#333").attr("stroke-width", 1.5);
      const clusterLabel = d.cluster === -1 ? "Ruido" : `Cluster ${d.cluster}`;
      const xv = d[xField].toFixed(2), yv = d[yField].toFixed(2);
      tooltip.style("opacity", 1)
        .html(`<strong>${d.id.replace(/database_original__|__json_url\.json/g, "")}</strong><br>${clusterLabel}<br>${xLabel.split(" ")[0]}: ${xv}, ${yLabel.split(" ")[0]}: ${yv}${onDotClick ? '<br><em style="color:#888">clic para detalles</em>' : ''}`);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 20) + "px");
    })
    .on("mouseleave", (event, d) => {
      d3.select(event.currentTarget).attr("r", 3).attr("opacity", hiddenClusters.has(d.cluster) ? 0 : (d.cluster === -1 ? 0.3 : 0.6)).attr("stroke", "none");
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      if (hiddenClusters.has(d.cluster)) return;
      if (onDotClick) { onDotClick(d); event.stopPropagation(); }
    });

  function refreshDotVisibility() {
    dots
      .attr("opacity", d => hiddenClusters.has(d.cluster) ? 0 : (d.cluster === -1 ? 0.3 : 0.6))
      .attr("pointer-events", d => hiddenClusters.has(d.cluster) ? "none" : "all");
  }

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .on("zoom", ({transform}) => {
      xScale = transform.rescaleX(xScale0);
      yScale = transform.rescaleY(yScale0);
      dots.attr("cx", d => xScale(d[xField])).attr("cy", d => yScale(d[yField]));
      updateAxes();
      drawOrigin();
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  // Legend — clickable to toggle cluster visibility
  const legendItems = [...clusterIds];
  const hasNoise = data.some(d => d.cluster === -1);
  if (hasNoise) legendItems.push(-1);

  const legendX = innerW - 10;
  const legendY = 10;
  const legend = g.append("g").attr("transform", `translate(${legendX}, ${legendY})`);

  const hintG = g.append("g").attr("transform", `translate(${legendX}, ${legendY - 14})`);
  hintG.append("text").attr("x", 0).attr("y", 0).attr("text-anchor", "end")
    .style("font-size", "10px").style("fill", "#aaa").text("clic = ocultar/mostrar");

  legendItems.forEach((c, i) => {
    const n = data.filter(d => d.cluster === c).length;
    const row = legend.append("g")
      .attr("transform", `translate(0, ${i * 22})`)
      .style("cursor", "pointer")
      .on("click", () => {
        if (hiddenClusters.has(c)) hiddenClusters.delete(c);
        else hiddenClusters.add(c);
        const hidden = hiddenClusters.has(c);
        circle.attr("fill-opacity", hidden ? 0.15 : 1).attr("stroke", hidden ? "#bbb" : "none");
        label.style("fill", hidden ? "#bbb" : null).style("text-decoration", hidden ? "line-through" : null);
        refreshDotVisibility();
      });

    const circle = row.append("circle").attr("r", 6).attr("cx", -8).attr("cy", 0)
      .attr("fill", colorForCluster(c)).attr("stroke", "none");
    const label = row.append("text").attr("x", 2).attr("y", 4)
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .text(c === -1 ? `Ruido (n=${n})` : `C${c} (n=${n})`);
  });

  // Title
  if (title) {
    g.append("text")
      .attr("x", innerW / 2).attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "13px").style("font-weight", "bold")
      .text(title);
  }

  // Cleanup tooltip on removal
  svg.node().__tooltipCleanup = () => tooltip.remove();

  return svg.node();
}
