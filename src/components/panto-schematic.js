/**
 * Renderizador esquemático de pantomografía con D3.
 *
 * Dibuja todos los elementos geométricos de una panto:
 * bbox, minbbox, polígono, centroides, etiquetas, divisores de cuadrante,
 * curva maxilar, bbox de dentición, minbbox regionales, landmarks, metal.
 *
 * Coordenadas en pixel-space de la imagen. SVG Y-down coincide con imagen.
 */
import * as d3 from "d3";

const QUADRANT_COLORS = {
  1: "#4e79a7",
  2: "#59a14f",
  3: "#edc949",
  4: "#e15759",
};

const METAL_COLOR = "#ff7f0e";
const LANDMARK_COLOR = "#d62728";

const REGION_COLORS = {
  upper: "#1f77b4",
  lower: "#d62728",
  q1: "#2ca02c",
  q2: "#9467bd",
  q3: "#ff7f0e",
  q4: "#8c564b",
};

function shapeColor(shape) {
  if (shape.et === "metal") return METAL_COLOR;
  if (shape.et === "landmark") return LANDMARK_COLOR;
  const q = shape.q || (shape.tn ? Math.floor(shape.tn / 10) : null);
  return QUADRANT_COLORS[q] || "#888";
}

/**
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} pantoData - per-panto geometry JSON
 * @param {Object} options - visibility toggles
 */
