/**
 * Visualizaciones de patologías por pieza FDI.
 *
 * Usa prevalence_by_tooth.json:
 *   { n_dentitions, pathologies: string[], teeth: [{fdi, n_present, Patología: {count,prevalence}}] }
 */
import * as d3 from "d3";

const FDI_ORDER = [
  18,17,16,15,14,13,12,11,  21,22,23,24,25,26,27,28,
  48,47,46,45,44,43,42,41,  31,32,33,34,35,36,37,38,
];

const TOOTH_TYPE = fdi => {
  const n = fdi % 10;
  if (n >= 1 && n <= 2) return "Incisivo";
  if (n === 3)           return "Canino";
  if (n >= 4 && n <= 5) return "Premolar";
  return "Molar";
};

// Paleta secuencial para el heatmap de prevalencias
// NOTA (U-016 revisión UX 2026-05-21): Usamos paleta **secuencial**
// (blanco → azul oscuro) para codificar **magnitud** (prevalencia %),
// no paleta **cualitativa** (un color por patología).
//
// Contexto: el heatmap responde a una tarea visual de **magnitude**
// (¿qué tan frecuente es X patología en Y diente?), no de **identify**
// (¿qué patología tiene este diente?). La intensidad del azul comunica
// directamente la prevalencia sin requerir decodificación de leyenda.
//
// Esto difiere del modal individual (panto-modal.js), que usa color
// monocromático (naranja) para badges de patologías porque su contexto
// es identify/compare por diente. Ambas decisiones son intencionales
// y responden a tareas visuales distintas. Ver Munzner (2014) cap. 10.
//
const heatColor = d3.scaleSequential(d3.interpolateBlues).domain([0, 0.25]);

/**
 * Heatmap FDI (filas) × patología (columnas), celdas = prevalencia %.
 */
export function fdiPathologyHeatmap(prevalenceData, {
  width = 720,
  selectedPathologies = null,  // null = todas
} = {}) {
  const {n_dentitions, pathologies, teeth} = prevalenceData;

  // Filtrar patologías seleccionadas
  const paths = selectedPathologies
    ? pathologies.filter(p => selectedPathologies.includes(p))
    : pathologies;

  // Ordenar dientes según FDI_ORDER
  const teethMap = new Map(teeth.map(t => [t.fdi, t]));
  const orderedTeeth = FDI_ORDER.map(fdi => teethMap.get(fdi)).filter(Boolean);

  const CELL_H = 14, CELL_W = Math.max(28, Math.floor((width - 80) / paths.length));
  const LABEL_W = 36, LABEL_H = 90;
  const innerH = orderedTeeth.length * CELL_H;
  const height = LABEL_H + innerH + 40;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const g = svg.append("g").attr("transform", `translate(${LABEL_W},${LABEL_H})`);

  // Column headers (rotated)
  paths.forEach((p, pi) => {
    svg.append("text")
      .attr("transform", `translate(${LABEL_W + pi * CELL_W + CELL_W / 2},${LABEL_H - 4}) rotate(-55)`)
      .attr("text-anchor", "start").attr("font-size", 9.5).attr("fill", "#333")
      .text(p);
  });

  // Row: one per FDI
  orderedTeeth.forEach((tooth, ti) => {
    const y = ti * CELL_H;
    const q = Math.floor(tooth.fdi / 10);
    const qColor = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"}[q] || "#888";

    // FDI label
    svg.append("text")
      .attr("x", LABEL_W - 4).attr("y", LABEL_H + y + CELL_H / 2 + 4)
      .attr("text-anchor", "end").attr("font-size", 9).attr("fill", qColor)
      .text(tooth.fdi);

    // Separator between upper/lower jaw
    if (ti === 16) {
      g.append("line")
        .attr("x1", 0).attr("y1", y).attr("x2", paths.length * CELL_W).attr("y2", y)
        .attr("stroke", "#999").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,2");
    }

    paths.forEach((p, pi) => {
      const val = tooth[p]?.prevalence ?? 0;
      const x = pi * CELL_W;
      g.append("rect")
        .attr("x", x).attr("y", y)
        .attr("width", CELL_W - 1).attr("height", CELL_H - 1)
        .attr("fill", heatColor(val)).attr("rx", 1)
        .append("title")
        .text(`FDI ${tooth.fdi} · ${p}\n${(val * 100).toFixed(1)}% (${tooth[p]?.count ?? 0} / ${tooth.n_present})`);

      if (val > 0.05 && CELL_W > 30) {
        g.append("text")
          .attr("x", x + CELL_W / 2).attr("y", y + CELL_H / 2 + 3)
          .attr("text-anchor", "middle").attr("font-size", 7.5)
          .attr("fill", val > 0.15 ? "white" : "#333")
          .text(`${(val * 100).toFixed(0)}%`);
      }
    });
  });

  // Color legend
  const legendW = 120, legendX = LABEL_W + paths.length * CELL_W + 16, legendY = LABEL_H;
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "heat-grad").attr("x1","0%").attr("x2","0%").attr("y1","0%").attr("y2","100%");
  grad.append("stop").attr("offset","0%").attr("stop-color", heatColor(0.25));
  grad.append("stop").attr("offset","100%").attr("stop-color", heatColor(0));
  svg.append("rect").attr("x", legendX).attr("y", legendY).attr("width", 10).attr("height", 60)
    .attr("fill", "url(#heat-grad)");
  ["25%", "0%"].forEach((t, i) => {
    svg.append("text").attr("x", legendX + 13).attr("y", legendY + i * 60 + 4)
      .attr("font-size", 8).attr("fill", "#555").text(t);
  });

  return svg.node();
}

