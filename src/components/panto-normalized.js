/**
 * Renderizador de pantomografía en espacio normalizado por landmarks.
 *
 * Aplica la transformada forward (pixel → landmark-normalized):
 *   1. Traslación al punto medio intercondíleo
 *   2. Rotación para alinear eje intercondíleo con horizontal
 *   3. Escalado por distancia intercondílea
 *
 * Permite superponer hasta 2 pantos en el mismo espacio.
 */
import * as d3 from "d3";

const PANTO_COLORS = ["#4e79a7", "#e15759"];
const EIGEN_COLOR = "#888";

/**
 * Compute landmark frame from shapes array.
 * Returns {ox, oy, scale, angle, cos_a, sin_a} or null if condyles missing.
 *
 * When duplicate condylar landmarks exist (e.g. two l2), resolves by
 * spatial position: L1/L6 → min X (left condyle), L2/L7 → max X (right).
 */
function computeLandmarkFrame(shapes) {
  // Collect ALL candidates per label (may have duplicates)
  const candidates = {};
  for (const s of shapes) {
    if (s.et === "landmark" && s.c && s.l) {
      const key = s.l.toLowerCase();
      if (!candidates[key]) candidates[key] = [];
      candidates[key].push(s.c);
    }
  }

  // Resolve duplicates by spatial position
  const lmMap = {};
  for (const [key, coords] of Object.entries(candidates)) {
    if (coords.length === 1) {
      lmMap[key] = coords[0];
    } else {
      // L1/L6 = left condyle → pick min X; L2/L7 = right condyle → pick max X
      if (key === "l1" || key === "l6") {
        lmMap[key] = coords.reduce((a, b) => a[0] <= b[0] ? a : b);
      } else {
        lmMap[key] = coords.reduce((a, b) => a[0] >= b[0] ? a : b);
      }
    }
  }

  if (!lmMap["l1"] || !lmMap["l6"] || !lmMap["l2"] || !lmMap["l7"]) return null;

  const lc_x = (lmMap["l1"][0] + lmMap["l6"][0]) / 2;
  const lc_y = (lmMap["l1"][1] + lmMap["l6"][1]) / 2;
  const rc_x = (lmMap["l2"][0] + lmMap["l7"][0]) / 2;
  const rc_y = (lmMap["l2"][1] + lmMap["l7"][1]) / 2;

  const ox = (lc_x + rc_x) / 2;
  const oy = (lc_y + rc_y) / 2;
  const dx = rc_x - lc_x;
  const dy = rc_y - lc_y;
  const scale = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return { ox, oy, scale, angle, cos_a: Math.cos(angle), sin_a: Math.sin(angle) };
}

/**
 * Forward transform: pixel → normalized
 *   translate(-origin) → rotate(-angle) → scale(1/scale)
 */
function pixelToNorm(frame, px, py) {
  const dx = px - frame.ox;
  const dy = py - frame.oy;
  const rx = dx * frame.cos_a + dy * frame.sin_a;   // rotate(-angle)
  const ry = -dx * frame.sin_a + dy * frame.cos_a;
  return [rx / frame.scale, ry / frame.scale];
}

/**
 * Transform all geometry in a panto to normalized coords.
 */
function transformShapes(shapes, frame) {
  return shapes.map(s => {
    const out = { ...s };
    if (s.c) out.c = pixelToNorm(frame, s.c[0], s.c[1]);
    if (s.pg) out.pg = s.pg.map(p => pixelToNorm(frame, p[0], p[1]));
    if (s.mb) out.mb = s.mb.map(p => pixelToNorm(frame, p[0], p[1]));
    if (s.b) {
      // Transform bbox corners and recompute
      const [bx, by, bw, bh] = s.b;
      const tl = pixelToNorm(frame, bx, by);
      const br = pixelToNorm(frame, bx + bw, by + bh);
      out.b = [Math.min(tl[0], br[0]), Math.min(tl[1], br[1]),
               Math.abs(br[0] - tl[0]), Math.abs(br[1] - tl[1])];
    }
    return out;
  });
}

