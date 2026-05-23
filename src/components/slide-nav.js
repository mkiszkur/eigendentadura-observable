/**
 * Componente de navegación entre slides (presentación modo defensa).
 * 
 * Muestra:
 * - Botones Anterior / Siguiente
 * - Indicador "Slide X de 8"
 * - Barra de progreso
 * - Atajos de teclado (←/→)
 */

import {html} from "htl";

export function slideNav(currentSlide, totalSlides = 8) {
  const slides = [
    {num: 1, title: "Portada", href: "./01-portada"},
    {num: 2, title: "El problema", href: "./02-problema"},
    {num: 3, title: "El dataset", href: "./03-dataset-cifras"},
    {num: 4, title: "Las 5 preguntas", href: "./04-preguntas"},
    {num: 5, title: "Metodología", href: "./05-metodologia"},
    {num: 6, title: "Hallazgos clave", href: "./06-hallazgos"},
    {num: 7, title: "La herramienta", href: "./07-herramienta"},
    {num: 8, title: "Impacto y cierre", href: "./08-cierre"},
  ];
  
  const currentIdx = slides.findIndex(s => s.num === currentSlide);
  const prevSlide = currentIdx > 0 ? slides[currentIdx - 1] : null;
  const nextSlide = currentIdx < slides.length - 1 ? slides[currentIdx + 1] : null;
  
  const progress = (currentSlide / totalSlides) * 100;
  
  // Estilo de botones
  const buttonStyle = (disabled) => `
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    font-weight: 600;
    border: 1px solid ${disabled ? "#ccc" : "#4c78a8"};
    background: ${disabled ? "#f5f5f5" : "#4c78a8"};
    color: ${disabled ? "#999" : "#fff"};
    border-radius: 4px;
    cursor: ${disabled ? "not-allowed" : "pointer"};
    text-decoration: none;
    transition: all 0.2s;
    ${disabled ? "opacity: 0.5;" : ""}
  `;
  
  const nav = html`<div style="position: sticky; top: 0; z-index: 100; background: white; border-bottom: 2px solid #e0e0e0; padding: 1rem; margin: -1rem -1rem 1.5rem;">
    <div style="max-width: 900px; margin: 0 auto;">
      <!-- Barra de progreso -->
      <div style="height: 4px; background: #e0e0e0; border-radius: 2px; margin-bottom: 1rem; overflow: hidden;">
        <div style="height: 100%; background: #4c78a8; width: ${progress}%; transition: width 0.3s;"></div>
      </div>
      
      <!-- Navegación -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        ${prevSlide 
          ? html`<a href="${prevSlide.href}" style="${buttonStyle(false)}">← ${prevSlide.title}</a>`
          : html`<span style="${buttonStyle(true)}">← Anterior</span>`
        }
        
        <div style="font-size: 0.9rem; color: #666; font-weight: 600; text-align: center;">
          Slide <strong style="color: #222;">${currentSlide}</strong> de ${totalSlides}
        </div>
        
        ${nextSlide 
          ? html`<a href="${nextSlide.href}" style="${buttonStyle(false)}">${nextSlide.title} →</a>`
          : html`<span style="${buttonStyle(true)}">Siguiente →</span>`
        }
      </div>
      
      <!-- Índice rápido -->
      <details style="margin-top: 1rem; font-size: 0.85rem;">
        <summary style="cursor: pointer; color: #4c78a8; font-weight: 600;">Ver todos los slides</summary>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; margin-top: 0.8rem;">
          ${slides.map(s => html`<a 
            href="${s.href}" 
            style="
              padding: 0.5rem 0.8rem; 
              border: 1px solid ${s.num === currentSlide ? "#4c78a8" : "#e0e0e0"}; 
              background: ${s.num === currentSlide ? "#eef2f7" : "white"}; 
              border-radius: 4px; 
              text-decoration: none; 
              color: #222;
              font-weight: ${s.num === currentSlide ? "600" : "400"};
            ">
            ${s.num}. ${s.title}
          </a>`)}
        </div>
      </details>
    </div>
  </div>`;
  
  // Atajos de teclado
  if (typeof window !== "undefined") {
    const handleKeydown = (e) => {
      if (e.key === "ArrowLeft" && prevSlide) {
        window.location.href = prevSlide.href;
      } else if (e.key === "ArrowRight" && nextSlide) {
        window.location.href = nextSlide.href;
      }
    };
    
    window.addEventListener("keydown", handleKeydown);
    nav.addEventListener("remove", () => {
      window.removeEventListener("keydown", handleKeydown);
    });
  }
  
  return nav;
}
