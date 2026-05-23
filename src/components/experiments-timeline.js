/**
 * Timeline interactivo de experimentos.
 * 
 * Visualiza los exp01-exp42 en un eje temporal con:
 * - Eje X: cronológico (fecha de cierre)
 * - Color: veredicto (adoptado/descartado/en curso)
 * - Altura: tipo (imputación FDI, landmarks, clustering, etc.)
 * - Hover: tooltip con métrica clave
 * - Click: link al cierre del experimento
 */

import * as Plot from "@observablehq/plot";

export function experimentsTimeline(data, {width = 900, height = 300, verdictoFilter = null, tipoFilter = null} = {}) {
  const experiments = data.experiments;
  
  // Filtrar si se pasa verdictoFilter o tipoFilter
  let filtered = experiments;
  if (verdictoFilter) {
    filtered = filtered.filter(d => d.veredicto === verdictoFilter);
  }
  if (tipoFilter) {
    filtered = filtered.filter(d => d.tipo === tipoFilter);
  }
  
  // Parsear fechas
  filtered = filtered.map(d => ({
    ...d,
    fecha_parsed: new Date(d.fecha),
  }));
  
  // Colores por veredicto
  const colorScale = {
    "adoptado": "#54a24b",
    "descartado": "#e45756",
    "en curso": "#f58518",
  };
  
  // Tipos únicos para el eje Y
  const tipos = [...new Set(filtered.map(d => d.tipo))].sort();
  
  return Plot.plot({
    width,
    height,
    marginLeft: 120,
    marginBottom: 60,
    x: {
      type: "time",
      label: "Fecha de cierre",
      grid: true,
    },
    y: {
      label: "Tipo de experimento",
      domain: tipos,
    },
    color: {
      domain: ["adoptado", "descartado", "en curso"],
      range: [colorScale["adoptado"], colorScale["descartado"], colorScale["en curso"]],
      legend: true,
    },
    marks: [
      Plot.dot(filtered, {
        x: "fecha_parsed",
        y: "tipo",
        fill: "veredicto",
        r: 8,
        stroke: "#fff",
        strokeWidth: 2,
        title: d => `Exp ${d.exp}: ${d.slug}\n${d.veredicto}\n${d.metrica_clave || "(sin métrica)"}`,
        tip: true,
      }),
      Plot.text(filtered, {
        x: "fecha_parsed",
        y: "tipo",
        text: d => `${d.exp}`,
        fontSize: 9,
        fontWeight: "600",
        fill: "#fff",
        dy: 1,
      }),
    ],
  });
}