const FDI_SUPERIOR = new Set([11,12,13,14,15,16,17,18, 21,22,23,24,25,26,27,28]);
const FDI_INFERIOR = new Set([31,32,33,34,35,36,37,38, 41,42,43,44,45,46,47,48]);

function aggregateByType(teeth, selectedPathologies, fdiFilter = null) {
  const types = ["Incisivo", "Canino", "Premolar", "Molar"];
  const byType = {};
  for (const type of types) byType[type] = {n: 0, counts: {}};
  for (const tooth of teeth) {
    if (fdiFilter && !fdiFilter.has(tooth.fdi)) continue;
    const type = TOOTH_TYPE(tooth.fdi);
    if (!byType[type]) continue;
    byType[type].n += tooth.n_present;
    for (const p of selectedPathologies) {
      byType[type].counts[p] = (byType[type].counts[p] ?? 0) + (tooth[p]?.count ?? 0);
    }
  }
  return byType;
}

function buildFlatData(byType, selectedPathologies) {
  const types = ["Incisivo", "Canino", "Premolar", "Molar"];
  const data = [];
  for (const p of selectedPathologies) {
    for (const type of types) {
      data.push({
        pathology: p, type,
        pct: byType[type].n > 0 ? byType[type].counts[p] / byType[type].n : 0,
      });
    }
  }
  return data;
}

function renderBarPanel(svg, data, selectedPathologies, xScale, {offsetX, innerW, innerH, top, left, showYLabels}) {
  const types = ["Incisivo", "Canino", "Premolar", "Molar"];
  const TYPE_COLOR = {Incisivo: "#4e79a7", Canino: "#59a14f", Premolar: "#f28e2b", Molar: "#e15759"};
  const BAR_H = 14, SUB_GAP = 3, GRP_GAP = 14;
  const GRP_H = types.length * BAR_H + (types.length - 1) * SUB_GAP;

  const g = svg.append("g").attr("transform", `translate(${offsetX + left},${top})`);

  g.append("g")
    .call(d3.axisTop(xScale).ticks(4).tickFormat(d => `${(d * 100).toFixed(0)}%`))
    .call(ax => ax.select(".domain").remove())
    .call(ax => ax.selectAll(".tick line").attr("stroke", "#eee").attr("y2", innerH));

  selectedPathologies.forEach((p, pi) => {
    const groupY = pi * (GRP_H + GRP_GAP);

    if (showYLabels) {
      svg.append("text")
        .attr("x", offsetX + left - 8).attr("y", top + groupY + GRP_H / 2 + 4)
        .attr("text-anchor", "end").attr("font-size", 11).attr("fill", "#333")
        .text(p);
    }

    types.forEach((type, ti) => {
      const d = data.find(r => r.pathology === p && r.type === type);
      const barY = groupY + ti * (BAR_H + SUB_GAP);
      const barW = xScale(d?.pct ?? 0);

      g.append("rect")
        .attr("x", 0).attr("y", barY)
        .attr("width", barW).attr("height", BAR_H)
        .attr("fill", TYPE_COLOR[type]).attr("rx", 2).attr("opacity", 0.82)
        .append("title").text(`${p} · ${type}\n${((d?.pct ?? 0) * 100).toFixed(1)}%`);

      if (barW > 28) {
        g.append("text")
          .attr("x", barW + 3).attr("y", barY + BAR_H / 2 + 4)
          .attr("font-size", 9).attr("fill", "#666")
          .text(`${((d?.pct ?? 0) * 100).toFixed(1)}%`);
      }
    });

    if (pi < selectedPathologies.length - 1) {
      g.append("line")
        .attr("x1", 0).attr("y1", groupY + GRP_H + GRP_GAP / 2)
        .attr("x2", innerW).attr("y2", groupY + GRP_H + GRP_GAP / 2)
        .attr("stroke", "#f0f0f0");
    }
  });
}