/**
 * @param {HTMLElement} container
 * @param {Object|null} pantoData1 - first panto geometry JSON
 * @param {Object|null} pantoData2 - second panto geometry JSON (optional, for overlay)
 * @param {Object} options
 */
export function pantoNormalized(container, pantoData1, pantoData2 = null, options = {}) {
  const {
    showPolygon = true,
    showCentroids = false,
    showLabels = true,
    showEigendentadura = true,
    eigendentaduraStats = null,
    selectedTeeth = null,
    label1 = "Panto A",
    label2 = "Panto B",
  } = options;

  container.innerHTML = "";

  // ViewBox in normalized coords (with padding)
  const vbX = -0.50, vbY = -0.08, vbW = 1.00, vbH = 0.50;

  const maxWidth = 900;
  const aspect = vbH / vbW;
  const width = maxWidth;
  const height = width * aspect;

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`)
    .attr("width", width)
    .attr("height", height)
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("background", "#fafafa");

  const g = svg.append("g");

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);
  svg.on("dblclick.zoom", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));

  const toothFilter = selectedTeeth ? new Set(selectedTeeth) : null;

  // ── Reference grid ──
  const gridG = g.append("g").attr("class", "grid");
  // Origin crosshair
  gridG.append("line")
    .attr("x1", -0.5).attr("y1", 0).attr("x2", 0.5).attr("y2", 0)
    .attr("stroke", "#e0e0e0").attr("stroke-width", 0.002);
  gridG.append("line")
    .attr("x1", 0).attr("y1", -0.1).attr("x2", 0).attr("y2", 0.5)
    .attr("stroke", "#e0e0e0").attr("stroke-width", 0.002);
  // Origin label
  gridG.append("text")
    .attr("x", 0.005).attr("y", -0.01)
    .text("O (midpoint intercondíleo)")
    .attr("font-size", 0.016).attr("fill", "#ccc");

  // ── Eigendentadura (background, drawn first) ──
  if (showEigendentadura && eigendentaduraStats && eigendentaduraStats.length > 0) {
    const eigenG = g.append("g").attr("class", "eigendentadura");
    for (const stat of eigendentaduraStats) {
      if (toothFilter && !toothFilter.has(stat.fdi)) continue;
      const mx = stat.mean_x, my = stat.mean_y;

      // 1σ ellipse (already in normalized coords, no rotation needed — axes aligned)
      const nPts = 48;
      const pts = [];
      for (let i = 0; i <= nPts; i++) {
        const t = (i / nPts) * 2 * Math.PI;
        pts.push([mx + stat.std_x * Math.cos(t), my + stat.std_y * Math.sin(t)]);
      }
      eigenG.append("path")
        .attr("d", d3.line()(pts))
        .attr("fill", EIGEN_COLOR).attr("fill-opacity", 0.08)
        .attr("stroke", EIGEN_COLOR)
        .attr("stroke-width", 0.002)
        .attr("stroke-dasharray", "0.006,0.004")
        .attr("opacity", 0.6);

      eigenG.append("circle")
        .attr("cx", mx).attr("cy", my)
        .attr("r", 0.005)
        .attr("fill", EIGEN_COLOR).attr("opacity", 0.5);

      eigenG.append("text")
        .attr("x", mx).attr("y", my + 0.004)
        .attr("text-anchor", "middle")
        .attr("font-size", 0.012)
        .attr("fill", "#999")
        .text(String(stat.fdi));
    }
  }

  // ── Draw pantos ──
  const pantos = [
    { data: pantoData1, color: PANTO_COLORS[0], label: label1 },
    { data: pantoData2, color: PANTO_COLORS[1], label: label2 },
  ];

  for (let pi = 0; pi < pantos.length; pi++) {
    const { data, color, label } = pantos[pi];
    if (!data) continue;

    const frame = computeLandmarkFrame(data.shapes);
    if (!frame) {
      // Can't normalize — skip with warning
      g.append("text")
        .attr("x", vbX + 0.02).attr("y", vbY + 0.04 + pi * 0.025)
        .text(`⚠ ${label}: sin landmarks condíleos`)
        .attr("font-size", 0.018).attr("fill", color);
      continue;
    }

    const normShapes = transformShapes(data.shapes, frame);
    const visible = normShapes.filter(s => {
      if (s.et !== "tooth" || s.es !== "tooth") return false;
      if (toothFilter && s.tn != null && !toothFilter.has(s.tn)) return false;
      return true;
    });

    const pantoG = g.append("g").attr("class", `panto-${pi}`);

    // Polygons
    if (showPolygon) {
      for (const s of visible) {
        if (!s.pg || s.pg.length < 3) continue;
        const pathData = "M" + s.pg.map(p => p.join(",")).join("L") + "Z";
        pantoG.append("path")
          .attr("d", pathData)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 0.003)
          .attr("opacity", pi === 0 ? 0.7 : 0.5);
      }
    }

    // Centroids
    if (showCentroids) {
      for (const s of visible) {
        if (!s.c) continue;
        pantoG.append("circle")
          .attr("cx", s.c[0]).attr("cy", s.c[1])
          .attr("r", 0.005)
          .attr("fill", color)
          .attr("opacity", 0.8);
      }
    }

    // Labels
    if (showLabels) {
      for (const s of visible) {
        const tn = s.tn;
        if (tn == null) continue;
        let lx, ly;
        if (s.pg && s.pg.length >= 3) {
          lx = s.pg.reduce((sum, p) => sum + p[0], 0) / s.pg.length;
          ly = s.pg.reduce((sum, p) => sum + p[1], 0) / s.pg.length;
        } else if (s.c) {
          [lx, ly] = s.c;
        } else continue;

        pantoG.append("text")
          .attr("x", lx).attr("y", ly + 0.005)
          .attr("text-anchor", "middle")
          .attr("font-size", 0.014)
          .attr("font-weight", "bold")
          .attr("fill", color)
          .attr("opacity", 0.8)
          .text(String(tn));
      }
    }

    // Condyle landmarks (as reference points)
    const lmShapes = normShapes.filter(s => s.et === "landmark" && s.c);
    for (const s of lmShapes) {
      pantoG.append("circle")
        .attr("cx", s.c[0]).attr("cy", s.c[1])
        .attr("r", 0.006)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 0.002)
        .attr("opacity", 0.5);
    }
  }

  // ── Legend ──
  const legendY = vbY + 0.02;
  const legendG = g.append("g").attr("class", "legend");
  for (let pi = 0; pi < pantos.length; pi++) {
    const { data, color, label } = pantos[pi];
    if (!data) continue;
    legendG.append("rect")
      .attr("x", vbX + vbW - 0.20).attr("y", legendY + pi * 0.025)
      .attr("width", 0.015).attr("height", 0.015)
      .attr("fill", color).attr("opacity", 0.7);
    legendG.append("text")
      .attr("x", vbX + vbW - 0.18).attr("y", legendY + pi * 0.025 + 0.013)
      .text(label)
      .attr("font-size", 0.014).attr("fill", "#333");
  }
  if (showEigendentadura && eigendentaduraStats) {
    const ei = pantos.filter(p => p.data).length;
    legendG.append("circle")
      .attr("cx", vbX + vbW - 0.193).attr("cy", legendY + ei * 0.025 + 0.007)
      .attr("r", 0.005).attr("fill", EIGEN_COLOR).attr("opacity", 0.5);
    legendG.append("text")
      .attr("x", vbX + vbW - 0.18).attr("y", legendY + ei * 0.025 + 0.013)
      .text("Eigendentadura (μ ± 1σ)")
      .attr("font-size", 0.014).attr("fill", "#666");
  }

  return svg.node();
}
