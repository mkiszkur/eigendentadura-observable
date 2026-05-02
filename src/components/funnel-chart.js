import * as d3 from "d3";

const STEP_COLOR = "#2171b5";
const EXCL_COLOR = "#e15759";

export function funnelChart(funnel, {width = 680} = {}) {
  const BOX_H = 52;
  const GAP = 44;       // vertical gap between boxes (space for connector + excl box)
  const EXCL_H = 34;
  const EXCL_W = 190;
  const M = {top: 12, right: EXCL_W + 28, bottom: 12, left: 12};

  const boxAreaW = width - M.left - M.right;
  const n0 = funnel[0].n;
  const cx = M.left + boxAreaW / 2;   // fixed center axis
  const height = funnel.length * BOX_H + (funnel.length - 1) * GAP + M.top + M.bottom;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  funnel.forEach((step, i) => {
    const boxW = Math.max(boxAreaW * (step.n / n0), 120);
    const bx = cx - boxW / 2;
    const by = M.top + i * (BOX_H + GAP);

    // Vertical connector + exclusion box in the gap ABOVE this box
    if (i > 0) {
      const gapTop = M.top + (i - 1) * (BOX_H + GAP) + BOX_H;
      const gapMid = gapTop + GAP / 2;

      // Connector line
      svg.append("line")
        .attr("x1", cx).attr("y1", gapTop)
        .attr("x2", cx).attr("y2", by)
        .attr("stroke", "#aaa").attr("stroke-width", 1.5);
      // Arrowhead
      svg.append("polygon")
        .attr("points", `${cx - 6},${by - 9} ${cx + 6},${by - 9} ${cx},${by - 1}`)
        .attr("fill", "#aaa");

      // Exclusion box centered on gap midpoint
      if (step.excluded > 0 && step.excluded_label) {
        const ex = cx + boxAreaW / 2 + 16;
        const ey = gapMid - EXCL_H / 2;

        svg.append("line")
          .attr("x1", cx).attr("y1", gapMid)
          .attr("x2", ex).attr("y2", gapMid)
          .attr("stroke", EXCL_COLOR).attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "5,3");

        svg.append("rect")
          .attr("x", ex).attr("y", ey)
          .attr("width", EXCL_W).attr("height", EXCL_H)
          .attr("fill", "#fff8f8")
          .attr("stroke", EXCL_COLOR).attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "5,3").attr("rx", 4);

        svg.append("text")
          .attr("x", ex + 9).attr("y", ey + 14)
          .attr("font-size", 11).attr("fill", EXCL_COLOR).attr("font-weight", "bold")
          .text(`−${step.excluded.toLocaleString("es-AR")}`);

        svg.append("text")
          .attr("x", ex + 9).attr("y", ey + 27)
          .attr("font-size", 9.5).attr("fill", "#c44").attr("font-style", "italic")
          .text(step.excluded_label);
      }
    }

    // Box
    svg.append("rect")
      .attr("x", bx).attr("y", by)
      .attr("width", boxW).attr("height", BOX_H)
      .attr("fill", "white")
      .attr("stroke", STEP_COLOR).attr("stroke-width", 2)
      .attr("rx", 5);

    // Label
    svg.append("text")
      .attr("x", cx).attr("y", by + 20)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#333")
      .text(step.label);

    // Count
    svg.append("text")
      .attr("x", cx).attr("y", by + 39)
      .attr("text-anchor", "middle")
      .attr("font-size", 15).attr("font-weight", "bold").attr("fill", STEP_COLOR)
      .text(`n = ${step.n.toLocaleString("es-AR")}`);
  });

  return svg.node();
}

