/**
 * Rosa polar (circular histogram) de la distribución de ángulos de un diente.
 *
 * Cada bin se dibuja como un "pétalo" radial. 90° = vertical (orientación
 * típica). Se muestran también la media ± std.
 *
 * Convención visual: 0° a la derecha (este), ángulos crecen antihorario.
 * La escala es radial → raíz cuadrada del count (más fiel al área).
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

/**
 * @param {Object} opts
 * @param {Object} opts.record - {fdi, quadrant, n, mean_angle, std_angle, histogram:[{angle,count}], bin_width}
 * @param {number} [opts.size=220]
 * @param {number} [opts.angleMin=60]
 * @param {number} [opts.angleMax=120]
 */
export function angleRose({record, size = 220, angleMin = 45, angleMax = 135, individualAngle = null, individualLabel = null, rotateToMean = true} = {}) {
  const R = size / 2 - 26;
  const cx = size / 2, cy = size / 2;
  const color = QUADRANT_COLORS[record.quadrant] || "#888";
  const bw = record.bin_width || 5;
  const maxCount = d3.max(record.histogram, d => d.count) || 1;
  const rScale = d3.scaleSqrt().domain([0, maxCount]).range([0, R]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, size, size])
    .attr("width", size).attr("height", size)
    .style("font-family", "var(--sans-serif, system-ui, sans-serif)")
    .style("overflow", "visible");

  const meanRotation = rotateToMean ? record.mean_angle - 90 : 0;
  const g = svg.append("g")
    .attr("transform", `translate(${cx},${cy}) rotate(${meanRotation})`);

  // Conversión de ángulos dentales (°, 90 = vertical) a radianes de pantalla.
  // 0° matemáticos = derecha. Queremos que "90° vertical" quede arriba
  // (−π/2 en pantalla donde y crece hacia abajo). Entonces:
  //   θpant = (90° − ángulo) convertido a rad, alineado en SVG con rotación.
  // Para simplificar: pintamos los sectores usando d3.arc con startAngle/endAngle
  // en radianes, donde 0 rad = arriba y crece en sentido horario (convención d3.arc).
  // Queremos "ángulo dental 90°" en 0 rad (arriba). Offset: startAngle = (90° − ang)·π/180
  const toArcRad = (deg) => ((90 - deg) * Math.PI) / 180;

  // Grilla circular con ticks radiales (counts)
  const ticks = rScale.ticks(4).filter(t => t > 0);
  g.selectAll("circle.grid").data(ticks).join("circle")
    .attr("class", "grid")
    .attr("r", d => rScale(d))
    .attr("fill", "none")
    .attr("stroke", "#e0e0e0").attr("stroke-width", 0.8);
  g.selectAll("text.tick").data(ticks).join("text")
    .attr("class", "tick")
    .attr("x", 3).attr("y", d => -rScale(d) - 2)
    .attr("font-size", 8).attr("fill", "#999")
    .text(d => d);

  // Líneas radiales cada 10°
  const radialAngles = d3.range(angleMin, angleMax + 1, 10);
  for (const a of radialAngles) {
    const rad = toArcRad(a);
    g.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", Math.sin(rad) * R).attr("y2", -Math.cos(rad) * R)
      .attr("stroke", a === 90 ? "#aaa" : "#eee")
      .attr("stroke-dasharray", a === 90 ? "3,2" : null)
      .attr("stroke-width", a === 90 ? 1 : 0.6);
    g.append("text")
      .attr("x", Math.sin(rad) * (R + 16))
      .attr("y", -Math.cos(rad) * (R + 16) + 3)
      .attr("text-anchor", "middle").attr("font-size", 8)
      .attr("fill", a === 90 ? "#555" : "#bbb")
      .text(`${a}°`);
  }

  // Sectores del histograma
  const arc = d3.arc();
  for (const b of record.histogram) {
    if (b.angle < angleMin - bw || b.angle > angleMax + bw) continue; // clip a rango visible
    const s = toArcRad(b.angle + bw / 2);
    const e = toArcRad(b.angle - bw / 2);
    g.append("path")
      .attr("d", arc({
        innerRadius: 0, outerRadius: rScale(b.count),
        startAngle: Math.min(s, e), endAngle: Math.max(s, e),
      }))
      .attr("fill", color).attr("opacity", 0.75)
      .attr("stroke", "#fff").attr("stroke-width", 0.6)
      .append("title").text(`${b.angle}° ± ${bw/2}°\nn = ${b.count}`);
  }

  // Media ± std como línea + banda
  const meanR = R + 2;
  const m = toArcRad(record.mean_angle);
  g.append("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", Math.sin(m) * meanR).attr("y2", -Math.cos(m) * meanR)
    .attr("stroke", "#222").attr("stroke-width", 1.6);
  // Banda ± 1 std (arco fino externo)
  const sBand = toArcRad(record.mean_angle + record.std_angle);
  const eBand = toArcRad(record.mean_angle - record.std_angle);
  g.append("path")
    .attr("d", arc({
      innerRadius: R + 3, outerRadius: R + 6,
      startAngle: Math.min(sBand, eBand), endAngle: Math.max(sBand, eBand),
    }))
    .attr("fill", "#222").attr("opacity", 0.4);

  // Marca del individuo (si se pasó): flecha roja del centro hasta el borde,
  // en el ángulo absoluto (mismo eje que el resto del gráfico).
  if (individualAngle != null && Number.isFinite(individualAngle)) {
    const indivRad = toArcRad(individualAngle);
    const r = R + 2;
    const x2 = Math.sin(indivRad) * r;
    const y2 = -Math.cos(indivRad) * r;
    g.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", x2).attr("y2", y2)
      .attr("stroke", "#e15759").attr("stroke-width", 2.2);
    g.append("circle")
      .attr("cx", x2).attr("cy", y2)
      .attr("r", 3.5).attr("fill", "#e15759");
  }

  // Título superior con stats (sin FDI: el contenedor ya lo trae).
  const summary = `μ=${record.mean_angle.toFixed(1)}°, σ=${record.std_angle.toFixed(1)}°, n=${record.n}`
    + (individualAngle != null && Number.isFinite(individualAngle)
        ? ` · ${individualLabel || "individuo"}=${individualAngle.toFixed(1)}°`
        : "");
  svg.append("text")
    .attr("x", cx).attr("y", size - 2)
    .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#666")
    .text(summary);

  return svg.node();
}

/**
 * Renderiza múltiples rosas en una grilla para los FDI seleccionados.
 * Si no hay selección, muestra todos los dientes presentes.
 */
export function angleRoseGrid({
  angleHistograms,
  selectedFdi = [],
  cellSize = 180,
  columns = 8,
  rotateToMean = true,
}) {
  const selSet = new Set(selectedFdi);
  const items = angleHistograms
    .filter(r => selSet.size === 0 || selSet.has(r.fdi))
    .sort((a, b) => a.fdi - b.fdi);

  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  container.style.gap = "8px";
  container.style.alignItems = "start";

  for (const r of items) {
    const wrap = document.createElement("div");
    wrap.style.textAlign = "center";
    wrap.appendChild(angleRose({record: r, size: cellSize, rotateToMean}));
    container.appendChild(wrap);
  }
  if (items.length === 0) {
    const msg = document.createElement("div");
    msg.style.gridColumn = `span ${columns}`;
    msg.style.textAlign = "center";
    msg.style.color = "#999";
    msg.style.padding = "40px 0";
    msg.textContent = "Seleccioná uno o más dientes para ver su distribución angular.";
    container.appendChild(msg);
  }
  return container;
}
