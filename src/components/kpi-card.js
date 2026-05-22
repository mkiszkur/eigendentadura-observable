import {html} from "npm:htl";

/**
 * Tarjeta KPI con tooltip opcional de trazabilidad
 * 
 * @param {Object} config
 * @param {string} config.label - Etiqueta superior (uppercase)
 * @param {string} config.value - Valor principal (grande, coloreado)
 * @param {string} config.sub - Subtítulo explicativo
 * @param {string} config.color - Color del borde y valor (hex)
 * @param {string} [config.source] - Stage/experimento que genera el dato
 * @param {string} [config.tooltip] - Descripción adicional del cálculo/criterio
 * @returns {HTMLElement}
 */
export function kpiCard(config) {
  const {label, value, sub, color, source, tooltip} = config;
  
  const hasTooltip = source || tooltip;
  const tooltipText = [source, tooltip].filter(Boolean).join(" · ");
  
  return html`<div style="background:${color}12; border-left:4px solid ${color}; padding:1rem 1.2rem; border-radius:6px; position:relative;">
    <div style="font-size:0.75rem; color:#666; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
      <span>${label}</span>
      ${hasTooltip ? html`<span 
        title="${tooltipText}"
        style="cursor:help; color:#999; font-size:0.85rem; font-weight:normal; user-select:none;"
      >ⓘ</span>` : ""}
    </div>
    <div style="font-size:2rem; font-weight:700; color:${color}; line-height:1;">${value}</div>
    <div style="font-size:0.78rem; color:#666; margin-top:4px;">${sub}</div>
  </div>`;
}

/**
 * Grilla responsive de tarjetas KPI
 * 
 * @param {Object[]} items - Array de configs para kpiCard()
 * @param {Object} [options]
 * @param {string} [options.minWidth="190px"] - Ancho mínimo de cada tarjeta
 * @param {string} [options.gap="1.2rem"] - Espacio entre tarjetas
 * @returns {HTMLElement}
 */
export function kpiGrid(items, options = {}) {
  const {minWidth = "190px", gap = "1.2rem"} = options;
  
  return html`<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(${minWidth},1fr)); gap:${gap}; margin-top:0.8rem; margin-bottom:1.5rem;">
    ${items.map(kpiCard)}
  </div>`;
}
