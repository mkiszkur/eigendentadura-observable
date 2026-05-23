/**
 * Mapa conceptual interactivo con force-directed graph.
 * 
 * Visualiza relaciones entre conceptos clave: FDI, landmarks, eigendentadura,
 * PCA, preguntas P1-P5, etc.
 * 
 * - Nodos: color por categoría (dominio/método/dato/pregunta/infraestructura)
 * - Aristas: relaciones semánticas
 * - Hover: tooltip con definición del glosario
 * - Drag: reorganizar nodos
 */

import * as d3 from "d3";

export function conceptMap(data, {width = 800, height = 600} = {}) {
  const nodes = data.nodes.map(d => ({...d}));
  const links = data.edges.map(d => ({...d}));
  
  // Colores por categoría
  const colorScale = {
    "dominio": "#4c78a8",
    "método": "#54a24b",
    "dato": "#f58518",
    "pregunta": "#7b52ab",
    "infraestructura": "#888",
  };
  
  // Tooltip
  const tooltip = d3.select(document.body).append("div")
    .attr("class", "concept-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "10px 14px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("max-width", "320px")
    .style("line-height", "1.5");
  
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font-family: sans-serif; border: 1px solid #ddd; border-radius: 4px;");
  
  // Simulación de fuerzas
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(30));
  
  // Aristas
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .append("title")
    .text(d => d.rel);
  
  // Nodos
  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));
  
  node.append("circle")
    .attr("r", d => d.category === "pregunta" ? 18 : 14)
    .attr("fill", d => colorScale[d.category] || "#888")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .style("cursor", "pointer");
  
  node.append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", d => d.category === "pregunta" ? 10 : 9)
    .attr("font-weight", "600")
    .attr("fill", "#fff")
    .attr("pointer-events", "none")
    .text(d => d.label);
  
  // Hover
  node.on("mouseover", function(event, d) {
    d3.select(this).select("circle")
      .attr("stroke", "#000")
      .attr("stroke-width", 3);
    
    tooltip
      .html(`
        <strong style="color:#fff;">${d.label}</strong>
        <br><span style="font-size:10px; color:#aaa;">${d.category}</span>
        <br><br>${d.def}
      `)
      .style("visibility", "visible")
      .style("top", (event.pageY + 10) + "px")
      .style("left", (event.pageX + 10) + "px");
  })
  .on("mousemove", function(event) {
    tooltip
      .style("top", (event.pageY + 10) + "px")
      .style("left", (event.pageX + 10) + "px");
  })
  .on("mouseout", function() {
    d3.select(this).select("circle")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
    tooltip.style("visibility", "hidden");
  });
  
  // Actualizar posiciones
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });
  
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  
  // Leyenda
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 140}, 20)`);
  
  const categories = [
    {key: "dominio", label: "Dominio"},
    {key: "método", label: "Método"},
    {key: "dato", label: "Dato"},
    {key: "pregunta", label: "Pregunta"},
    {key: "infraestructura", label: "Infraestructura"},
  ];
  
  legend.selectAll("g")
    .data(categories)
    .join("g")
    .attr("transform", (d, i) => `translate(0, ${i * 18})`)
    .call(g => {
      g.append("circle")
        .attr("r", 5)
        .attr("fill", d => colorScale[d.key]);
      
      g.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("dominant-baseline", "middle")
        .attr("font-size", 10)
        .attr("fill", "#333")
        .text(d => d.label);
    });
  
  // Cleanup
  svg.node().addEventListener("remove", () => tooltip.remove());
  
  return svg.node();
}