/**
 * Gráfico de barras horizontales agrupado: prevalencia por tipo de diente y patología.
 * Eje Y = patologías seleccionadas; dentro de cada grupo, una barra por tipo de pieza.
 * splitByArch=true muestra paneles Superior / Inferior lado a lado.
 */
export function prevalenceByToothType(prevalenceData, selectedPathologies, {width = 700, splitByArch = false} = {}) {
  const {teeth} = prevalenceData;
  const types = ["Incisivo", "Canino", "Premolar", "Molar"];
  const TYPE_COLOR = {Incisivo: "#4e79a7", Canino: "#59a14f", Premolar: "#f28e2b", Molar: "#e15759"};

  const BAR_H   = 14;
  const SUB_GAP = 3;
  const GRP_GAP = 14;
  const GRP_H   = types.length * BAR_H + (types.length - 1) * SUB_GAP;
  const nPaths  = selectedPathologies.length;
  const LEG_W   = 100;
  const LBL_W   = 168;
  const innerH  = nPaths * (GRP_H + GRP_GAP) - GRP_GAP;

  if (!splitByArch) {
    const byType = aggregateByType(teeth, selectedPathologies);
    const data = buildFlatData(byType, selectedPathologies);

    const M      = {top: 20, right: LEG_W + 12, bottom: 10, left: LBL_W};
    const innerW = width - M.left - M.right;
    const height = innerH + M.top + M.bottom;
    const xScale = d3.scaleLinear().domain([0, d3.max(data, d => d.pct)]).range([0, innerW]).nice();

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", "100%")
      .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

    renderBarPanel(svg, data, selectedPathologies, xScale, {
      offsetX: 0, innerW, innerH, top: M.top, left: M.left, showYLabels: true,
    });

    // Legend
    const g = svg.append("g").attr("transform", `translate(${M.left + innerW + 16},${M.top})`);
    types.forEach((type, i) => {
      g.append("rect").attr("x", 0).attr("y", i * 18).attr("width", 12).attr("height", 12)
        .attr("fill", TYPE_COLOR[type]).attr("opacity", 0.82);
      g.append("text").attr("x", 16).attr("y", i * 18 + 10)
        .attr("font-size", 10).attr("fill", "#333").text(type);
    });

    return svg.node();
  }

  // Split by arch: two panels side by side
  const PANEL_GAP = 24;
  const panelW = Math.floor((width - LBL_W - PANEL_GAP - LEG_W - 12) / 2);
  const totalW = LBL_W + panelW + PANEL_GAP + panelW + 12 + LEG_W;
  const M = {top: 32, right: 0, bottom: 10, left: LBL_W};
  const height = innerH + M.top + M.bottom;

  const supData = buildFlatData(aggregateByType(teeth, selectedPathologies, FDI_SUPERIOR), selectedPathologies);
  const infData = buildFlatData(aggregateByType(teeth, selectedPathologies, FDI_INFERIOR), selectedPathologies);

  const xMax = d3.max([...supData, ...infData], d => d.pct);
  const xScale = d3.scaleLinear().domain([0, xMax]).range([0, panelW]).nice();

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, totalW, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  // Panel titles
  ["Arcada superior", "Arcada inferior"].forEach((label, i) => {
    svg.append("text")
      .attr("x", LBL_W + i * (panelW + PANEL_GAP) + panelW / 2)
      .attr("y", 14)
      .attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", "600").attr("fill", "#444")
      .text(label);
  });

  renderBarPanel(svg, supData, selectedPathologies, xScale, {
    offsetX: 0, innerW: panelW, innerH, top: M.top, left: LBL_W, showYLabels: true,
  });
  renderBarPanel(svg, infData, selectedPathologies, xScale, {
    offsetX: LBL_W + panelW + PANEL_GAP, innerW: panelW, innerH, top: M.top, left: 0, showYLabels: false,
  });

  // Vertical divider between panels
  svg.append("line")
    .attr("x1", LBL_W + panelW + PANEL_GAP / 2).attr("y1", M.top - 8)
    .attr("x2", LBL_W + panelW + PANEL_GAP / 2).attr("y2", M.top + innerH)
    .attr("stroke", "#ddd").attr("stroke-width", 1);

  // Legend
  const lx = LBL_W + panelW + PANEL_GAP + panelW + 16;
  const lg = svg.append("g").attr("transform", `translate(${lx},${M.top})`);
  types.forEach((type, i) => {
    lg.append("rect").attr("x", 0).attr("y", i * 18).attr("width", 12).attr("height", 12)
      .attr("fill", TYPE_COLOR[type]).attr("opacity", 0.82);
    lg.append("text").attr("x", 16).attr("y", i * 18 + 10)
      .attr("font-size", 10).attr("fill", "#333").text(type);
  });

  return svg.node();
}