export function flagPrevalenceChart(pantos, flagLabels, pathologyLabels, treatmentLabels, {
  width = 680,
} = {}) {
  const total = pantos.length;
  const pathSet = new Set(pathologyLabels);
  const treatSet = new Set(treatmentLabels);

  const data = flagLabels
    .map(label => ({
      label,
      pct: (pantos.filter(p => p[label]).length / total) * 100,
      type: pathSet.has(label) ? "pathology" : treatSet.has(label) ? "treatment" : "other",
    }))
    .sort((a, b) => d3.descending(a.pct, b.pct));

  const COLOR = {pathology: "#e15759", treatment: "#4e79a7", other: "#bab0ac"};
  const LABEL_W = 160;
  const BAR_H = 18;
  const GAP = 4;
  const M = {top: 20, right: 60, bottom: 20, left: LABEL_W + 8};
  const innerW = width - M.left - M.right;
  const height = data.length * (BAR_H + GAP) + M.top + M.bottom;

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  // Axis
  g.append("g").attr("transform", `translate(0,${-8})`)
    .call(d3.axisTop(xScale).ticks(5).tickFormat(d => `${d}%`))
    .call(ax => ax.select(".domain").remove())
    .call(ax => ax.selectAll(".tick line").attr("stroke", "#ddd").attr("y2", height - M.top - M.bottom + 8));

  data.forEach((d, i) => {
    const y = i * (BAR_H + GAP);
    const bw = xScale(d.pct);

    // Bar
    g.append("rect")
      .attr("y", y).attr("width", bw).attr("height", BAR_H)
      .attr("fill", COLOR[d.type]).attr("rx", 2).attr("opacity", 0.8);

    // % label
    g.append("text")
      .attr("x", bw + 4).attr("y", y + BAR_H / 2 + 4)
      .attr("fill", "#555").attr("font-size", 10)
      .text(`${d.pct.toFixed(1)}%`);

    // Label on the left
    svg.append("text")
      .attr("x", M.left - 6).attr("y", M.top + y + BAR_H / 2 + 4)
      .attr("text-anchor", "end").attr("fill", "#333").attr("font-size", 11)
      .text(d.label);
  });

  // Legend
  const legendData = [
    {label: "Patología", color: COLOR.pathology},
    {label: "Tratamiento/restauración", color: COLOR.treatment},
  ];
  legendData.forEach((ld, li) => {
    const lx = M.left + li * 180;
    svg.append("rect").attr("x", lx).attr("y", 4).attr("width", 12).attr("height", 12)
      .attr("fill", ld.color).attr("opacity", 0.8);
    svg.append("text").attr("x", lx + 16).attr("y", 14)
      .attr("font-size", 10).attr("fill", "#555").text(ld.label);
  });

  return svg.node();
}

export function teethDistChart(teethDist, {width = 680} = {}) {
  const M = {top: 20, right: 20, bottom: 40, left: 55};
  const innerW = width - M.left - M.right;
  const innerH = 160;
  const height = innerH + M.top + M.bottom;

  const xScale = d3.scaleBand()
    .domain(teethDist.map(d => d.n_teeth))
    .range([0, innerW]).padding(0.1);
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(teethDist, d => d.count)])
    .range([innerH, 0]).nice();

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickValues(teethDist.filter(d => d.n_teeth % 4 === 0).map(d => d.n_teeth)))
    .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"));

  g.append("g").call(d3.axisLeft(yScale).ticks(5))
    .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"));

  g.append("text").attr("x", innerW / 2).attr("y", innerH + 34)
    .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#666")
    .text("Nº de dientes permanentes anotados");
  g.append("text").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -42)
    .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#666")
    .text("Pantomografías");

  // Highlight 32-tooth bar
  g.selectAll("rect")
    .data(teethDist)
    .join("rect")
    .attr("x", d => xScale(d.n_teeth))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => innerH - yScale(d.count))
    .attr("fill", d => d.n_teeth === 32 ? "#2171b5" : "#6baed6")
    .attr("opacity", d => d.n_teeth === 32 ? 0.9 : 0.65);

  // Annotation for 32 teeth
  const peak = teethDist.find(d => d.n_teeth === 32);
  if (peak) {
    g.append("text")
      .attr("x", xScale(32) + xScale.bandwidth() / 2)
      .attr("y", yScale(peak.count) - 5)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#2171b5")
      .text(peak.count.toLocaleString("es-AR"));
  }

  return svg.node();
}
