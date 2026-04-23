/**
 * Self-contained algorithm section component.
 * Renders k selector, PCA scatter, cluster dentitions (small multiples),
 * and a representatives table with click-to-visualize.
 * All interactivity is managed via vanilla DOM events.
 */
import * as d3 from "d3";
import {pcaScatterPlot} from "./pca-scatter.js";

const QUAD_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};

function shortId(id) {
  return id.replace(/database_original__|__json_url\.json/g, "");
}

/** Small dentition SVG: eigendentadura (grey) + overlay teeth (colored). */
function drawDentition({teeth, eigendentadura, title, w = 350, h = 280, showFdi = false}) {
  const margin = {top: 25, right: 10, bottom: 10, left: 20};
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;

  const allX = [...eigendentadura.map(t => t.cx), ...teeth.map(t => t.cx)];
  const allY = [...eigendentadura.map(t => t.cy), ...teeth.map(t => t.cy)];
  const padX = (d3.max(allX) - d3.min(allX)) * 0.08;
  const padY = (d3.max(allY) - d3.min(allY)) * 0.08;

  const xScale = d3.scaleLinear()
    .domain([d3.min(allX) - padX, d3.max(allX) + padX]).range([0, iw]);
  const yScale = d3.scaleLinear()
    .domain([d3.min(allY) - padY, d3.max(allY) + padY]).range([0, ih]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, w, h]).attr("width", w).attr("height", h)
    .style("font", "10px sans-serif");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Eigendentadura
  eigendentadura.forEach(t => {
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 5).attr("fill", "#eee").attr("stroke", "#ccc");
  });

  // Overlay teeth
  teeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 4)
      .attr("fill", QUAD_COLORS[q] || "#999")
      .attr("stroke", "#333").attr("stroke-width", 0.5);
    if (showFdi) {
      g.append("text")
        .attr("x", xScale(t.cx)).attr("y", yScale(t.cy) - 7)
        .attr("text-anchor", "middle").attr("font-size", "7px").attr("fill", "#666")
        .text(t.fdi);
    }
  });

  if (title) {
    g.append("text")
      .attr("x", iw / 2).attr("y", -8)
      .attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", "bold")
      .text(title);
  }

  return svg.node();
}

/** Three-layer dentition: eigendentadura + cluster mean + representative. */
function drawClusterDentition({clusterTeeth, repTeeth, eigendentadura, title, w = 350, h = 280}) {
  const margin = {top: 25, right: 10, bottom: 10, left: 20};
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;

  const allX = [...eigendentadura.map(t => t.cx), ...clusterTeeth.map(t => t.cx), ...repTeeth.map(t => t.cx)];
  const allY = [...eigendentadura.map(t => t.cy), ...clusterTeeth.map(t => t.cy), ...repTeeth.map(t => t.cy)];
  const padX = (d3.max(allX) - d3.min(allX)) * 0.08;
  const padY = (d3.max(allY) - d3.min(allY)) * 0.08;

  const xScale = d3.scaleLinear()
    .domain([d3.min(allX) - padX, d3.max(allX) + padX]).range([0, iw]);
  const yScale = d3.scaleLinear()
    .domain([d3.min(allY) - padY, d3.max(allY) + padY]).range([0, ih]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, w, h]).attr("width", w).attr("height", h)
    .style("font", "10px sans-serif");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Eigendentadura (grey)
  eigendentadura.forEach(t => {
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 6).attr("fill", "#eee").attr("stroke", "#ccc");
  });

  // Cluster mean (semi-transparent)
  clusterTeeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 5)
      .attr("fill", QUAD_COLORS[q] || "#999").attr("fill-opacity", 0.35)
      .attr("stroke", QUAD_COLORS[q] || "#999").attr("stroke-width", 1);
  });

  // Representative (solid, smaller)
  repTeeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 3)
      .attr("fill", QUAD_COLORS[q] || "#999")
      .attr("stroke", "#333").attr("stroke-width", 0.8);
  });

  if (title) {
    g.append("text")
      .attr("x", iw / 2).attr("y", -8)
      .attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", "bold")
      .text(title);
  }

  return svg.node();
}

/**
 * @param {Object} opts
 * @param {string} opts.algorithmKey - e.g. "kmeans"
 * @param {string} opts.algorithmLabel - e.g. "KMeans"
 * @param {Array} opts.runs - run objects for this algorithm (one per k)
 * @param {Object} opts.labels - {run_key: [label_per_dentition]}
 * @param {Array} opts.eigendentadura - [{fdi, cx, cy, angle}]
 * @param {Array} opts.dentitions - [{id, pc1, pc2}]
 * @param {Object} opts.pcaMeta
 * @param {Object} opts.meta - {n_dentitions, ...}
 * @param {number} opts.width
 * @returns {HTMLElement}
 */
