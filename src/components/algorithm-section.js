/**
 * Self-contained algorithm section component.
 * Renders k selector, PCA scatter (with cluster toggle + click→modal),
 * cluster dentitions (one cluster at a time), and a representatives table.
 * All interactivity is managed via vanilla DOM events.
 */
import * as d3 from "d3";
import {pcaScatterPlot} from "./pca-scatter.js";
import {pantoSchematic} from "./panto-schematic.js";

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

  eigendentadura.forEach(t => {
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 5).attr("fill", "#eee").attr("stroke", "#ccc");
  });

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

  eigendentadura.forEach(t => {
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 6).attr("fill", "#eee").attr("stroke", "#ccc");
  });

  clusterTeeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 5)
      .attr("fill", QUAD_COLORS[q] || "#999").attr("fill-opacity", 0.35)
      .attr("stroke", QUAD_COLORS[q] || "#999").attr("stroke-width", 1);
  });

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

/** Open a modal overlay with panto schematic for the clicked dentition. */
async function openDentitionModal({d, pantosMap, clusterLabel}) {
  const sid = shortId(d.id);

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement("div");
  modal.style.cssText = "background:#fff;border-radius:10px;padding:1.5rem 1.8rem;max-width:520px;width:95%;max-height:88vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.22);position:relative;";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "position:absolute;top:0.7rem;right:0.9rem;border:none;background:none;font-size:1.1rem;cursor:pointer;color:#888;";
  closeBtn.onclick = () => overlay.remove();
  modal.appendChild(closeBtn);

  const title = document.createElement("div");
  title.style.cssText = "font-size:0.78rem;color:#888;margin-bottom:0.6rem;";
  title.textContent = `ID: ${sid}`;
  modal.appendChild(title);

  if (clusterLabel) {
    const badge = document.createElement("div");
    badge.style.cssText = "display:inline-block;background:#4e79a718;border:1px solid #4e79a744;border-radius:6px;padding:2px 10px;font-size:0.8rem;font-weight:600;color:#4e79a7;margin-bottom:0.8rem;";
    badge.textContent = clusterLabel;
    modal.appendChild(badge);
  }

  const coords = document.createElement("div");
  coords.style.cssText = "font-size:0.8rem;color:#888;margin-bottom:0.9rem;";
  const parts = [];
  if (d.pc1 != null) parts.push(`PC1: ${d.pc1.toFixed(3)}, PC2: ${d.pc2.toFixed(3)}`);
  if (d.u1 != null) parts.push(`UMAP1: ${d.u1.toFixed(3)}, UMAP2: ${d.u2.toFixed(3)}`);
  coords.textContent = parts.join("  ·  ");
  modal.appendChild(coords);

  const schDiv = document.createElement("div");
  schDiv.style.cssText = "margin-top:0.3rem;";
  modal.appendChild(schDiv);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  let geomData = null;
  try {
    const resp = await fetch(`_file/data/pantos_geometry/${sid}.json`);
    if (resp.ok) geomData = await resp.json();
  } catch(e) {}

  if (!overlay.isConnected) return;
  if (geomData) {
    pantoSchematic(schDiv, geomData, {
      showBbox: false, showPolygon: true, showCentroids: true,
      showLabels: true, showDividers: true, showLandmarks: false,
    });
  } else {
    schDiv.style.cssText = "color:#aaa;font-size:0.85rem;padding:1rem 0;";
    schDiv.textContent = "Sin datos de pantomografía disponibles.";
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.algorithmKey
 * @param {string} opts.algorithmLabel
 * @param {Array} opts.runs
 * @param {Object} opts.labels
 * @param {Array} opts.eigendentadura
 * @param {Array} opts.dentitions
 * @param {Object} opts.pcaMeta
 * @param {Object} opts.meta
 * @param {number} opts.width
 * @param {Map} [opts.pantosMap] - keyed by shortId (plain ID without prefix/suffix)
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
  pantosMap = null,
}) {
  const container = document.createElement("div");
  container.style.marginBottom = "2rem";

  let currentK = runs[0]?.k ?? 3;
  let currentProjection = "pca";
  let scatterNode = null;
  let activeOverlay = null;
  const hasKSelector = runs.length > 1;

  // ── Controls row ─────────────────────────────────────────────────────────
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
      btn.style.cssText = "padding:4px 16px; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px;";
      btn.addEventListener("click", () => { currentK = run.k; render(); });
      kButtons[run.k] = btn;
      kBlock.appendChild(btn);
    }
    controlsRow.appendChild(kBlock);
  }

  const projBlock = document.createElement("div");
  projBlock.style.cssText = "display:flex; gap:0.5rem; align-items:center;";
  projBlock.innerHTML = `<span style="font-weight:600;">Proyección:</span>`;
  const projButtons = {};
  for (const proj of ["pca", "umap"]) {
    const btn = document.createElement("button");
    btn.textContent = proj.toUpperCase();
    btn.style.cssText = "padding:4px 16px; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px;";
    btn.addEventListener("click", () => { currentProjection = proj; render(); });
    projButtons[proj] = btn;
    projBlock.appendChild(btn);
  }
  controlsRow.appendChild(projBlock);
  container.appendChild(controlsRow);

  const content = document.createElement("div");
  container.appendChild(content);

  function render() {
    if (scatterNode && scatterNode.__tooltipCleanup) { scatterNode.__tooltipCleanup(); scatterNode = null; }
    if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }
    content.innerHTML = "";

    const run = runs.find(r => r.k === currentK) || runs[0];
    if (!run) return;

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

    // Summary
    const summary = document.createElement("p");
    summary.style.cssText = "margin:0.5rem 0 1rem; color:#555;";
    const sizes = run.clusters.map(c => `C${c.cluster}: ${c.n}`).join(" · ");
    const silStr = run.silhouette != null ? run.silhouette.toFixed(4) : "N/A";
    let extra = "";
    if (run.n_noise != null) {
      extra = ` &nbsp;—&nbsp; Ruido: <strong>${run.n_noise}</strong> (${run.noise_pct}%)`;
      if (run.min_cluster_size != null) extra += ` &nbsp;—&nbsp; min_cluster_size=${run.min_cluster_size}, min_samples=${run.min_samples}`;
    }
    summary.innerHTML = `k: <strong>${run.k}</strong> &nbsp;—&nbsp; Silhouette: <strong>${silStr}</strong> &nbsp;—&nbsp; ${sizes}${extra}`;
    content.appendChild(summary);

    // Scatter (6.1: click→modal, 6.3: cluster toggle legend)
    const scatterW = Math.min(width, 850);
    scatterNode = pcaScatterPlot({
      dentitions,
      labels: labels[run.key] || [],
      pcaMeta,
      projection: currentProjection,
      title: `${algorithmLabel}${run.k ? `, k=${run.k}` : ""} — ${currentProjection.toUpperCase()}`,
      width: scatterW,
      height: 480,
      onDotClick: pantosMap ? (d) => {
        const lab = d.cluster === -1 ? "Ruido" : `Cluster ${d.cluster}`;
        openDentitionModal({d, pantosMap, clusterLabel: lab});
      } : null,
    });
    content.appendChild(scatterNode);

    // ── Cluster dentitions — one cluster at a time (6.2) ─────────────────────
    const dentHeader = document.createElement("h4");
    dentHeader.textContent = "Dentaduras por cluster";
    dentHeader.style.cssText = "margin:1.5rem 0 0.3rem;";
    content.appendChild(dentHeader);

    const dentDesc = document.createElement("p");
    dentDesc.style.cssText = "color:#666; font-size:13px; margin:0 0 0.8rem;";
    dentDesc.textContent = "Gris: eigendentadura · Semitransparente: media del cluster · Sólido: representante #1. Clic en una tarjeta para ver la dentadura individual.";
    content.appendChild(dentDesc);

    // Cluster selector tabs
    let selectedCluster = run.clusters[0]?.cluster ?? 0;
    const tabRow = document.createElement("div");
    tabRow.style.cssText = "display:flex;gap:0.4rem;margin-bottom:0.8rem;flex-wrap:wrap;";

    const clusterBtns = {};
    for (const cluster of run.clusters) {
      const pct = (cluster.n / meta.n_dentitions * 100).toFixed(1);
      const btn = document.createElement("button");
      btn.textContent = `C${cluster.cluster} (${pct}%)`;
      btn.style.cssText = "padding:4px 14px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;";
      btn.addEventListener("click", () => {
        selectedCluster = cluster.cluster;
        updateDentGrid();
        for (const [c, b] of Object.entries(clusterBtns)) {
          const a = parseInt(c) === selectedCluster;
          b.style.background = a ? "#4e79a7" : "#fff";
          b.style.color = a ? "#fff" : "#333";
          b.style.borderColor = a ? "#4e79a7" : "#ccc";
        }
      });
      clusterBtns[cluster.cluster] = btn;
      tabRow.appendChild(btn);
    }
    content.appendChild(tabRow);

    const dentGrid = document.createElement("div");
    dentGrid.style.cssText = "display:flex; flex-wrap:wrap; gap:0.8rem;";
    content.appendChild(dentGrid);

    function updateDentGrid() {
      dentGrid.innerHTML = "";
      const cluster = run.clusters.find(c => c.cluster === selectedCluster);
      if (!cluster) return;

      const reps = run.representatives[String(cluster.cluster)] ?? [];
      const cardW = Math.min(220, Math.floor((width - 80) / Math.min(reps.length, 4)));
      const pct = (cluster.n / meta.n_dentitions * 100).toFixed(1);

      // Cluster mean card
      const meanCard = document.createElement("div");
      meanCard.style.cssText = "border:2px solid #4e79a733;border-radius:6px;padding:4px;background:#f8faff;";
      meanCard.appendChild(drawClusterDentition({
        clusterTeeth: cluster.teeth,
        repTeeth: cluster.teeth,
        eigendentadura,
        title: `C${cluster.cluster} — media (n=${cluster.n}, ${pct}%)`,
        w: cardW + 60,
        h: Math.round((cardW + 60) * 0.75),
      }));
      dentGrid.appendChild(meanCard);

      // Representative cards
      for (const rep of reps) {
        const card = document.createElement("div");
        card.style.cssText = "border:1px solid #eee;border-radius:6px;padding:4px;cursor:pointer;";
        card.title = "Clic para ver detalles de esta dentadura";

        const repDent = drawClusterDentition({
          clusterTeeth: cluster.teeth,
          repTeeth: rep.teeth,
          eigendentadura,
          title: `Rep #${rep.rank + 1} (dist=${rep.dist.toFixed(2)})`,
          w: cardW,
          h: Math.round(cardW * 0.75),
        });
        card.appendChild(repDent);
        card.addEventListener("mouseover", () => { card.style.borderColor = "#4e79a7"; });
        card.addEventListener("mouseout", () => { card.style.borderColor = "#eee"; });
        card.addEventListener("click", () => {
          const d = dentitions.find(dd => dd.id === rep.id) ?? {id: rep.id, pc1: rep.pc1, pc2: rep.pc2};
          openDentitionModal({d, pantosMap, clusterLabel: `Cluster ${cluster.cluster}, rep #${rep.rank + 1}`});
        });
        dentGrid.appendChild(card);
      }
    }

    // Init cluster tab buttons
    for (const [c, b] of Object.entries(clusterBtns)) {
      const a = parseInt(c) === selectedCluster;
      b.style.background = a ? "#4e79a7" : "#fff";
      b.style.color = a ? "#fff" : "#333";
      b.style.borderColor = a ? "#4e79a7" : "#ccc";
    }
    updateDentGrid();

    // Representatives table
    const repsHeader = document.createElement("h4");
    repsHeader.textContent = "Representativos — top 5 más cercanos al centroide";
    repsHeader.style.cssText = "margin:1.8rem 0 0.5rem;";
    content.appendChild(repsHeader);

    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse; width:100%; max-width:750px; font-size:13px;";

    const thStyle = "padding:6px 10px; border-bottom:2px solid #ddd; text-align:left; font-weight:600;";
    const thStyleR = "padding:6px 10px; border-bottom:2px solid #ddd; text-align:right; font-weight:600;";
    const thead = document.createElement("thead");
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
        tr.addEventListener("mouseenter", () => { if (tr !== selectedRowEl) tr.style.background = "#f8f8f8"; });
        tr.addEventListener("mouseleave", () => { if (tr !== selectedRowEl) tr.style.background = ""; });
        tr.addEventListener("click", () => {
          if (selectedRowEl) selectedRowEl.style.background = "";
          selectedRowEl = tr;
          tr.style.background = "#e8f0fe";
          repViz.innerHTML = "";
          const vizW = Math.min(width, 700);
          repViz.appendChild(drawDentition({
            teeth: rep.teeth,
            eigendentadura,
            title: `${shortId(rep.id)} — Cluster ${cluster.cluster}, #${rep.rank + 1} (dist=${rep.dist.toFixed(3)})`,
            w: vizW, h: 400, showFdi: true,
          }));
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
