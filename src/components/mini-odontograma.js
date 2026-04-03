/**
 * Mini-odontograma SVG (solo lectura).
 *
 * Muestra un esquema dental compacto indicando qué piezas están presentes.
 * No es interactivo — solo visualización.
 */

const ROWS = [
  [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
];

const QUADRANT_COLORS = {
  1: "#4e79a7",
  2: "#59a14f",
  3: "#edc949",
  4: "#e15759",
};

/**
 * Crea un mini-odontograma SVG.
 *
 * @param {Object} options
 * @param {number[]} options.toothNumbers - Array de FDI numbers presentes
 * @param {number} [options.cellSize=16] - tamaño de cada celda
 * @param {number} [options.gap=2] - gap entre celdas
 * @returns {SVGElement}
 */
export function miniOdontograma({toothNumbers = [], cellSize = 16, gap = 2} = {}) {
  const present = new Set(toothNumbers);
  const cols = 16;
  const totalW = cols * (cellSize + gap) - gap;
  const totalH = 2 * cellSize + gap;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
  svg.setAttribute("width", totalW);
  svg.setAttribute("height", totalH);
  svg.style.fontFamily = "var(--sans-serif, system-ui, sans-serif)";

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 16; col++) {
      const fdi = ROWS[row][col];
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);
      const q = Math.floor(fdi / 10);
      const isPresent = present.has(fdi);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", cellSize);
      rect.setAttribute("height", cellSize);
      rect.setAttribute("rx", 2);
      rect.setAttribute("fill", isPresent ? QUADRANT_COLORS[q] : "#eee");
      rect.setAttribute("stroke", isPresent ? QUADRANT_COLORS[q] : "#ddd");
      rect.setAttribute("stroke-width", 0.5);
      rect.setAttribute("opacity", isPresent ? 0.85 : 0.4);

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${fdi}${isPresent ? "" : " (ausente)"}`;
      rect.appendChild(title);

      svg.appendChild(rect);
    }
  }

  // Línea divisoria vertical central
  const midX = 8 * (cellSize + gap) - gap / 2;
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", midX);
  line.setAttribute("y1", 0);
  line.setAttribute("x2", midX);
  line.setAttribute("y2", totalH);
  line.setAttribute("stroke", "#999");
  line.setAttribute("stroke-width", 1);
  line.setAttribute("stroke-dasharray", "2,2");
  svg.appendChild(line);

  return svg;
}
