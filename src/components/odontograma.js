/**
 * Odontograma SVG interactivo.
 *
 * Dibuja un esquema dental con 32 celdas (4 cuadrantes × 8 dientes)
 * dispuestas como se ven en una panorámica: arcada superior der→izq,
 * arcada inferior izq→der (visión frontal del paciente).
 *
 * Cada celda es clicable y emite un evento custom "tooth-toggle".
 */

// Layout del odontograma: filas y posiciones FDI
// Fila 0: superior derecho (18→11) + superior izquierdo (21→28)
// Fila 1: inferior derecho (48→41) + inferior izquierdo (31→38)
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
 * Crea un odontograma SVG interactivo.
 *
 * @param {Object} options
 * @param {Set<number>} options.selected - FDI numbers currently selected
 * @param {Object} options.fdiNombres - mapping fdi → display name
 * @param {Function} options.onToggle - callback(fdi) when a tooth is toggled
 * @param {number} [options.cellW=48] - cell width
 * @param {number} [options.cellH=40] - cell height
 * @param {number} [options.gap=3] - gap between cells
 * @returns {SVGElement}
 */
export function odontograma({selected, fdiNombres = {}, onToggle, cellW = 48, cellH = 40, gap = 3} = {}) {
  const cols = 16;
  const totalW = cols * (cellW + gap) - gap;
  const totalH = 2 * cellH + gap + 40; // 40px for labels

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
  svg.setAttribute("width", totalW);
  svg.setAttribute("height", totalH);
  svg.style.fontFamily = "var(--sans-serif, system-ui, sans-serif)";
  svg.style.cursor = "pointer";
  svg.style.userSelect = "none";

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 16; col++) {
      const fdi = ROWS[row][col];
      const x = col * (cellW + gap);
      const y = row * (cellH + gap) + 20; // offset for top labels
      const q = Math.floor(fdi / 10);
      const isSelected = selected.has(fdi);

      // Cell group
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.style.cursor = "pointer";

      // Background rect
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", cellW);
      rect.setAttribute("height", cellH);
      rect.setAttribute("rx", 4);
      rect.setAttribute("fill", isSelected ? QUADRANT_COLORS[q] : "#f0f0f0");
      rect.setAttribute("stroke", QUADRANT_COLORS[q]);
      rect.setAttribute("stroke-width", isSelected ? 2 : 1);
      rect.setAttribute("opacity", isSelected ? 1 : 0.6);
      g.appendChild(rect);

      // FDI number label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + cellW / 2);
      text.setAttribute("y", y + cellH / 2 + 1);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.setAttribute("font-size", 12);
      text.setAttribute("font-weight", isSelected ? "bold" : "normal");
      text.setAttribute("fill", isSelected ? "white" : "#555");
      text.textContent = String(fdi);
      g.appendChild(text);

      // Tooltip (title element for native browser tooltip)
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = fdiNombres[fdi] || `Pieza ${fdi}`;
      g.appendChild(title);

      // Click handler
      g.addEventListener("click", () => {
        if (onToggle) onToggle(fdi);
      });

      // Hover effect
      g.addEventListener("mouseenter", () => {
        rect.setAttribute("opacity", 1);
        rect.setAttribute("stroke-width", 2);
      });
      g.addEventListener("mouseleave", () => {
        if (!selected.has(fdi)) {
          rect.setAttribute("opacity", 0.6);
          rect.setAttribute("stroke-width", 1);
        }
      });

      svg.appendChild(g);
    }
  }

  // Cuadrant divider line (vertical middle)
  const midX = 8 * (cellW + gap) - gap / 2;
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", midX);
  line.setAttribute("y1", 15);
  line.setAttribute("x2", midX);
  line.setAttribute("y2", 20 + 2 * cellH + gap);
  line.setAttribute("stroke", "#999");
  line.setAttribute("stroke-width", 1);
  line.setAttribute("stroke-dasharray", "4,3");
  svg.appendChild(line);

  // Row labels
  const labelStyle = {fontSize: 11, fill: "#888"};
  const supLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  supLabel.setAttribute("x", 0);
  supLabel.setAttribute("y", 14);
  supLabel.setAttribute("font-size", labelStyle.fontSize);
  supLabel.setAttribute("fill", labelStyle.fill);
  supLabel.textContent = "Superior";
  svg.appendChild(supLabel);

  const infLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  infLabel.setAttribute("x", 0);
  infLabel.setAttribute("y", 20 + 2 * cellH + gap + 15);
  infLabel.setAttribute("font-size", labelStyle.fontSize);
  infLabel.setAttribute("fill", labelStyle.fill);
  infLabel.textContent = "Inferior";
  svg.appendChild(infLabel);

  return svg;
}
