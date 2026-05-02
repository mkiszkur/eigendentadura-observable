---
title: Demo — Estilos de embudo
---

# Demo — Comparación de estilos

```js
import * as d3 from "d3";
const ds = await FileAttachment("data/dataset_stats.json").json();
const funnel = ds.funnel;
```

---

## Opción A — CONSORT style

Rectángulos con borde, exclusiones como cajas laterales con flecha. Estilo de papers clínicos.

```js
{
  const W = Math.min(width, 700);
  const BOX_H = 52, BOX_W = 320, GAP = 40, EXCL_W = 180, EXCL_H = 36;
  const M = {top: 16, left: (W - BOX_W) / 2};
  const COLOR = ["#2171b5","#2171b5","#2171b5","#08306b"];
  const height = funnel.length * BOX_H + (funnel.length - 1) * GAP + 32;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, W, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui)");

  funnel.forEach((step, i) => {
    const bx = M.left, by = M.top + i * (BOX_H + GAP);
    const color = COLOR[Math.min(i, COLOR.length - 1)];
    const cx = M.left + BOX_W / 2;

    // Connector line from previous box
    if (i > 0) {
      const prevBy = M.top + (i - 1) * (BOX_H + GAP);
      svg.append("line")
        .attr("x1", cx).attr("y1", prevBy + BOX_H)
        .attr("x2", cx).attr("y2", by)
        .attr("stroke", "#999").attr("stroke-width", 1.5);
      svg.append("polygon")
        .attr("points", `${cx - 5},${by - 8} ${cx + 5},${by - 8} ${cx},${by}`)
        .attr("fill", "#999");
    }

    // Main box
    svg.append("rect")
      .attr("x", bx).attr("y", by)
      .attr("width", BOX_W).attr("height", BOX_H)
      .attr("fill", "white").attr("stroke", color).attr("stroke-width", 2).attr("rx", 4);

    svg.append("text")
      .attr("x", cx).attr("y", by + 20)
      .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#222")
      .text(step.label);
    svg.append("text")
      .attr("x", cx).attr("y", by + 38)
      .attr("text-anchor", "middle").attr("font-size", 16).attr("font-weight", "bold").attr("fill", color)
      .text(`n = ${step.n.toLocaleString("es-AR")}`);

    // Exclusion box on the right
    if (step.excluded > 0) {
      const midY = by + BOX_H / 2;
      const ex = bx + BOX_W + 24, ey = midY - EXCL_H / 2;
      // horizontal line
      svg.append("line")
        .attr("x1", bx + BOX_W).attr("y1", midY)
        .attr("x2", ex).attr("y2", midY)
        .attr("stroke", "#e15759").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
      // excl box
      svg.append("rect")
        .attr("x", ex).attr("y", ey)
        .attr("width", EXCL_W).attr("height", EXCL_H)
        .attr("fill", "white").attr("stroke", "#e15759").attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3").attr("rx", 3);
      svg.append("text")
        .attr("x", ex + 8).attr("y", ey + 14)
        .attr("font-size", 10).attr("fill", "#e15759")
        .text(`−${step.excluded.toLocaleString("es-AR")}`);
      svg.append("text")
        .attr("x", ex + 8).attr("y", ey + 27)
        .attr("font-size", 9).attr("fill", "#c00").attr("font-style", "italic")
        .text(step.excluded_label ?? "");
    }
  });

  display(svg.node());
}
```

---

## Opción B — Barras horizontales

Barras proporcionales, sin trapezoides, etiquetas arriba, exclusiones al costado.

