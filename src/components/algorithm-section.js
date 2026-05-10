/**
 * Self-contained algorithm section component.
 * Renders: cómo-leer, opciones colapsables, k selector, PCA scatter
 * (click→PantoModal), cluster dentitions, and a paginated+filtered
 * representatives table (click→PantoModal).
 */
import * as d3 from "d3";
import {pcaScatterPlot} from "./pca-scatter.js";
import {openPantoModal} from "./panto-modal.js";

const QUAD_COLORS = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};
const REPS_PER_PAGE = 10;

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

  // Eigendentadura — small grey reference dots
  eigendentadura.forEach(t => {
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 3).attr("fill", "#ddd").attr("stroke", "#bbb").attr("stroke-width", 0.5);
  });

  // Overlay teeth — colored, larger
  teeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 4.5)
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

/** Three-layer dentition: eigendentadura (grey dots) + cluster mean (rings) + representative (solid). */
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

  // Layer 1 — eigendentadura: small grey reference dots
  eigendentadura.forEach(t => {
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 3).attr("fill", "#e0e0e0").attr("stroke", "#bbb").attr("stroke-width", 0.5);
  });

  // Layer 2 — cluster centroid: colored rings (stroke only, no fill) — distinguishable from reps
  clusterTeeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    const c = QUAD_COLORS[q] || "#999";
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 6)
      .attr("fill", "none")
      .attr("stroke", c).attr("stroke-width", 2).attr("stroke-dasharray", "3,2");
  });

  // Layer 3 — representative: solid colored small circles
  repTeeth.forEach(t => {
    const q = Math.floor(t.fdi / 10);
    g.append("circle")
      .attr("cx", xScale(t.cx)).attr("cy", yScale(t.cy))
      .attr("r", 3.5)
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
 * @param {string} opts.algorithmKey
 * @param {string} opts.algorithmLabel
 * @param {Array} opts.runs
 * @param {Object} opts.labels
 * @param {Array} opts.eigendentadura
 * @param {Array} opts.dentitions
 * @param {Object} opts.pcaMeta
 * @param {Object} opts.meta
 * @param {number} opts.width
 * @param {Map} [opts.pantosMap]
 * @param {Array} [opts.toothStats]
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
  toothStats = null,
}) {
  const container = document.createElement("div");
  container.style.marginBottom = "2rem";

  // ── Cómo leer ─────────────────────────────────────────────────────────────
  const howTo = document.createElement("details");
  howTo.style.cssText = "margin-bottom:0.8rem;border:1px solid #e8e8e8;border-radius:6px;padding:0.4rem 0.8rem;background:#fafafa;";
  const howToSum = document.createElement("summary");
  howToSum.style.cssText = "cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;";
  howToSum.textContent = "Cómo leer este gráfico";
  howTo.appendChild(howToSum);
  const howToBody = document.createElement("div");
  howToBody.style.cssText = "padding:0.5rem 0 0.2rem;font-size:0.85rem;color:#444;line-height:1.6;";
  howToBody.innerHTML = `<ul style="margin:0.3rem 0;padding-left:1.4rem;">
    <li><strong>Scatter PCA/UMAP</strong> — cada punto es una dentadura en el espacio reducido. El color indica el cluster asignado. Clic en un punto para ver la pantomografía.</li>
    <li><strong>Proyección PCA</strong> — componentes principales de los z-scores geométricos. <strong>UMAP</strong> — proyección no lineal que preserva estructura local.</li>
    <li><strong>Dentaduras por cluster</strong> — gris claro: eigendentadura (referencia poblacional); anillo punteado de color: centroide del cluster; punto sólido: dentadura representante. Clic en una tarjeta para ver la panto.</li>
    <li><strong>Representativos</strong> — dentaduras más cercanas al centroide del cluster en el espacio PCA. Clic en una fila para ver la pantomografía.</li>
    <li><strong>Silhouette score &lt; 0.25</strong> indica que los clusters no están bien separados y la variabilidad es un continuo.</li>
  </ul>`;
  howTo.appendChild(howToBody);
  container.appendChild(howTo);

  let currentK = runs[0]?.k ?? 3;
  let currentProjection = "pca";
  let scatterNode = null;
  const hasKSelector = runs.length > 1;

  // ── Opciones de visualización (colapsable) ────────────────────────────────
  const vizDetails = document.createElement("details");
  vizDetails.style.cssText = "margin-bottom:1rem;border:1px solid #e8e8e8;border-radius:6px;padding:0.4rem 0.8rem;background:#fafafa;";
  const vizSum = document.createElement("summary");
  vizSum.style.cssText = "cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;";
  vizSum.textContent = "Opciones de visualización";
  vizDetails.appendChild(vizSum);

  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = "display:flex; gap:1.5rem; align-items:center; padding:0.5rem 0 0.3rem; flex-wrap:wrap;";

  var kButtons = {};
  if (hasKSelector) {
    const kBlock = document.createElement("div");
    kBlock.style.cssText = "display:flex; gap:0.5rem; align-items:center;";
    kBlock.innerHTML = `<span style="font-weight:600;font-size:13px;">k:</span>`;
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
  projBlock.innerHTML = `<span style="font-weight:600;font-size:13px;">Proyección:</span>`;
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
  vizDetails.appendChild(controlsRow);
  container.appendChild(vizDetails);

  const content = document.createElement("div");
  container.appendChild(content);

  function render() {
    if (scatterNode && scatterNode.__tooltipCleanup) { scatterNode.__tooltipCleanup(); scatterNode = null; }
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

    // Scatter — click → PantoModal
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
        const sid = shortId(d.id);
        const pb = pantosMap.get(sid) ?? null;
        const lab = d.cluster === -1 ? "Ruido" : `Cluster ${d.cluster}`;
        const extraBadges = [{label: "Cluster", value: lab, color: "#4e79a7"}];
        if (d.pc1 != null) extraBadges.push({label: "PC1", value: d.pc1.toFixed(3), color: "#888"});
        if (d.pc2 != null) extraBadges.push({label: "PC2", value: d.pc2.toFixed(3), color: "#888"});
        openPantoModal({id: sid, pantoMeta: pb, toothStats, extraBadges});
      } : null,
    });
    content.appendChild(scatterNode);

    // ── Dentaduras por cluster ─────────────────────────────────────────────
    const dentHeader = document.createElement("h4");
    dentHeader.textContent = "Dentaduras por cluster";
    dentHeader.style.cssText = "margin:1.5rem 0 0.3rem;";
    content.appendChild(dentHeader);

    const dentDesc = document.createElement("p");
    dentDesc.style.cssText = "color:#666; font-size:13px; margin:0 0 0.8rem;";
    dentDesc.textContent = "Gris: eigendentadura (referencia) · Anillo punteado: centroide del cluster · Sólido: representante. Clic en una tarjeta para ver la pantomografía.";
    content.appendChild(dentDesc);

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

      // Cluster mean card (non-clickable)
      const meanCard = document.createElement("div");
      meanCard.style.cssText = "border:2px solid #4e79a733;border-radius:6px;padding:4px;background:#f8faff;";
      meanCard.appendChild(drawClusterDentition({
        clusterTeeth: cluster.teeth,
        repTeeth: [],
        eigendentadura,
        title: `C${cluster.cluster} — media (n=${cluster.n}, ${pct}%)`,
        w: cardW + 60,
        h: Math.round((cardW + 60) * 0.75),
      }));
      dentGrid.appendChild(meanCard);

      // Representative cards — click → PantoModal
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
          const sid = shortId(rep.id);
          const pb = pantosMap?.get(sid) ?? null;
          const extraBadges = [
            {label: "Cluster", value: `C${cluster.cluster}`, color: "#4e79a7"},
            {label: "Rank", value: `#${rep.rank + 1}`, color: "#888"},
          ];
          openPantoModal({id: sid, pantoMeta: pb, toothStats, extraBadges});
        });
        dentGrid.appendChild(card);
      }
    }

    for (const [c, b] of Object.entries(clusterBtns)) {
      const a = parseInt(c) === selectedCluster;
      b.style.background = a ? "#4e79a7" : "#fff";
      b.style.color = a ? "#fff" : "#333";
      b.style.borderColor = a ? "#4e79a7" : "#ccc";
    }
    updateDentGrid();

    // ── Representativos — tabla paginada con filtro por cluster ────────────
    const repsHeader = document.createElement("h4");
    repsHeader.textContent = "Representativos";
    repsHeader.style.cssText = "margin:1.8rem 0 0.5rem;";
    content.appendChild(repsHeader);

    // Cluster filter
    let repFilterCluster = null;
    const repFilterRow = document.createElement("div");
    repFilterRow.style.cssText = "display:flex;gap:0.4rem;margin-bottom:0.6rem;flex-wrap:wrap;align-items:center;";
    repFilterRow.innerHTML = `<span style="font-size:12px;color:#666;">Filtrar:</span>`;

    const allRepBtn = document.createElement("button");
    allRepBtn.textContent = "Todos";
    allRepBtn.style.cssText = "padding:2px 12px;border:1px solid #4e79a7;border-radius:4px;cursor:pointer;font-size:12px;background:#4e79a7;color:#fff;";
    repFilterRow.appendChild(allRepBtn);

    const repFilterBtns = {null: allRepBtn};
    for (const cluster of run.clusters) {
      const btn = document.createElement("button");
      btn.textContent = `C${cluster.cluster}`;
      btn.style.cssText = "padding:2px 12px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;background:#fff;color:#333;";
      repFilterBtns[cluster.cluster] = btn;
      repFilterRow.appendChild(btn);
    }
    content.appendChild(repFilterRow);

    // Build flat reps array
    const allReps = [];
    for (const cluster of run.clusters) {
      for (const rep of (run.representatives[String(cluster.cluster)] ?? [])) {
        allReps.push({...rep, clusterNum: cluster.cluster});
      }
    }

    let repPage = 0;
    const tableWrap = document.createElement("div");
    content.appendChild(tableWrap);

    function filteredReps() {
      return repFilterCluster == null ? allReps : allReps.filter(r => r.clusterNum === repFilterCluster);
    }

    function renderRepTable() {
      tableWrap.innerHTML = "";
      const rows = filteredReps();
      const totalPages = Math.max(1, Math.ceil(rows.length / REPS_PER_PAGE));
      repPage = Math.min(repPage, totalPages - 1);
      const pageRows = rows.slice(repPage * REPS_PER_PAGE, (repPage + 1) * REPS_PER_PAGE);

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

      for (const rep of pageRows) {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.title = "Clic para ver la pantomografía";
        tr.innerHTML = `
          <td style="${tdStyle}">${rep.clusterNum}</td>
          <td style="${tdStyle}">${rep.rank + 1}</td>
          <td style="${tdStyle}">${shortId(rep.id)}</td>
          <td style="${tdStyleR}">${rep.dist.toFixed(3)}</td>
          <td style="${tdStyleR}">${rep.pc1.toFixed(2)}</td>
          <td style="${tdStyleR}">${rep.pc2.toFixed(2)}</td>`;
        tr.addEventListener("mouseenter", () => { tr.style.background = "#f8f8f8"; });
        tr.addEventListener("mouseleave", () => { tr.style.background = ""; });
        tr.addEventListener("click", () => {
          const sid = shortId(rep.id);
          const pb = pantosMap?.get(sid) ?? null;
          const extraBadges = [
            {label: "Cluster", value: `C${rep.clusterNum}`, color: "#4e79a7"},
            {label: "Rank", value: `#${rep.rank + 1}`, color: "#888"},
          ];
          openPantoModal({id: sid, pantoMeta: pb, toothStats, extraBadges});
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);

      // Pagination
      if (totalPages > 1) {
        const pager = document.createElement("div");
        pager.style.cssText = "display:flex;gap:0.5rem;align-items:center;margin-top:0.6rem;font-size:12px;color:#666;";

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "← Anterior";
        prevBtn.disabled = repPage === 0;
        prevBtn.style.cssText = "padding:2px 10px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;";
        prevBtn.addEventListener("click", () => { repPage--; renderRepTable(); });

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Siguiente →";
        nextBtn.disabled = repPage >= totalPages - 1;
        nextBtn.style.cssText = "padding:2px 10px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;";
        nextBtn.addEventListener("click", () => { repPage++; renderRepTable(); });

        pager.appendChild(prevBtn);
        pager.appendChild(document.createTextNode(`Pág. ${repPage + 1} / ${totalPages}  (${rows.length} registros)`));
        pager.appendChild(nextBtn);
        tableWrap.appendChild(pager);
      } else {
        const info = document.createElement("div");
        info.style.cssText = "font-size:11px;color:#999;margin-top:4px;";
        info.textContent = `${rows.length} registros`;
        tableWrap.appendChild(info);
      }
    }

    // Wire up filter buttons
    function setRepFilter(clusterVal) {
      repFilterCluster = clusterVal;
      repPage = 0;
      for (const [k, btn] of Object.entries(repFilterBtns)) {
        const active = String(k) === String(clusterVal) || (clusterVal == null && k === "null");
        btn.style.background = active ? "#4e79a7" : "#fff";
        btn.style.color = active ? "#fff" : "#333";
        btn.style.borderColor = active ? "#4e79a7" : "#ccc";
      }
      renderRepTable();
    }

    allRepBtn.addEventListener("click", () => setRepFilter(null));
    for (const cluster of run.clusters) {
      repFilterBtns[cluster.cluster].addEventListener("click", () => setRepFilter(cluster.cluster));
    }

    renderRepTable();
  }

  render();
  return container;
}
