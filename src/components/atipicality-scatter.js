/**
 * Scatter atipicidad posicional vs angular.
 * Eje X = z_pos (desvío medio en cx/cy), Eje Y = z_ang (desvío medio en ángulo).
 * Cada punto = una pantomografía.
 */
import * as d3 from "d3";

export function atipicalityScatter(scores, {
  width = 680,
  height = 480,
  colorBy = "atipicidad",  // "origin" | "sex" | "atipicidad" | "n_teeth" | "n_pathologies"
  minTeeth = 10,
  maxTeeth = 32,
  selectedPanto = null,
  onClickPanto = null,
  threshold = null,        // z_mean umbral de outliers formales (para marcar en leyenda)
  highlightOutliers = false,
  zMeanRange = null,
  zPosRange = null,
  zAngRange = null,
  superSet = null,         // Set de archivo IDs con supernumerarios (null = no resaltar)
} = {}) {
  const data = scores.filter(d =>
    d.n_teeth >= minTeeth && d.n_teeth <= maxTeeth &&
    d.z_pos != null && d.z_ang != null &&
    (zMeanRange == null || (d.z_mean >= zMeanRange[0] && d.z_mean <= zMeanRange[1])) &&
    (zPosRange  == null || (d.z_pos  >= zPosRange[0]  && d.z_pos  <= zPosRange[1])) &&
    (zAngRange  == null || (d.z_ang  >= zAngRange[0]  && d.z_ang  <= zAngRange[1]))
  );

  const M = {top: 20, right: 170, bottom: 50, left: 55};
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;

  const xExt = d3.extent(data, d => d.z_pos);
  const yExt = d3.extent(data, d => d.z_ang);
  const pad = 0.3;
  const xScale = d3.scaleLinear().domain([xExt[0] - pad, xExt[1] + pad]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([yExt[0] - pad, yExt[1] + pad]).range([innerH, 0]);

  // ── Escalas de color ────────────────────────────────────────────────────
  const origins = [...new Set(data.map(d => d.data_origin).filter(Boolean))].sort();
  const sexes   = [...new Set(data.map(d => d.sex).filter(Boolean))].sort();
  const colorScaleOrig = d3.scaleOrdinal(["#4e79a7","#e15759","#59a14f","#f28e2b"]).domain(origins);
  const colorScaleSex  = d3.scaleOrdinal(["#4e79a7","#e15759"]).domain(sexes);

  // Atipicidad: escala continua YlOrRd (amarillo claro → naranja → rojo oscuro).
  // Los outliers son solo el extremo natural de la escala — sin salto de color.
  const maxZ = d3.max(data, d => d.z_mean);
  const colorScaleAtip = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxZ]);

  // N° dientes: RdYlBu invertido — dentadura completa (32) = azul, pocas piezas = rojo.
  const teethExt = d3.extent(data, d => d.n_teeth);
  const colorScaleTeeth = d3.scaleSequential(t => d3.interpolateRdYlBu(1 - t))
    .domain(teethExt);

  // N° patologías: YlOrRd — sin patología = amarillo, muchas = rojo.
  const pathData = data.filter(d => d.n_pathologies != null);
  const maxPath = d3.max(pathData, d => d.n_pathologies) ?? 6;
  const colorScalePath = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxPath]);

  function getColor(d) {
    if (colorBy === "origin") return colorScaleOrig(d.data_origin) ?? "#aaa";
    if (colorBy === "sex")    return d.sex ? colorScaleSex(d.sex) : "#ccc";
    if (colorBy === "atipicidad") return colorScaleAtip(d.z_mean ?? 0);
    if (colorBy === "n_teeth")    return colorScaleTeeth(d.n_teeth ?? teethExt[0]);
    if (colorBy === "n_pathologies") {
      if (d.n_pathologies == null) return "#ccc";
      return colorScalePath(d.n_pathologies);
    }
    return "#4c78a8";
  }

  // ── SVG base ────────────────────────────────────────────────────────────
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)");

  const defs = svg.append("defs");
  defs.append("clipPath").attr("id", "atip-clip")
    .append("rect").attr("width", innerW).attr("height", innerH);

  const gOuter = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const g = gOuter.append("g").attr("clip-path", "url(#atip-clip)");

  // Ejes
  gOuter.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("y1",-innerH));
  gOuter.append("g").call(d3.axisLeft(yScale).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",innerW));

  gOuter.append("text").attr("x", innerW/2).attr("y", innerH + 40)
    .attr("text-anchor","middle").attr("font-size",11).attr("fill","#666")
    .text("Atipicidad posicional (z_pos = desvío promedio en cx/cy)");
  gOuter.append("text").attr("transform","rotate(-90)").attr("x",-innerH/2).attr("y",-42)
    .attr("text-anchor","middle").attr("font-size",11).attr("fill","#666")
    .text("Atipicidad angular (z_ang = desvío promedio en ángulo)");

  // Etiquetas de cuadrantes
  [
    [0.05, 0.05,  "Típico (posición + ángulo)"],
    [0.65, 0.05,  "Atípico posicional"],
    [0.05, 0.82,  "Atípico angular"],
    [0.65, 0.82,  "Atípico (posición + ángulo)"],
  ].forEach(([rx, ry, label]) => {
    gOuter.append("text")
      .attr("x", innerW * rx).attr("y", innerH * ry + 12)
      .attr("font-size", 9).attr("fill", "#ccc").text(label);
  });

  // Líneas de referencia (medianas)
  const medX = d3.median(data, d => d.z_pos);
  const medY = d3.median(data, d => d.z_ang);
  g.append("line").attr("x1", xScale(medX)).attr("y1", 0).attr("x2", xScale(medX)).attr("y2", innerH)
    .attr("stroke","#bbb").attr("stroke-dasharray","4,3").attr("stroke-width",1);
  g.append("line").attr("x1", 0).attr("y1", yScale(medY)).attr("x2", innerW).attr("y2", yScale(medY))
    .attr("stroke","#bbb").attr("stroke-dasharray","4,3").attr("stroke-width",1);

  // Puntos — capa base (sombra de outlier, si aplica)
  if (threshold != null && highlightOutliers) {
    g.selectAll("circle.outlier-ring").data(data.filter(d => d.z_mean >= threshold)).join("circle")
      .attr("class", "outlier-ring")
      .attr("cx", d => xScale(d.z_pos))
      .attr("cy", d => yScale(d.z_ang))
      .attr("r", 4)
      .attr("fill", "none")
      .attr("stroke", "#e15759")
      .attr("stroke-width", 1.2)
      .attr("opacity", 0.6)
      .style("pointer-events", "none");
  }

  // Puntos con hover states (U-018: feedback interactivo consistente)
  g.selectAll("circle.dot").data(data).join("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.z_pos))
    .attr("cy", d => yScale(d.z_ang))
    .attr("r", d => selectedPanto === d.json_filename ? 5 : 1.5)
    .attr("fill", d => getColor(d))
    .attr("opacity", d => selectedPanto === d.json_filename ? 1 : 0.55)
    .attr("stroke", d => selectedPanto === d.json_filename ? "#222" : "none")
    .attr("stroke-width", 1.5)
    .style("cursor", onClickPanto ? "pointer" : "default")
    .on("mouseover", function(event, d) {
      if (selectedPanto !== d.json_filename) {
        d3.select(this).transition().duration(120).attr("r", 4.5).attr("opacity", 1);
      }
    })
    .on("mouseout", function(event, d) {
      if (selectedPanto !== d.json_filename) {
        d3.select(this).transition().duration(120).attr("r", 1.5).attr("opacity", 0.55);
      }
    })
    .on("click", onClickPanto ? (event, d) => { event.stopPropagation(); onClickPanto(d); } : null)
    .append("title").text(d =>
      `${d.json_filename}\n${d.data_origin ?? "–"} · ${d.sex ?? "–"} · ${d.n_teeth} dientes\nz_pos=${d.z_pos} · z_ang=${d.z_ang}` +
      (d.n_pathologies != null ? ` · ${d.n_pathologies} patologías` : "") +
      (onClickPanto ? "\n\nClic para ver detalle" : "")
    );

  // Marcador de supernumerarios: diamante naranja encima del punto
  if (superSet != null) {
    const geoIdRe = /database_original__(.+?)__json_url\.json/;
    const superData = data.filter(d => {
      const m = d.json_filename?.match(geoIdRe);
      return m && superSet.has(m[1]);
    });
    g.selectAll("path.super-marker").data(superData).join("path")
      .attr("class", "super-marker")
      .attr("transform", d => `translate(${xScale(d.z_pos)},${yScale(d.z_ang)})`)
      .attr("d", "M0,-4 L3,0 L0,4 L-3,0 Z")
      .attr("fill", "#f28e2b")
      .attr("stroke", "#c96a00")
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.85)
      .style("pointer-events", "none");
  }

  if (onClickPanto) {
    gOuter.append("text").attr("x", innerW).attr("y", -5)
      .attr("text-anchor","end").attr("font-size",9).attr("fill","#aaa")
      .text("Clic en un punto para ver la pantomografía");
  }

  // ── Leyenda ─────────────────────────────────────────────────────────────
  const lx = innerW + 16;

  if (colorBy === "origin" || colorBy === "sex") {
    const items = colorBy === "origin"
      ? origins.map(o => ({label: o, color: colorScaleOrig(o)}))
      : sexes.map(s => ({label: s, color: colorScaleSex(s)}));
    gOuter.append("text").attr("x", lx).attr("y", 10)
      .attr("font-size", 9).attr("fill", "#888").attr("font-weight","bold")
      .text(colorBy === "origin" ? "Centro" : "Sexo");
    items.forEach(({label, color}, i) => {
      gOuter.append("circle").attr("cx", lx + 5).attr("cy", 24 + i * 18)
        .attr("r", 5).attr("fill", color).attr("opacity", 0.8);
      gOuter.append("text").attr("x", lx + 14).attr("y", 28 + i * 18)
        .attr("font-size", 10).attr("fill", "#333").text(label ?? "N/A");
    });
  }

  if (colorBy === "atipicidad" || colorBy === "n_teeth" || colorBy === "n_pathologies") {
    const isAtip  = colorBy === "atipicidad";
    const isTeeth = colorBy === "n_teeth";
    const scale   = isAtip ? colorScaleAtip : isTeeth ? colorScaleTeeth : colorScalePath;
    const domain  = scale.domain();
    const label   = isAtip ? "z̄" : isTeeth ? "N° dientes" : "N° patologías";
    const gradId  = "seq-grad-legend";
    const barH = 90, barW = 12;

    const grad = defs.append("linearGradient").attr("id", gradId)
      .attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(t => {
      const v = domain[0] + t * (domain[1] - domain[0]);
      grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", scale(v));
    });

    gOuter.append("text").attr("x", lx).attr("y", 10)
      .attr("font-size", 9).attr("fill", "#888").attr("font-weight","bold").text(label);
    gOuter.append("rect").attr("x", lx).attr("y", 14)
      .attr("width", barW).attr("height", barH)
      .attr("fill", `url(#${gradId})`).attr("rx", 2);

    // Ticks: min, max
    const fmt = isAtip ? d3.format(".2f") : d3.format("d");
    gOuter.append("text").attr("x", lx + barW + 4).attr("y", 18)
      .attr("font-size", 9).attr("fill", "#555").text(fmt(domain[1]));
    gOuter.append("text").attr("x", lx + barW + 4).attr("y", 14 + barH)
      .attr("font-size", 9).attr("fill", "#555").text(fmt(domain[0]));

    // Marca del umbral de outliers (solo en modo atipicidad)
    if (isAtip && threshold != null) {
      const ty = 14 + barH * (1 - (threshold - domain[0]) / (domain[1] - domain[0]));
      gOuter.append("line")
        .attr("x1", lx - 4).attr("x2", lx + barW + 4)
        .attr("y1", ty).attr("y2", ty)
        .attr("stroke", "#333").attr("stroke-width", 1.5).attr("stroke-dasharray","3,2");
      gOuter.append("text").attr("x", lx + barW + 4).attr("y", ty - 2)
        .attr("font-size", 8).attr("fill", "#666").text(`${fmt(threshold)} (outlier)`);
    }

    // Nota sin datos (n_pathologies)
    if (colorBy === "n_pathologies") {
      const nMissing = data.length - pathData.length;
      if (nMissing > 0) {
        gOuter.append("circle").attr("cx", lx + 5).attr("cy", 14 + barH + 18).attr("r", 5).attr("fill", "#ccc");
        gOuter.append("text").attr("x", lx + 14).attr("y", 14 + barH + 22)
          .attr("font-size", 9).attr("fill", "#888").text(`Sin dato (${nMissing})`);
      }
    }
  }

  return svg.node();
}
