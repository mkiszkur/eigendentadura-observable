/**
 * Infografía interactiva del pipeline ETL.
 * 
 * Muestra los 39 stages del pipeline como un flujo visual con:
 * - Hover: tooltip con nombre, inputs, outputs, LOC
 * - Click: link al archivo en GitHub
 * - Agrupación por familia (00-09: ETL, 10-19: Features, 20-29: Observable, etc.)
 */

import * as d3 from "d3";

export function pipelineInfographic(data, {width = 900, height = 400} = {}) {
  const stages = data.stages;
  
  // Agrupar stages por familia (decenas)
  const groups = [
    {range: [0, 9], label: "ETL", color: "#4c78a8"},
    {range: [10, 19], label: "Features", color: "#54a24b"},
    {range: [20, 29], label: "Observable", color: "#f58518"},
    {range: [30, 49], label: "Análisis", color: "#e45756"},
    {range: [50, 59], label: "Eigendentadura", color: "#7b52ab"},
    {range: [60, 94], label: "Morfometría", color: "#9c755f"},
    {range: [95, 99], label: "Figuras", color: "#bab0ac"},
  ];
  
  // Asignar grupo a cada stage
  stages.forEach(s => {
    const group = groups.find(g => s.stage >= g.range[0] && s.stage <= g.range[1]);
    s.group = group ? group.label : "Otro";
    s.groupColor = group ? group.color : "#888";
  });
  
  // Layout: disponer stages en filas por grupo
  const stageHeight = 24;
  const stageWidth = 120;
  const groupPadding = 40;
  const stagePadding = 4;
  
  let yOffset = 20;
  const groupedStages = d3.group(stages, d => d.group);
  
  groupedStages.forEach((groupStages, groupName) => {
    const group = groups.find(g => g.label === groupName);
    groupStages.forEach((stage, i) => {
      stage.x = 20 + (i % 7) * (stageWidth + stagePadding);
      stage.y = yOffset + Math.floor(i / 7) * (stageHeight + stagePadding);
    });
    yOffset += Math.ceil(groupStages.length / 7) * (stageHeight + stagePadding) + groupPadding;
  });
  
  const adjustedHeight = Math.max(height, yOffset + 20);
  
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, adjustedHeight])
    .attr("style", "max-width: 100%; height: auto; font-family: sans-serif;");
  
  // Grupos de fondo
  groupedStages.forEach((groupStages, groupName) => {
    const group = groups.find(g => g.label === groupName);
    if (!group) return;
    
    const xMin = d3.min(groupStages, d => d.x);
    const xMax = d3.max(groupStages, d => d.x);
    const yMin = d3.min(groupStages, d => d.y);
    const yMax = d3.max(groupStages, d => d.y);
    
    svg.append("rect")
      .attr("x", xMin - 5)
      .attr("y", yMin - 20)
      .attr("width", xMax - xMin + stageWidth + 10)
      .attr("height", yMax - yMin + stageHeight + 25)
      .attr("fill", group.color)
      .attr("opacity", 0.08)
      .attr("rx", 4);
    
    svg.append("text")
      .attr("x", xMin)
      .attr("y", yMin - 8)
      .attr("font-size", 11)
      .attr("font-weight", "600")
      .attr("fill", group.color)
      .text(group.label);
  });
  
  // Tooltip
  const tooltip = d3.select(document.body).append("div")
    .attr("class", "pipeline-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("max-width", "300px")
    .style("line-height", "1.4");
  
  // Stages como rectángulos
  const stageGroups = svg.selectAll("g.stage")
    .data(stages)
    .join("g")
    .attr("class", "stage")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).select("rect").attr("stroke", "#000").attr("stroke-width", 2);
      
      const inputsText = d.inputs.length > 0 
        ? d.inputs.map(i => `• ${i.path}${i.note ? ` (${i.note})` : ""}`).join("<br>")
        : "(ninguno)";
      const outputsText = d.outputs.length > 0
        ? d.outputs.map(o => `• ${o.path}${o.note ? ` (${o.note})` : ""}`).join("<br>")
        : "(ninguno)";
      
      tooltip
        .html(`
          <strong>Stage ${d.stage}: ${d.name}</strong><br>
          <span style="font-size:10px; color:#aaa;">${d.description || "(sin descripción)"}</span><br>
          <strong style="margin-top:4px; display:block;">Inputs:</strong>
          <span style="font-size:10px;">${inputsText}</span><br>
          <strong style="margin-top:4px; display:block;">Outputs:</strong>
          <span style="font-size:10px;">${outputsText}</span><br>
          <span style="font-size:10px; color:#aaa; margin-top:4px; display:block;">LOC: ${d.loc}</span>
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
      d3.select(this).select("rect").attr("stroke", "#fff").attr("stroke-width", 1);
      tooltip.style("visibility", "hidden");
    })
    .on("click", function(event, d) {
      const url = `https://github.com/mkiszkur/Tesis/blob/main/pipeline/${d.filename}`;
      window.open(url, "_blank");
    });
  
  stageGroups.append("rect")
    .attr("width", stageWidth)
    .attr("height", stageHeight)
    .attr("fill", d => d.groupColor)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .attr("rx", 3);
  
  stageGroups.append("text")
    .attr("x", stageWidth / 2)
    .attr("y", stageHeight / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", 11)
    .attr("font-weight", "600")
    .attr("fill", "#fff")
    .text(d => `${d.stage}`);
  
  stageGroups.append("text")
    .attr("x", stageWidth / 2)
    .attr("y", stageHeight + 12)
    .attr("text-anchor", "middle")
    .attr("font-size", 9)
    .attr("fill", "#666")
    .text(d => d.name.length > 15 ? d.name.substring(0, 13) + "..." : d.name);
  
  // Cleanup al remover
  svg.node().addEventListener("remove", () => tooltip.remove());
  
  return svg.node();
}
