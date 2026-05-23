/**
 * Layout wrapper para slides de presentación.
 * 
 * Provee:
 * - Título grande con número de slide
 * - Contenedor con padding y max-width
 * - Estilo consistente para bullets y énfasis
 */

import {html} from "htl";

export function slideLayout(slideNumber, title, content, {subtitle = null, background = "white"} = {}) {
  return html`<div style="
    min-height: 80vh; 
    background: ${background}; 
    padding: 2rem; 
    border-radius: 8px; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  ">
    <div style="max-width: 900px; margin: 0 auto;">
      <!-- Número de slide -->
      <div style="
        font-size: 0.75rem; 
        color: #999; 
        font-weight: 700; 
        letter-spacing: 0.1em; 
        margin-bottom: 0.5rem;
      ">
        SLIDE ${slideNumber} / 8
      </div>
      
      <!-- Título -->
      <h1 style="
        font-size: 2.5rem; 
        font-weight: 700; 
        color: #1f2937; 
        margin: 0 0 ${subtitle ? "0.5rem" : "1.5rem"};
        line-height: 1.2;
      ">
        ${title}
      </h1>
      
      ${subtitle ? html`<div style="
        font-size: 1.1rem; 
        color: #666; 
        margin-bottom: 1.5rem; 
        font-weight: 400;
      ">
        ${subtitle}
      </div>` : ""}
      
      <!-- Contenido del slide -->
      <div style="
        font-size: 1rem; 
        line-height: 1.8; 
        color: #333;
      ">
        ${content}
      </div>
    </div>
  </div>`;
}

/**
 * Bullet point estilizado para slides.
 */
export function slideBullet(text, {icon = "•", color = "#4c78a8"} = {}) {
  return html`<div style="
    display: flex; 
    gap: 0.8rem; 
    margin: 0.8rem 0; 
    align-items: flex-start;
  ">
    <span style="
      font-size: 1.5rem; 
      color: ${color}; 
      font-weight: 700; 
      line-height: 1.2;
    ">${icon}</span>
    <div style="flex: 1; padding-top: 0.2rem;">${text}</div>
  </div>`;
}

/**
 * Box de énfasis para slides.
 */
export function slideEmphasis(content, {color = "#4c78a8", background = "#eef2f7"} = {}) {
  return html`<div style="
    background: ${background}; 
    border-left: 4px solid ${color}; 
    padding: 1.2rem 1.5rem; 
    border-radius: 4px; 
    margin: 1.5rem 0; 
    font-size: 1.05rem;
  ">
    ${content}
  </div>`;
}