export function pantoSchematic(container, pantoData, options = {}) {
  const {
    showBbox = true,
    showMinbbox = false,
    showPolygon = false,
    showCentroids = false,
    showLabels = true,
    showGrid = false,
    showLandmarks = false,
    showDividers = true,
    showCurve = true,
    showDentitionBbox = false,
    showMinbboxUpper = false,
    showMinbboxLower = false,
    showMinbboxQ1 = false,
    showMinbboxQ2 = false,
    showMinbboxQ3 = false,
    showMinbboxQ4 = false,
    showMetalCrown = false,
    showMetalBridge = false,
    showMetalImplant = false,
    showMetalPost = false,
    showMetalOrtodoncia = false,
    showMetalGeneric = false,
  } = options;

  // Determine which metal subtypes to show
  const metalSubtypes = new Set();
  if (showMetalCrown) { metalSubtypes.add("crown"); metalSubtypes.add("crown_post"); }
  if (showMetalBridge) { metalSubtypes.add("bridge"); metalSubtypes.add("pillar"); }
  if (showMetalImplant) metalSubtypes.add("implant");
  if (showMetalPost) metalSubtypes.add("post");
  if (showMetalOrtodoncia) { metalSubtypes.add("brackets"); metalSubtypes.add("retainers"); metalSubtypes.add("appliances"); }
  if (showMetalGeneric) { metalSubtypes.add("generic"); metalSubtypes.add("other"); }

  const {img_w, img_h, shapes, div_x, div_y, curve, dent_bbox, reg_minbbox} = pantoData;

  // Clear container
  container.innerHTML = "";

  const margin = 20;
  const maxWidth = 900;
  const aspect = img_h / img_w;
  const width = Math.min(maxWidth, img_w);
  const height = width * aspect;

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${img_w} ${img_h}`)
    .attr("width", width)
    .attr("height", height)
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("background", "#fafafa");

  // Add zoom
  const g = svg.append("g");
  const zoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);
  svg.on("dblclick.zoom", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));

  // ── Grid ──
  if (showGrid) {
    const gridG = g.append("g").attr("class", "grid");
    const step = Math.round(img_w / 20);
    for (let x = 0; x <= img_w; x += step) {
      gridG.append("line")
        .attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", img_h)
        .attr("stroke", "#e0e0e0").attr("stroke-width", 1);
    }
    for (let y = 0; y <= img_h; y += step) {
      gridG.append("line")
        .attr("x1", 0).attr("y1", y).attr("x2", img_w).attr("y2", y)
        .attr("stroke", "#e0e0e0").attr("stroke-width", 1);
    }
  }

  // ── Dentition bbox ──
  if (showDentitionBbox && dent_bbox) {
    const [dx, dy, dw, dh] = dent_bbox;
    g.append("rect")
      .attr("x", dx).attr("y", dy).attr("width", dw).attr("height", dh)
      .attr("fill", "none")
      .attr("stroke", METAL_COLOR).attr("stroke-width", 4)
      .attr("stroke-dasharray", "8,4")
      .attr("opacity", 0.6);
  }

  // Filter shapes by entity type (exclude minbbox/centroid/fiducial sub-types)
  const visibleShapes = shapes.filter(s => {
    if (s.et === "tooth") return s.es === "tooth";
    if (s.et === "landmark") return showLandmarks;
    if (s.et === "metal") return metalSubtypes.has(s.es);
    return false;
  });

  // ── Polygon contours ──
  if (showPolygon) {
    const polyG = g.append("g").attr("class", "polygons");
    for (const s of visibleShapes) {
      if (!s.pg || s.pg.length < 3) continue;
      if (s.et === "metal" || s.et === "tooth") {
        const pathData = "M" + s.pg.map(p => p.join(",")).join("L") + "Z";
        polyG.append("path")
          .attr("d", pathData)
          .attr("fill", "none")
          .attr("stroke", shapeColor(s))
          .attr("stroke-width", 3)
          .attr("opacity", 0.7);
      }
    }
  }

  // ── Metal polygon (always show when metal subtype selected, regardless of showPolygon) ──
  if (metalSubtypes.size > 0 && !showPolygon) {
    const metalPolyG = g.append("g").attr("class", "metal-polygons");
    for (const s of shapes.filter(sh => sh.et === "metal" && metalSubtypes.has(sh.es))) {
      if (!s.pg || s.pg.length < 3) continue;
      const pathData = "M" + s.pg.map(p => p.join(",")).join("L") + "Z";
      metalPolyG.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", METAL_COLOR)
        .attr("stroke-width", 3)
        .attr("opacity", 0.7);
    }
  }

  // ── MinBbox (per-shape) ──
  if (showMinbbox) {
    const mbG = g.append("g").attr("class", "minbboxes");
    for (const s of visibleShapes) {
      if (!s.mb || s.mb.length < 4) continue;
      const pathData = "M" + s.mb.map(p => p.join(",")).join("L") + "Z";
      mbG.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", "#00bcd4")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "6,3")
        .attr("opacity", 0.8);
    }
  }

  // ── Bbox (per-shape) ──
  if (showBbox) {
    const bboxG = g.append("g").attr("class", "bboxes");
    for (const s of visibleShapes) {
      if (!s.b) continue;
      const [x, y, w, h] = s.b;
      bboxG.append("rect")
        .attr("x", x).attr("y", y).attr("width", w).attr("height", h)
        .attr("fill", "none")
        .attr("stroke", shapeColor(s))
        .attr("stroke-width", 3)
        .attr("rx", 2);
    }
  }

  // ── Quadrant dividers ──
  if (showDividers && div_x != null && div_y != null && dent_bbox) {
    const [dx, dy, dw, dh] = dent_bbox;
    // Vertical divider (quadrant X)
    g.append("line")
      .attr("x1", div_x).attr("y1", dy).attr("x2", div_x).attr("y2", dy + dh)
      .attr("stroke", "#d62728").attr("stroke-width", 3)
      .attr("stroke-dasharray", "10,5")
      .attr("opacity", 0.7);
    // Horizontal divider (quadrant Y)
    g.append("line")
      .attr("x1", dx).attr("y1", div_y).attr("x2", dx + dw).attr("y2", div_y)
      .attr("stroke", "#1f77b4").attr("stroke-width", 3)
      .attr("stroke-dasharray", "10,5")
      .attr("opacity", 0.7);
  }

  // ── Maxillary curve ──
  if (showCurve && curve && dent_bbox) {
    const [a, b, c] = curve;
    const [dx, _dy, dw, _dh] = dent_bbox;
    const nPoints = 100;
    const xMin = dx, xMax = dx + dw;
    const step = (xMax - xMin) / nPoints;
    const curvePoints = [];
    for (let i = 0; i <= nPoints; i++) {
      const x = xMin + i * step;
      const y = a * x * x + b * x + c;
      curvePoints.push([x, y]);
    }
    const line = d3.line().x(d => d[0]).y(d => d[1]);
    g.append("path")
      .attr("d", line(curvePoints))
      .attr("fill", "none")
      .attr("stroke", "#9467bd")
      .attr("stroke-width", 4)
      .attr("opacity", 0.8);
  }

  // ── Centroids ──
  if (showCentroids) {
    const centG = g.append("g").attr("class", "centroids");
    for (const s of visibleShapes) {
      if (!s.c) continue;
      const [cx, cy] = s.c;
      centG.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", s.et === "landmark" ? 12 : 8)
        .attr("fill", shapeColor(s))
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.9);
    }
  }

  // ── Landmarks (as points) ──
  if (showLandmarks) {
    const lmG = g.append("g").attr("class", "landmarks");
    for (const s of shapes.filter(sh => sh.et === "landmark")) {
      if (!s.c) continue;
      const [cx, cy] = s.c;
      lmG.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", 10)
        .attr("fill", LANDMARK_COLOR)
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.8);
      // Landmark label
      const labelText = s.l || "";
      lmG.append("text")
        .attr("x", cx + 14).attr("y", cy + 4)
        .text(labelText)
        .attr("font-size", 18)
        .attr("fill", LANDMARK_COLOR)
        .attr("font-weight", "bold");
    }
  }

  // ── Labels ──
  if (showLabels) {
    const labelG = g.append("g").attr("class", "labels");
    for (const s of visibleShapes) {
      if (s.et === "landmark") continue; // landmarks handled above
      const tn = s.tn;
      if (tn == null && !s.l) continue;
      // Position: top-left of bbox, or centroid
      let lx, ly;
      if (s.b) {
        lx = s.b[0] + 3;
        ly = s.b[1] - 5;
      } else if (s.c) {
        [lx, ly] = s.c;
        ly -= 12;
      } else continue;

      const text = tn != null ? String(tn) : (s.l || "");
      const bg = labelG.append("rect");
      const label = labelG.append("text")
        .attr("x", lx).attr("y", ly)
        .text(text)
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("fill", shapeColor(s));

      // Background box
      // Use approximate text bounds
      const approxW = text.length * 12 + 6;
      bg.attr("x", lx - 3).attr("y", ly - 18)
        .attr("width", approxW).attr("height", 22)
        .attr("rx", 3)
        .attr("fill", "white")
        .attr("opacity", 0.85);
    }
  }

  // ── Regional MinBboxes ──
  const regionToggles = {
    upper: showMinbboxUpper, lower: showMinbboxLower,
    q1: showMinbboxQ1, q2: showMinbboxQ2, q3: showMinbboxQ3, q4: showMinbboxQ4,
  };
  const REGION_LABELS = {
    upper: "Superior", lower: "Inferior",
    q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4",
  };

  if (reg_minbbox) {
    const regG = g.append("g").attr("class", "regional-minbboxes");
    for (const [region, show] of Object.entries(regionToggles)) {
      if (!show || !reg_minbbox[region]) continue;
      const {points, angle, cx, cy} = reg_minbbox[region];
      const color = REGION_COLORS[region];

      // Rotated rectangle
      const pathData = "M" + points.map(p => p.join(",")).join("L") + "Z";
      regG.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 4)
        .attr("stroke-dasharray", "8,4")
        .attr("opacity", 0.8);

      // Center point
      regG.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", 8)
        .attr("fill", color)
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

      // Label with angle
      regG.append("text")
        .attr("x", cx + 14).attr("y", cy)
        .text(`${REGION_LABELS[region]} ${angle}°`)
        .attr("font-size", 22)
        .attr("font-weight", "bold")
        .attr("fill", color)
        .attr("paint-order", "stroke")
        .attr("stroke", "white")
        .attr("stroke-width", 4);
    }
  }

  return svg.node();
}
