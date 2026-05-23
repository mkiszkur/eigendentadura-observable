/**
 * Diagrama Sankey del flujo de datos del dataset.
 * 
 * Visualiza cómo las 5.114 pantomografías se filtran a través de criterios
 * (FDI, landmarks, universo geométrico, corpus eigendentadura).
 */

import * as d3 from "d3";
import {sankey, sankeyLinkHorizontal} from "d3-sankey";

export function dataFlowSankey({width = 700, height = 350} = {}) {
  // Datos del flujo (hardcodeados desde especificacion_dataset.md)
  // Nodos: 0=Total, 1=Con FDI, 2=Sin FDI, 3=Con landmarks, 4=Sin landmarks,
  //        5=Universo geom (FDI ∧ landmarks), 6=Corpus eigendentadura
  const data = {
    nodes: [
      {id: 0, name: "Total pantos"},
      {id: 1, name: "Con FDI permanente"},
      {id: 2, name: "Sin FDI"},
      {id: 3, name: "Con landmarks condíleos"},
      {id: 4, name: "Sin landmarks"},
      {id: 5, name: "Universo geométrico\n(FDI ∧ landmarks)"},
      {id: 6, name: "Corpus eigendentadura\n(dentición permanente completa)"},
    ],
    links: [
      {source: 0, target: 1, value: 2782, label: "Con FDI"},
      {source: 0, target: 2, value: 2332, label: "Sin FDI"},
      {source: 0, target: 3, value: 2749, label: "Con landmarks"},
      {source: 0, target: 4, value: 2365, label: "Sin landmarks"},
      {source: 1, target: 5, value: 2704, label: "FDI ∧ landmarks"},
      {source: 5, target: 6, value: 853, label: "Dentición completa"},
    ],
  };
  
  // Ajustar para que d3-sankey funcione (indices en vez de ids)
  const nodeById = new Map(data.nodes.map(d => [d.id, d]));
  const sankeyData = {
    nodes: data.nodes.map(d => ({...d})),
    links: data.links.map(d => ({
      source: d.source,
      target: d.target,
      value: d.value,
      label: d.label,
    })),
  };
  
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font-family: sans-serif;");
  
  const generator = sankey()
    .nodeWidth(15)
    .nodePadding(20)
    .extent([[20, 20], [width - 20, height - 20]]);
  
  const {nodes, links} = generator(sankeyData);
  
  // Links (aristas)
  svg.append("g")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("fill", "none")
    .attr("stroke", d => {
      // Color según target
      if (d.target.id === 2 || d.target.id === 4) return "#e45756"; // Sin FDI/landmarks
      if (d.target.id === 5) return "#54a24b"; // Universo geométrico
      if (d.target.id === 6) return "#7b52ab"; // Eigendentadura
      return "#4c78a8";
    })
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("opacity", 0.5)
    .append("title")
    .text(d => `${d.label}: ${d.value.toLocaleString("es-AR")} pantos`);
  
  // Nodos (rectángulos)
  svg.append("g")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => {
      if (d.id === 0) return "#4c78a8";
      if (d.id === 2 || d.id === 4) return "#e45756";
      if (d.id === 5) return "#54a24b";
      if (d.id === 6) return "#7b52ab";
      return "#888";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .append("title")
    .text(d => `${d.name}\n${d.value ? d.value.toLocaleString("es-AR") + " pantos" : ""}`);
  
  // Labels de nodos
  svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .attr("dominant-baseline", "middle")
    .attr("font-size", 11)
    .attr("font-weight", "600")
    .attr("fill", "#333")
    .selectAll("tspan")
    .data(d => d.name.split("\n"))
    .join("tspan")
    .attr("x", function() {
      const d = d3.select(this.parentNode).datum();
      return d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6;
    })
    .attr("dy", (d, i) => i === 0 ? 0 : 12)
    .text(d => d);
  
  // Labels de valores
  svg.append("g")
    .selectAll("text.value")
    .data(nodes.filter(d => d.value))
    .join("text")
    .attr("class", "value")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y0 + d.y1) / 2 + (d.name.includes("\n") ? 18 : 12))
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .attr("font-size", 10)
    .attr("fill", "#666")
    .text(d => `n = ${d.value.toLocaleString("es-AR")}`);
  
  return svg.node();
}