export function algorithmSection({
  algorithmKey,
  algorithmLabel,
  runs,
  labels,
  eigendentadura,
  dentitions,
  pcaMeta,
  meta,
  width = 900,
}) {
  const container = document.createElement("div");
  container.style.marginBottom = "2rem";

  let currentK = runs[0]?.k ?? 3;
  let currentProjection = "pca"; // 'pca' | 'umap'
  let scatterNode = null;
  const hasKSelector = runs.length > 1;

  // ── k toggle ──────────────────────────────────────────────────────────────
  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = "display:flex; gap:1.5rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap;";

  if (hasKSelector) {
    const kBlock = document.createElement("div");
    kBlock.style.cssText = "display:flex; gap:0.5rem; align-items:center;";
    kBlock.innerHTML = `<span style="font-weight:600;">k:</span>`;
    var kButtons = {};
    for (const run of runs) {
      const btn = document.createElement("button");
      btn.textContent = `k = ${run.k}`;
      btn.style.cssText = "padding:4px 16px; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px; transition:background 0.15s;";
      btn.addEventListener("click", () => {
        currentK = run.k;
        render();
      });
      kButtons[run.k] = btn;
      kBlock.appendChild(btn);
    }
    controlsRow.appendChild(kBlock);
  }

  // Projection toggle (PCA / UMAP)
  const projBlock = document.createElement("div");
  projBlock.style.cssText = "display:flex; gap:0.5rem; align-items:center;";
  projBlock.innerHTML = `<span style="font-weight:600;">Proyección:</span>`;
  const projButtons = {};
  for (const proj of ["pca", "umap"]) {
    const btn = document.createElement("button");
    btn.textContent = proj.toUpperCase();
    btn.style.cssText = "padding:4px 16px; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px; transition:background 0.15s;";
    btn.addEventListener("click", () => {
      currentProjection = proj;
      render();
    });
    projButtons[proj] = btn;
    projBlock.appendChild(btn);
  }
  controlsRow.appendChild(projBlock);
  container.appendChild(controlsRow);

  // ── Content (re-rendered on k/projection change) ─────────────────────────
  const content = document.createElement("div");
  container.appendChild(content);

  function render() {
    // Cleanup old scatter tooltip
    if (scatterNode && scatterNode.__tooltipCleanup) {
      scatterNode.__tooltipCleanup();
      scatterNode = null;
    }
    content.innerHTML = "";

    const run = runs.find(r => r.k === currentK) || runs[0];
    if (!run) return;

    // Update button styles
    if (hasKSelector) {
      for (const [k, btn] of Object.entries(kButtons)) {
        const active = parseInt(k) === currentK;
        btn.style.background = active ? "#4e79a7" : "#fff";
        btn.style.color = active ? "#fff" : "#333";
        btn.style.borderColor = active ? "#4e79a7" : "#ccc";
      }
    }
    for (const [proj, btn] of Object.entries(projButtons)) {
      const active = proj === currentProjection;
      btn.style.background = active ? "#4e79a7" : "#fff";
      btn.style.color = active ? "#fff" : "#333";
      btn.style.borderColor = active ? "#4e79a7" : "#ccc";
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const summary = document.createElement("p");
    summary.style.cssText = "margin:0.5rem 0 1rem; color:#555;";
    const sizes = run.clusters.map(c => `C${c.cluster}: ${c.n}`).join(" · ");
    const silStr = run.silhouette != null ? run.silhouette.toFixed(4) : "N/A";
    let extra = "";
    if (run.n_noise != null) {
      extra = ` &nbsp;—&nbsp; Ruido: <strong>${run.n_noise}</strong> (${run.noise_pct}%)`;
      if (run.min_cluster_size != null) {
        extra += ` &nbsp;—&nbsp; min_cluster_size=${run.min_cluster_size}, min_samples=${run.min_samples}`;
      }
    }
    summary.innerHTML = `k: <strong>${run.k}</strong> &nbsp;—&nbsp; Silhouette: <strong>${silStr}</strong> &nbsp;—&nbsp; ${sizes}${extra}`;
    content.appendChild(summary);

    // ── Scatter (PCA or UMAP) ────────────────────────────────────────────────
    const scatterW = Math.min(width, 850);
    scatterNode = pcaScatterPlot({
      dentitions,
      labels: labels[run.key] || [],
      pcaMeta,
      projection: currentProjection,
      title: `${algorithmLabel}${run.k ? `, k=${run.k}` : ""} — ${currentProjection.toUpperCase()}`,
      width: scatterW,
      height: 480,
    });
    content.appendChild(scatterNode);

    // ── Cluster dentitions — small multiples ─────────────────────────────────
    const dentHeader = document.createElement("h4");
    dentHeader.textContent = "Dentaduras por cluster";
    dentHeader.style.cssText = "margin:1.5rem 0 0.3rem;";
    content.appendChild(dentHeader);

    const dentDesc = document.createElement("p");
    dentDesc.style.cssText = "color:#666; font-size:13px; margin:0 0 0.8rem;";
    dentDesc.textContent = "Gris: eigendentadura · Semitransparente: media del cluster · Sólido: representante #1.";
    content.appendChild(dentDesc);

    const dentGrid = document.createElement("div");
    dentGrid.style.cssText = "display:flex; flex-wrap:wrap; gap:0.8rem;";
    const nCards = Math.max(run.k, 1);
    const cardW = nCards <= 3
      ? Math.min(360, Math.floor((width - 30) / Math.max(nCards, 1)))
      : Math.min(300, Math.floor((width - 50) / Math.min(nCards, 3)));

    for (const cluster of run.clusters) {
      const repList = run.representatives[String(cluster.cluster)];
      const rep = repList[0];
      const pct = (cluster.n / meta.n_dentitions * 100).toFixed(1);
      const card = drawClusterDentition({
        clusterTeeth: cluster.teeth,
        repTeeth: rep.teeth,
        eigendentadura,
        title: `C${cluster.cluster} — n=${cluster.n} (${pct}%)`,
        w: cardW,
        h: Math.round(cardW * 0.75),
      });
      card.style.border = "1px solid #eee";
      card.style.borderRadius = "4px";
      dentGrid.appendChild(card);
    }
    content.appendChild(dentGrid);

    // ── Representatives table ────────────────────────────────────────────────
    const repsHeader = document.createElement("h4");
    repsHeader.textContent = "Representativos — top 5 más cercanos al centroide";
    repsHeader.style.cssText = "margin:1.8rem 0 0.5rem;";
    content.appendChild(repsHeader);

    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse; width:100%; max-width:750px; font-size:13px;";

    const thead = document.createElement("thead");
    const thStyle = "padding:6px 10px; border-bottom:2px solid #ddd; text-align:left; font-weight:600;";
    const thStyleR = "padding:6px 10px; border-bottom:2px solid #ddd; text-align:right; font-weight:600;";
    thead.innerHTML = `<tr>
      <th style="${thStyle}">Cluster</th>
      <th style="${thStyle}">#</th>
      <th style="${thStyle}">Panto</th>
      <th style="${thStyleR}">Dist.</th>
      <th style="${thStyleR}">PC1</th>
      <th style="${thStyleR}">PC2</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const tdStyle = "padding:4px 10px; border-bottom:1px solid #f0f0f0;";
    const tdStyleR = "padding:4px 10px; border-bottom:1px solid #f0f0f0; text-align:right;";

    const repViz = document.createElement("div");
    repViz.style.cssText = "margin-top:1rem;";
    let selectedRowEl = null;

    for (const cluster of run.clusters) {
      const reps = run.representatives[String(cluster.cluster)];
      for (const rep of reps) {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.innerHTML = `
          <td style="${tdStyle}">${cluster.cluster}</td>
          <td style="${tdStyle}">${rep.rank + 1}</td>
          <td style="${tdStyle}">${shortId(rep.id)}</td>
          <td style="${tdStyleR}">${rep.dist.toFixed(3)}</td>
          <td style="${tdStyleR}">${rep.pc1.toFixed(2)}</td>
          <td style="${tdStyleR}">${rep.pc2.toFixed(2)}</td>`;
        tr.addEventListener("mouseenter", () => {
          if (tr !== selectedRowEl) tr.style.background = "#f8f8f8";
        });
        tr.addEventListener("mouseleave", () => {
          if (tr !== selectedRowEl) tr.style.background = "";
        });
        tr.addEventListener("click", () => {
          if (selectedRowEl) selectedRowEl.style.background = "";
          selectedRowEl = tr;
          tr.style.background = "#e8f0fe";
          // Render selected panto
          repViz.innerHTML = "";
          const vizW = Math.min(width, 700);
          const node = drawDentition({
            teeth: rep.teeth,
            eigendentadura,
            title: `${shortId(rep.id)} — Cluster ${cluster.cluster}, #${rep.rank + 1} (dist=${rep.dist.toFixed(3)})`,
            w: vizW,
            h: 400,
            showFdi: true,
          });
          repViz.appendChild(node);
        });
        tbody.appendChild(tr);
      }
    }
    table.appendChild(tbody);
    content.appendChild(table);
    content.appendChild(repViz);
  }

  render();
  return container;
}
