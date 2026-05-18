import {html} from "npm:htl";

/**
 * Grilla de tarjetas KPI.
 *
 * Cada item: { label, value, sub?, color? }
 *  - label: texto de etiqueta (uppercase, gris).
 *  - value: valor destacado (string o number).
 *  - sub:   texto secundario opcional.
 *  - color: hex u otra forma CSS válida; default = --color-primary.
 *
 * Estilo en `observable/src/style.css` (.kpi-grid, .kpi-card).
 * El color por tarjeta se pasa como CSS variable inline (--card-color).
 *
 * Uso:
 *   import {kpi} from "../components/kpi.js";
 *   display(kpi([
 *     {label: "Archivos JSON", value: "5.114", sub: "1 panto = 1 JSON", color: "#4c78a8"},
 *     ...
 *   ]));
 */
export function kpi(items) {
  return html`<div class="kpi-grid">${items.map(it => {
    const card = html`<div class="kpi-card">
      <div class="kpi-label">${it.label}</div>
      <div class="kpi-value">${it.value}</div>
      <div class="kpi-sub">${it.sub ?? ""}</div>
    </div>`;
    if (it.color) card.style.setProperty("--card-color", it.color);
    return card;
  })}</div>`;
}
