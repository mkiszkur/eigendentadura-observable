/**
 * Comparación visual de normalización por imagen vs. landmarks.
 * 
 * Muestra la misma panto en dos espacios de coordenadas:
 * - Izquierda: *_norm (normalización por imagen)
 * - Derecha: *_lm (normalización por landmarks condíleos)
 * 
 * Overlay: landmarks, frame intercondíleo, dientes.
 */

import * as d3 from "d3";
import {html} from "htl";

export function normalizationComparison(pantoId, geomData, {width = 800} = {}) {
  const panelWidth = width / 2 - 10;
  const panelHeight = 320;
  
  // Extraer dientes y landmarks
  const teeth = geomData.teeth || [];
  const landmarks = geomData.landmarks || {};
  
  // Verificar que tengamos los datos necesarios
  if (teeth.length === 0) {
    return html`<div style="padding:20px; text-align:center; color:#888;">
      No hay datos geométricos para esta pantomografía.
    </div>`;
  }
  
  // Función para renderizar un panel
  function renderPanel(coordType, title, color) {
    const cx_key = coordType === "norm" ? "centroid_x_norm" : "centroid_x_lm";
    const cy_key = coordType === "norm" ? "centroid_y_norm" : "centroid_y_lm";
    
    // Filtrar dientes que tienen las coordenadas
    const validTeeth = teeth.filter(t => t[cx_key] != null && t[cy_key] != null);
    
    if (validTeeth.length === 0) {
      return html`<div style="width:${panelWidth}px; height:${panelHeight}px; border:1px solid #ddd; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#888;">
        <div>Sin datos en ${coordType}</div>
      </div>`;
    }
    
    // Calcular bbox de los dientes
    const xValues = validTeeth.map(t => t[cx_key]);
    const yValues = validTeeth.map(t => t[cy_key]);
    const xMin = d3.min(xValues);
    const xMax = d3.max(xValues);
    const yMin = d3.min(yValues);
    const yMax = d3.max(yValues);
    
    // Agregar padding
    const padding = 40;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xPadded = [xMin - xRange * 0.1, xMax + xRange * 0.1];
    const yPadded = [yMin - yRange * 0.1, yMax + yRange * 0.1];
    
    // Escalas
    const xScale = d3.scaleLinear()
      .domain(xPadded)
      .range([padding, panelWidth - padding]);
    
    const yScale = d3.scaleLinear()
      .domain(yPadded)
      .range([panelHeight - padding, padding]);
    
    // SVG
    const svg = d3.create("svg")
      .attr("width", panelWidth)
      .attr("height", panelHeight)
      .attr("style", "border: 1px solid #ddd; border-radius: 4px;");
    
    // Fondo
    svg.append("rect")
      .attr("width", panelWidth)
      .attr("height", panelHeight)
      .attr("fill", "#f9f9f9");
    
    // Título
    svg.append("text")
      .attr("x", panelWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("font-weight", "600")
      .attr("fill", color)
      .text(title);
    
    // Landmarks condíleos (si es *_lm y tenemos los landmarks)
    if (coordType === "lm" && landmarks.L1 && landmarks.L2 && landmarks.L6 && landmarks.L7) {
      const L1 = landmarks.L1;
      const L2 = landmarks.L2;
      const L6 = landmarks.L6;
      const L7 = landmarks.L7;
      
      // Línea intercondilar (L1-L2)
      svg.append("line")
        .attr("x1", xScale(L1.centroid_x_lm))
        .attr("y1", yScale(L1.centroid_y_lm))
        .attr("x2", xScale(L2.centroid_x_lm))
        .attr("y2", yScale(L2.centroid_y_lm))
        .attr("stroke", "#e45756")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2");
      
      // Puntos condíleos
      [L1, L2, L6, L7].forEach(lm => {
        svg.append("circle")
          .attr("cx", xScale(lm.centroid_x_lm))
          .attr("cy", yScale(lm.centroid_y_lm))
          .attr("r", 4)
          .attr("fill", "#e45756")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
      });
      
      // Labels
      svg.append("text")
        .attr("x", xScale(L1.centroid_x_lm) - 10)
        .attr("y", yScale(L1.centroid_y_lm) - 8)
        .attr("font-size", 9)
        .attr("fill", "#e45756")
        .attr("font-weight", "600")
        .text("L1");
      
      svg.append("text")
        .attr("x", xScale(L2.centroid_x_lm) + 10)
        .attr("y", yScale(L2.centroid_y_lm) - 8)
        .attr("font-size", 9)
        .attr("fill", "#e45756")
        .attr("font-weight", "600")
        .text("L2");
    }
    
    // Dientes como círculos
    svg.append("g")
      .selectAll("circle")
      .data(validTeeth)
      .join("circle")
      .attr("cx", d => xScale(d[cx_key]))
      .attr("cy", d => yScale(d[cy_key]))
      .attr("r", 3)
      .attr("fill", color)
      .attr("opacity", 0.7)
      .append("title")
      .text(d => `FDI ${d.fdi || "?"}: (${d[cx_key].toFixed(2)}, ${d[cy_key].toFixed(2)})`);
    
    // Ejes (opcional)
    const xAxis = d3.axisBottom(xScale).ticks(5).tickSize(3);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(3);
    
    svg.append("g")
      .attr("transform", `translate(0,${panelHeight - padding})`)
      .call(xAxis)
      .attr("font-size", 9)
      .attr("color", "#999");
    
    svg.append("g")
      .attr("transform", `translate(${padding},0)`)
      .call(yAxis)
      .attr("font-size", 9)
      .attr("color", "#999");
    
    return svg.node();
  }
  
  // Renderizar ambos paneles
  const leftPanel = renderPanel("norm", "Normalización por imagen (*_norm)", "#4c78a8");
  const rightPanel = renderPanel("lm", "Normalización por landmarks (*_lm)", "#54a24b");
  
  return html`<div style="display: flex; gap: 10px; justify-content: center;">
    ${leftPanel}
    ${rightPanel}
  </div>
  <div style="margin-top: 12px; font-size: 0.85rem; color: #666; text-align: center;">
    <strong>Pantomografía:</strong> ${pantoId} 
    <span style="margin-left: 12px;">🔴 Landmarks condíleos (solo en *_lm)</span>
    <span style="margin-left: 12px;">● Dientes</span>
  </div>`;
}
