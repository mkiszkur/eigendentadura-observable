---
title: Tesis · Cap 03 — figuras
toc: false
---

<!--
Páginas de export internas para la tesis. NO se enlazan desde el menú
público (ver `pages` en `observablehq.config.js`).

Cada figura está envuelta en un `<div id="fig-<slug>">` para que el
extractor (`scripts/extract_thesis_svgs.py`) pueda localizarla por id
y exportarla a `docs/tesis/figuras/03_dataset/<slug>.svg`.

Spec: docs/general/planificacion/sprint_observable_figuras_tesis.md.
-->

# Figuras — capítulo 3 (Universo de datos)

```js
import * as d3 from "d3";
const ds = await FileAttachment("../data/dataset_stats.json").json();
const funnel = ds.funnel;
```

## fig:cap03-universo-geometrico — Universo geométrico (CONSORT)

<div id="fig-cap03-universo-geometrico">

```js
{
  const W = 700;
  const BOX_H = 52, BOX_W = 320, GAP = 40, EXCL_W = 200, EXCL_H = 36;
  const M = {top: 16, left: (W - BOX_W) / 2};
  const COLOR = ["#2171b5", "#2171b5", "#2171b5", "#08306b"];
  const height = funnel.length * BOX_H + (funnel.length - 1) * GAP + 32;

  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", [0, 0, W, height])
    .attr("width", W)
    .attr("height", height)
    .style("font-family", "Arial, Helvetica, sans-serif");

  funnel.forEach((step, i) => {
    const bx = M.left;
    const by = M.top + i * (BOX_H + GAP);
    const color = COLOR[Math.min(i, COLOR.length - 1)];
    const cx = M.left + BOX_W / 2;

    if (i > 0) {
      const prevBy = M.top + (i - 1) * (BOX_H + GAP);
      svg
        .append("line")
        .attr("x1", cx)
        .attr("y1", prevBy + BOX_H)
        .attr("x2", cx)
        .attr("y2", by)
        .attr("stroke", "#999")
        .attr("stroke-width", 1.5);
      svg
        .append("polygon")
        .attr(
          "points",
          `${cx - 5},${by - 8} ${cx + 5},${by - 8} ${cx},${by}`
        )
        .attr("fill", "#999");
    }

    svg
      .append("rect")
      .attr("x", bx)
      .attr("y", by)
      .attr("width", BOX_W)
      .attr("height", BOX_H)
      .attr("fill", "white")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("rx", 4);

    svg
      .append("text")
      .attr("x", cx)
      .attr("y", by + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("fill", "#222")
      .text(step.label);
    svg
      .append("text")
      .attr("x", cx)
      .attr("y", by + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", "bold")
      .attr("fill", color)
      .text(`n = ${step.n.toLocaleString("es-AR")}`);

    if (step.excluded > 0) {
      const midY = by + BOX_H / 2;
      const ex = bx + BOX_W + 24;
      const ey = midY - EXCL_H / 2;
      svg
        .append("line")
        .attr("x1", bx + BOX_W)
        .attr("y1", midY)
        .attr("x2", ex)
        .attr("y2", midY)
        .attr("stroke", "#e15759")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3");
      svg
        .append("rect")
        .attr("x", ex)
        .attr("y", ey)
        .attr("width", EXCL_W)
        .attr("height", EXCL_H)
        .attr("fill", "white")
        .attr("stroke", "#e15759")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3")
        .attr("rx", 3);
      svg
        .append("text")
        .attr("x", ex + 8)
        .attr("y", ey + 14)
        .attr("font-size", 10)
        .attr("fill", "#e15759")
        .text(`−${step.excluded.toLocaleString("es-AR")}`);
      svg
        .append("text")
        .attr("x", ex + 8)
        .attr("y", ey + 27)
        .attr("font-size", 9)
        .attr("fill", "#c00")
        .attr("font-style", "italic")
        .text(step.excluded_label ?? "");
    }
  });

  display(svg.node());
}
```

</div>
