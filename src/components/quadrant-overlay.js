import {html} from "npm:htl";
import * as d3 from "npm:d3";

const QUADRANT_COLORS = {
  1: "#4e79a7", // sup. der.
  2: "#f28e2b", // sup. izq.
  3: "#e15759", // inf. izq.
  4: "#59a14f", // inf. der.
};

const QUADRANT_LABELS = {
  1: "Q1 — sup. derecho",
  2: "Q2 — sup. izquierdo",
  3: "Q3 — inf. izquierdo",
  4: "Q4 — inf. derecho",
};

/**
 * Comparative quadrant overlay: user-selected quadrants are reflected onto
 * the same hemiside (|x|, y) so they can be compared.
 *
 * - 1 cuadrante: solo lo dibuja (descriptivo).
 * - 2 cuadrantes: une posiciones homólogas (mismo dígito FDI) con flechas y
 *   muestra la distancia media entre los pares.
 * - 3+ cuadrantes: superpone todos sin flechas.
 */
export function quadrantOverlay({
  toothStats,
  quadrants = [1, 2],
  width = 720,
  height = 460,
  showEllipses = true,
}) {
  const margin = {top: 28, right: 140, bottom: 36, left: 44};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const data = toothStats
    .filter(
      (t) =>
        t.fdi >= 11 &&
        t.fdi <= 48 &&
        t.quadrant >= 1 &&
        t.quadrant <= 4 &&
        quadrants.includes(t.quadrant)
    )
    .map((t) => ({
      fdi: t.fdi,
      pos: t.fdi % 10,
      q: t.quadrant,
      x: Math.abs(t.mean_x),
      y: t.mean_y,
      sx: t.std_x,
      sy: t.std_y,
    }));

  if (!data.length) {
    return html`<div style="color:#888;padding:12px;">Seleccioná al menos un cuadrante.</div>`;
  }

  // Pair arrows when exactly two quadrants are chosen.
  let pairs = [];
  let meanPairDist = null;
  if (quadrants.length === 2) {
    const [qA, qB] = quadrants;
    const byPosA = new Map(data.filter((d) => d.q === qA).map((d) => [d.pos, d]));
    const byPosB = new Map(data.filter((d) => d.q === qB).map((d) => [d.pos, d]));
    for (const [pos, a] of byPosA) {
      const b = byPosB.get(pos);
      if (b) pairs.push({pos, a, b, dist: Math.hypot(a.x - b.x, a.y - b.y)});
    }
    if (pairs.length) meanPairDist = d3.mean(pairs, (p) => p.dist);
  }

  // Domain.
  const xMax = d3.max(data, (d) => d.x + (showEllipses ? d.sx : 0)) * 1.05;
  const yMin = d3.min(data, (d) => d.y - (showEllipses ? d.sy : 0));
  const yMax = d3.max(data, (d) => d.y + (showEllipses ? d.sy : 0));
  const dx = xMax;
  const dy = yMax - yMin;
  const unit = Math.min(innerW / dx, innerH / dy);
  const offX = (innerW - dx * unit) / 2;
  const offY = (innerH - dy * unit) / 2;

  const x = (v) => offX + v * unit;
  const y = (v) => offY + (v - yMin) * unit;

  const svg = d3
    .create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .style("max-width", "100%")
    .style("background", "#fff");

  svg
    .append("defs")
    .append("marker")
    .attr("id", "qov-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#444");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Midline.
  g.append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", y(yMin))
    .attr("y2", y(yMax))
    .attr("stroke", "#bbb")
    .attr("stroke-dasharray", "3 3");
  g.append("text")
    .attr("x", x(0) + 4)
    .attr("y", y(yMin) + 12)
    .style("font-size", "10px")
    .style("fill", "#888")
    .text("línea media");

  g.append("text")
    .attr("x", x(xMax) - 4)
    .attr("y", y(yMin) + 12)
    .attr("text-anchor", "end")
    .style("font-size", "10px")
    .style("fill", "#888")
    .text("↑ maxilar");
  g.append("text")
    .attr("x", x(xMax) - 4)
    .attr("y", y(yMax) - 4)
    .attr("text-anchor", "end")
    .style("font-size", "10px")
    .style("fill", "#888")
    .text("↓ mandíbula");

  if (showEllipses) {
    g.append("g")
      .selectAll("ellipse")
      .data(data)
      .join("ellipse")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("rx", (d) => d.sx * unit)
      .attr("ry", (d) => d.sy * unit)
      .attr("fill", (d) => QUADRANT_COLORS[d.q])
      .attr("fill-opacity", 0.1)
      .attr("stroke", (d) => QUADRANT_COLORS[d.q])
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 1);
  }

  if (pairs.length) {
    g.append("g")
      .attr("stroke", "#444")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(pairs)
      .join("line")
      .attr("x1", (p) => x(p.a.x))
      .attr("y1", (p) => y(p.a.y))
      .attr("x2", (p) => x(p.b.x))
      .attr("y2", (p) => y(p.b.y))
      .attr("marker-end", "url(#qov-arrow)")
      .append("title")
      .text(
        (p) =>
          `Posición ${p.pos}: FDI ${p.a.fdi} ↔ FDI ${p.b.fdi}\n` +
          `distancia = ${p.dist.toFixed(4)}`
      );
  }

  g.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => x(d.x))
    .attr("cy", (d) => y(d.y))
    .attr("r", 4.5)
    .attr("fill", (d) => QUADRANT_COLORS[d.q])
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .append("title")
    .text(
      (d) =>
        `FDI ${d.fdi} (Q${d.q}, posición ${d.pos})\n` +
        `μ=(${d.x.toFixed(3)}, ${d.y.toFixed(3)})\n` +
        `σ=(${d.sx.toFixed(3)}, ${d.sy.toFixed(3)})`
    );

  g.append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", (d) => x(d.x))
    .attr("y", (d) => y(d.y) - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "9px")
    .style("font-weight", "600")
    .style("fill", (d) => QUADRANT_COLORS[d.q])
    .text((d) => d.pos);

  // Legend.
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - margin.right + 14}, ${margin.top + 4})`);
  legend
    .append("text")
    .attr("y", 0)
    .style("font-size", "11px")
    .style("font-weight", "600")
    .style("fill", "#444")
    .text("Cuadrantes");
  quadrants.forEach((q, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${14 + i * 18})`);
    row.append("circle").attr("r", 5).attr("cx", 6).attr("cy", 0).attr("fill", QUADRANT_COLORS[q]);
    row
      .append("text")
      .attr("x", 18)
      .attr("y", 4)
      .style("font-size", "11px")
      .style("fill", "#444")
      .text(QUADRANT_LABELS[q]);
  });

  if (meanPairDist != null) {
    const baseY = 14 + quadrants.length * 18 + 12;
    legend
      .append("text")
      .attr("y", baseY)
      .style("font-size", "10px")
      .style("fill", "#666")
      .text(`Distancia media`);
    legend
      .append("text")
      .attr("y", baseY + 16)
      .style("font-size", "15px")
      .style("font-weight", "700")
      .style("fill", "#222")
      .text(meanPairDist.toFixed(4));
    legend
      .append("text")
      .attr("y", baseY + 30)
      .style("font-size", "10px")
      .style("fill", "#888")
      .text(`(n=${pairs.length} pares)`);
  }

  return svg.node();
}

export const QUADRANT_OVERLAY_LABELS = QUADRANT_LABELS;
