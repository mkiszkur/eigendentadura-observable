/**
 * Selector de dientes compacto: odontograma + botones de preset.
 *
 * Los FDI permanentes se clasifican por tipo:
 *   - Incisivos: dígito de posición 1 o 2 (11,12,21,22,31,32,41,42)
 *   - Caninos:   dígito 3 (13, 23, 33, 43)
 *   - Premolares: dígito 4 o 5 (14,15,24,25,34,35,44,45)
 *   - Molares:    dígito 6, 7, 8 (16,17,18,26,27,28,36,37,38,46,47,48)
 */
import {odontograma} from "./odontograma.js";

export const ALL_FDI = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

// Classification by tooth position (last digit)
const POS = (fdi) => fdi % 10;
export const TOOTH_GROUPS = {
  molares: ALL_FDI.filter(f => [6, 7, 8].includes(POS(f))),
  premolares: ALL_FDI.filter(f => [4, 5].includes(POS(f))),
  caninos: ALL_FDI.filter(f => POS(f) === 3),
  incisivos: ALL_FDI.filter(f => [1, 2].includes(POS(f))),
  superiores: ALL_FDI.filter(f => f <= 28),
  inferiores: ALL_FDI.filter(f => f >= 31),
};

// 2 filas × 4 columnas — orden row-major:
//   Col 1: Molares/Premolares · Col 2: Caninos/Incisivos
//   Col 3: Superiores/Inferiores · Col 4: Todos/Ninguno
const PRESETS = [
  {key: "molares",    label: "Molares",    fdis: TOOTH_GROUPS.molares},
  {key: "caninos",    label: "Caninos",    fdis: TOOTH_GROUPS.caninos},
  {key: "superiores", label: "Superiores", fdis: TOOTH_GROUPS.superiores},
  {key: "all",        label: "Todos",      fdis: ALL_FDI},
  {key: "premolares", label: "Premolares", fdis: TOOTH_GROUPS.premolares},
  {key: "incisivos",  label: "Incisivos",  fdis: TOOTH_GROUPS.incisivos},
  {key: "inferiores", label: "Inferiores", fdis: TOOTH_GROUPS.inferiores},
  {key: "none",       label: "Ninguno",    fdis: []},
];

const BTN_STYLE = "padding:3px 9px; font-size:11px; cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:3px;";

/**
 * @param {Object} opts
 * @param {Array<number>} opts.selected - current FDI selection
 * @param {Function} opts.onToggle - (fdi) => void, clic en un diente
 * @param {Function} opts.onSetSelection - (fdis: number[]) => void, aplicar preset
 * @param {Object} [opts.fdiNombres] - mapping fdi → nombre
 * @param {number} [opts.cellW=26] - ancho celda odontograma
 * @param {number} [opts.cellH=22] - alto celda odontograma
 * @returns {HTMLElement}
 */
export function teethSelector({
  selected,
  onToggle,
  onSetSelection,
  fdiNombres = {},
  cellW = 26,
  cellH = 22,
} = {}) {
  const container = document.createElement("div");
  container.style.cssText = "display:flex; align-items:center; gap:14px; padding:4px 0; flex-wrap:wrap;";

  // Odontograma (smaller)
  const selectedSet = new Set(selected);
  const odonto = odontograma({
    selected: selectedSet,
    fdiNombres,
    onToggle,
    cellW,
    cellH,
    gap: 2,
  });
  container.appendChild(odonto);

  // Preset buttons — 2 filas × 4 columnas
  const btnGrid = document.createElement("div");
  btnGrid.style.cssText = "display:grid; grid-template-columns:repeat(4, auto); grid-auto-flow:row; gap:4px;";

  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.textContent = preset.label;
    btn.style.cssText = BTN_STYLE;
    btn.addEventListener("click", () => {
      if (onSetSelection) onSetSelection([...preset.fdis]);
    });
    btn.addEventListener("mouseenter", () => btn.style.background = "#f0f0f0");
    btn.addEventListener("mouseleave", () => btn.style.background = "#fff");
    btnGrid.appendChild(btn);
  }
  container.appendChild(btnGrid);

  return container;
}
