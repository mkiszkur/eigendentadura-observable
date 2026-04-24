/**
 * Prevalencia de patologías por diente: odontograma coloreado según
 * el porcentaje de dentaduras en las que ese diente presenta la
 * patología seleccionada.
 */
import * as d3 from "d3";
import {ALL_FDI} from "./teeth-selector.js";

function fdiGrid() {
  // Filas 16: upper-row (maxilar), 32: lower-row (mandibular)
  const upper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  return {upper, lower};
}

/**
 * @param {Object} opts
 * @param {Object} opts.prevalenceData - { n_dentitions, pathologies, teeth: [{fdi, n_present, <Label>:{count,prevalence}, ...}] }
 * @param {string} opts.pathology - label de patología activa
 * @param {Array<number>} [opts.selectedFdi=[]] - FDI resaltados (borde grueso)
 * @param {number} [opts.width=720]
 */
export function prevalenceOdontogram({
  prevalenceData,
  pathology,
  selectedFdi = [],
  width = 720,
  cellW = 38,
  cellH = 52,
} = {}) {
  const {upper, lower} = fdiGrid();
  const byFdi = new Map(prevalenceData.teeth.map(t => [t.fdi, t]));
  const selSet = new Set(selectedFdi);

  // Max prevalencia entre los dientes para escalar el color de este panel.
  const values = prevalenceData.teeth.map(t => t[pathology]?.prevalence ?? 0);
  const maxVal = d3.max(values) || 0.0001;

  // Paleta rojo-naranja (OrRd). Para valores muy bajos queda casi blanco.
  const color = d3.scaleSequential(d3.interpolateOrRd).domain([0, maxVal]);

  const nCols = 16;
  const padX = 6, padY = 10;
  const innerW = nCols * cellW + padX * 2;
  // Filas: maxilar (2 → 28), separador, mandibular (2 → 48). Mostramos 2 filas.
  const innerH = 2 * cellH + padY * 2 + 10;
  const w = Math.max(innerW, width);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, w, innerH])
    .attr("width", w)
    .attr("height", innerH)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("max-width", "100%");

  const xOffset = (w - innerW) / 2 + padX;

  function drawRow(fdis, rowIdx) {
    const g = svg.append("g")
      .attr("transform", `translate(${xOffset},${padY + rowIdx * (cellH + 6)})`);

    fdis.forEach((fdi, i) => {
      const rec = byFdi.get(fdi);
      const p = rec ? (rec[pathology]?.prevalence ?? 0) : 0;
      const c = rec ? (rec[pathology]?.count ?? 0) : 0;
      const n = rec ? rec.n_present : 0;

      const cell = g.append("g").attr("transform", `translate(${i * cellW},0)`);

      cell.append("rect")
        .attr("width", cellW - 2).attr("height", cellH)
        .attr("fill", rec ? color(p) : "#eee")
        .attr("stroke", selSet.has(fdi) ? "#111" : "#aaa")
        .attr("stroke-width", selSet.has(fdi) ? 2 : 0.8)
        .attr("rx", 4);

      // FDI number (top-left)
      cell.append("text")
        .attr("x", 6).attr("y", 15)
        .attr("font-size", Math.max(10, cellW * 0.22))
        .attr("fill", p > maxVal * 0.55 ? "#fff" : "#333")
        .text(fdi);

      // Prevalencia % centrada
      cell.append("text")
        .attr("x", (cellW - 2) / 2).attr("y", cellH / 2 + 6)
        .attr("text-anchor", "middle")
        .attr("font-size", Math.max(12, cellW * 0.28))
        .attr("font-weight", "bold")
        .attr("fill", p > maxVal * 0.55 ? "#fff" : "#222")
        .text(`${(p * 100).toFixed(1)}%`);

      // n (count / total) abajo
      cell.append("text")
        .attr("x", (cellW - 2) / 2).attr("y", cellH - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", Math.max(9, cellW * 0.18))
        .attr("fill", p > maxVal * 0.55 ? "#ffe" : "#666")
        .text(`${c}/${n}`);

      // Tooltip
      cell.append("title").text(
        `FDI ${fdi}\n${pathology}\n${c} / ${n}  (${(p * 100).toFixed(2)}%)`
      );
    });
  }

  drawRow(upper, 0);
  drawRow(lower, 1);

  // Plano sagital (línea central)
  svg.append("line")
    .attr("x1", xOffset + 8 * cellW - 1).attr("x2", xOffset + 8 * cellW - 1)
    .attr("y1", padY - 2).attr("y2", innerH - padY + 2)
    .attr("stroke", "#999").attr("stroke-dasharray", "3,3");

  return svg.node();
}

/** Crea una barra-leyenda con la escala de color (0 → maxVal en %). */
export function prevalenceLegend({prevalenceData, pathology, width = 320}) {
  const values = prevalenceData.teeth.map(t => t[pathology]?.prevalence ?? 0);
  const maxVal = d3.max(values) || 0.0001;
  const color = d3.scaleSequential(d3.interpolateOrRd).domain([0, maxVal]);

  const h = 42;
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, h])
    .attr("width", width).attr("height", h)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const defs = svg.append("defs");
  const gradId = `prev-grad-${Math.random().toString(36).slice(2, 8)}`;
  const grad = defs.append("linearGradient").attr("id", gradId)
    .attr("x1", "0%").attr("x2", "100%");
  for (let i = 0; i <= 10; i++) {
    grad.append("stop").attr("offset", `${i * 10}%`)
      .attr("stop-color", color(maxVal * i / 10));
  }

  const padX = 10;
  svg.append("text").attr("x", padX).attr("y", 12).attr("font-size", 11).attr("fill", "#444")
    .text(`Prevalencia de ${pathology}`);
  svg.append("rect").attr("x", padX).attr("y", 16)
    .attr("width", width - 2 * padX).attr("height", 10)
    .attr("fill", `url(#${gradId})`).attr("stroke", "#ccc");
  svg.append("text").attr("x", padX).attr("y", 38).attr("font-size", 10).attr("fill", "#666")
    .text("0%");
  svg.append("text").attr("x", width - padX).attr("y", 38).attr("font-size", 10).attr("fill", "#666")
    .attr("text-anchor", "end")
    .text(`${(maxVal * 100).toFixed(1)}%`);
  return svg.node();
}