```js
{
  const W = Math.min(width, 680);
  const BAR_H = 32, ROW_H = 60, LABEL_W = 0, BAR_AREA = W * 0.58, ANNOT_X = W * 0.6;
  const M = {top: 8, left: 8};
  const n0 = funnel[0].n;
  const height = funnel.length * ROW_H + M.top * 2;
  const COLORS = ["#9ecae1","#6baed6","#2171b5","#08306b"];

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, W, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui)");

  funnel.forEach((step, i) => {
    const y = M.top + i * ROW_H;
    const bw = BAR_AREA * (step.n / n0);
    const color = COLORS[Math.min(i, COLORS.length - 1)];

    // Label above bar
    svg.append("text")
      .attr("x", M.left).attr("y", y + 11)
      .attr("font-size", 11).attr("fill", "#444")
      .text(step.label);

    // Bar
    svg.append("rect")
      .attr("x", M.left).attr("y", y + 16)
      .attr("width", bw).attr("height", BAR_H)
      .attr("fill", color).attr("rx", 3);

    // Count inside bar
    svg.append("text")
      .attr("x", M.left + bw / 2).attr("y", y + 16 + BAR_H / 2 + 5)
      .attr("text-anchor", "middle").attr("fill", "white")
      .attr("font-size", 13).attr("font-weight", "bold")
      .text(step.n.toLocaleString("es-AR"));

    // Excluded annotation to the right
    if (step.excluded > 0) {
      svg.append("text")
        .attr("x", ANNOT_X).attr("y", y + 16 + BAR_H / 2 - 2)
        .attr("font-size", 11).attr("fill", "#e15759").attr("font-weight", "bold")
        .text(`−${step.excluded.toLocaleString("es-AR")}`);
      svg.append("text")
        .attr("x", ANNOT_X).attr("y", y + 16 + BAR_H / 2 + 12)
        .attr("font-size", 9.5).attr("fill", "#999").attr("font-style", "italic")
        .text(step.excluded_label ?? "");
    }
  });

  display(svg.node());
}
```

---

## Opción C — Tabla visual

Layout tabular: label | barra | N | excluidos. Muy compacto y legible.

```js
{
  const W = Math.min(width, 720);
  const ROW_H = 44, HDR_H = 22;
  const COL = {label: 0, bar: 200, n: 460, excl: 510};
  const BAR_MAX = 240, BAR_H = 20;
  const n0 = funnel[0].n;
  const height = HDR_H + funnel.length * ROW_H + 8;
  const COLORS = ["#9ecae1","#6baed6","#2171b5","#08306b"];

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, W, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui)");

  // Header
  ["Paso", "Incluidos", "n", "Excluidos"].forEach((h, hi) => {
    const xs = [COL.label, COL.bar, COL.n, COL.excl];
    svg.append("text")
      .attr("x", xs[hi]).attr("y", 15)
      .attr("font-size", 10).attr("fill", "#888").attr("font-weight", "bold")
      .attr("text-transform", "uppercase")
      .text(h);
  });

  // Divider
  svg.append("line")
    .attr("x1", 0).attr("y1", HDR_H).attr("x2", W).attr("y2", HDR_H)
    .attr("stroke", "#e0e0e0").attr("stroke-width", 1);

  funnel.forEach((step, i) => {
    const ry = HDR_H + i * ROW_H;
    const bw = BAR_MAX * (step.n / n0);
    const color = COLORS[Math.min(i, COLORS.length - 1)];

    // Zebra stripe
    if (i % 2 === 0)
      svg.append("rect").attr("x", 0).attr("y", ry).attr("width", W).attr("height", ROW_H)
        .attr("fill", "#f9f9f9");

    // Label
    svg.append("text")
      .attr("x", COL.label).attr("y", ry + ROW_H / 2 + 5)
      .attr("font-size", 11.5).attr("fill", "#222")
      .text(step.label);

    // Bar
    svg.append("rect")
      .attr("x", COL.bar).attr("y", ry + (ROW_H - BAR_H) / 2)
      .attr("width", bw).attr("height", BAR_H)
      .attr("fill", color).attr("rx", 2).attr("opacity", 0.85);

    // N
    svg.append("text")
      .attr("x", COL.n).attr("y", ry + ROW_H / 2 + 5)
      .attr("font-size", 13).attr("font-weight", "bold").attr("fill", color)
      .text(step.n.toLocaleString("es-AR"));

    // Excluded
    if (step.excluded > 0) {
      svg.append("text")
        .attr("x", COL.excl).attr("y", ry + ROW_H / 2 - 2)
        .attr("font-size", 11).attr("fill", "#e15759").attr("font-weight", "bold")
        .text(`−${step.excluded.toLocaleString("es-AR")}`);
      svg.append("text")
        .attr("x", COL.excl).attr("y", ry + ROW_H / 2 + 11)
        .attr("font-size", 9).attr("fill", "#999").attr("font-style", "italic")
        .text(step.excluded_label ?? "");
    }

    // Row divider
    svg.append("line")
      .attr("x1", 0).attr("y1", ry + ROW_H).attr("x2", W).attr("y2", ry + ROW_H)
      .attr("stroke", "#ececec").attr("stroke-width", 1);
  });

  display(svg.node());
}
```
