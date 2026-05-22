/**
 * PantoModal — modal estándar para visualizar pantomografías.
 * SUG-007: modal con tabs (Geometría / Morfometría / Visualización).
 *
 * Uso:
 *   import { openPantoModal } from "./components/panto-modal.js";
 *
 *   openPantoModal({
 *     id,             // string — ID corto de la panto (sin prefijo/sufijo)
 *     pantoMeta,      // object — entrada de pantos_browser.json
 *     toothStats,     // array  — tooth_stats.json (para eigendentadura)
 *     zScores,        // object — { z_mean, z_pos, z_ang, z_max, teeth }  (opcional)
 *     rankInfo,       // object — { rank_atypical, rank_typical, total }   (opcional)
 *     iqrThreshold,   // number — umbral moderado (opcional)
 *     iqrExtreme,     // number — umbral extremo  (opcional)
 *     extraBadges,    // array  — [{ label, value, color }] badges adicionales (opcional)
 *     morphoData,     // object — { bolton, archForm, occlusion, symmetry } (opcional)
 *     invalidation,   // Promise — Observable invalidation para auto-cierre (opcional)
 *     allItems,       // array  — lista completa de items para navegación prev/next (opcional)
 *     currentIndex,   // number — índice del item actual en allItems (opcional)
 *   });
 *
 * Navegación: si se pasan `allItems` y `currentIndex`, el modal muestra un footer con
 * botones "← Anterior" / "Siguiente →" y un indicador "X de Y". Los items en `allItems`
 * deben tener la estructura:
 *   { id, pantoMeta, toothStats, zScores, rankInfo, iqrThreshold, iqrExtreme, extraBadges, morphoData }
 */
import * as d3 from "d3";
import { pantoSchematic } from "./panto-schematic.js";
import { miniOdontograma } from "./mini-odontograma.js";
import { createTabs } from "./tabs.js";

const ALL_FDI = [
  ...Array.from({length: 8}, (_, i) => 11 + i),
  ...Array.from({length: 8}, (_, i) => 21 + i),
  ...Array.from({length: 8}, (_, i) => 31 + i),
  ...Array.from({length: 8}, (_, i) => 41 + i),
];

const IQR_COLOR_MOD = "#e15759";
const IQR_COLOR_EXT = "#c0392b";
const IQR_COLOR_OK  = "#4c78a8";

function zBadge(label, val, iqrThreshold, iqrExtreme, fallbackColor = IQR_COLOR_OK) {
  if (val == null) return "";
  const color = val >= (iqrExtreme ?? Infinity)    ? IQR_COLOR_EXT
               : val >= (iqrThreshold ?? Infinity)  ? IQR_COLOR_MOD
               : fallbackColor;
  return `<span style="display:inline-flex;align-items:center;gap:4px;background:${color}18;border:1px solid ${color}44;border-radius:4px;padding:2px 7px;margin:2px;font-size:0.78rem;">` +
         `<span style="color:${color};font-weight:600;">${label}</span>` +
         `<span style="color:#333;">${Number(val).toFixed(4)}</span></span>`;
}

export async function openPantoModal({
  id,
  pantoMeta = null,
  toothStats = null,
  zScores = null,
  rankInfo = null,
  iqrThreshold = null,
  iqrExtreme = null,
  extraBadges = [],
  morphoData = null,
  invalidation = null,
  onClose = null,
  allItems = null,
  currentIndex = null,
} = {}) {
  if (!id) return;

  // ── Fetch geometry data ─────────────────────────────────────────────────
  let geomData = null;
  try {
    const resp = await fetch(`_file/data/pantos_geometry/${id}.json`);
    if (resp.ok) geomData = await resp.json();
  } catch(_) {}

  // ── Overlay & modal DOM ─────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;" +
    "display:flex;align-items:center;justify-content:center;";

  const modal = document.createElement("div");
  modal.style.cssText =
    "background:#fff;border-radius:10px;padding:1.5rem 1.8rem;" +
    "max-width:min(980px,95vw);max-height:92vh;overflow-y:auto;" +
    "position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.35);";

  const close = () => { overlay.remove(); onClose?.(); };

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText =
    "position:absolute;top:10px;right:14px;font-size:22px;" +
    "border:none;background:none;cursor:pointer;color:#888;line-height:1;";
  closeBtn.addEventListener("click", close);
  modal.appendChild(closeBtn);

  // ── Header: ID + metadata + odontograma ────────────────────────────────
  const toothNumbers = pantoMeta?.tooth_numbers ?? [];
  const presentSet = new Set(toothNumbers);
  const missing = ALL_FDI.filter(f => !presentSet.has(f));
  const nPermanent = ALL_FDI.filter(f => presentSet.has(f)).length;
  const nTemporary = toothNumbers.filter(f => f >= 51 && f <= 85).length;
  const nSuper = geomData?.shapes?.filter(s => s.et === "tooth" && s.es === "supernumerary").length ?? 0;

  const headerGrid = document.createElement("div");
  headerGrid.style.cssText =
    "display:grid;grid-template-columns:1fr auto;gap:16px;" +
    "align-items:start;margin-bottom:0.6rem;padding-right:1.5rem;";

  const metaDiv = document.createElement("div");
  metaDiv.innerHTML =
    `<div style="font-family:monospace;font-size:0.82rem;font-weight:700;margin-bottom:4px;">${id}</div>` +
    `<div style="font-size:0.82rem;color:#666;">` +
      `${pantoMeta?.categoria ?? "–"} · ${pantoMeta?.denticion ?? zScores?.sex ?? "–"} · ` +
      `${nPermanent} perm.${missing.length > 0 ? ` (${missing.length} faltantes)` : ""}` +
      (nTemporary > 0 ? ` · ${nTemporary} temp.` : "") +
      (nSuper > 0 ? ` · <span style="color:#e07020;font-weight:600;">${nSuper} supernumerario${nSuper > 1 ? "s" : ""}</span>` : "") +
    `</div>`;

  const odontDiv = document.createElement("div");
  odontDiv.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;gap:3px;";
  odontDiv.appendChild(miniOdontograma({ toothNumbers, cellSize: 14, gap: 2 }));
  const countParts = [`${nPermanent} perm. · ${missing.length} faltantes`];
  if (nTemporary > 0) countParts.push(`${nTemporary} temp.`);
  if (nSuper > 0) countParts.push(`${nSuper} supernum.`);
  odontDiv.innerHTML +=
    `<span style="font-size:11px;color:#888;text-align:right;">${countParts.join(" · ")}</span>`;

  headerGrid.append(metaDiv, odontDiv);
  modal.appendChild(headerGrid);

  // ── Z-score badges ──────────────────────────────────────────────────────
  if (zScores) {
    const badgesDiv = document.createElement("div");
    badgesDiv.style.cssText = "display:flex;flex-wrap:wrap;margin-bottom:0.5rem;";
    badgesDiv.innerHTML =
      zBadge("z̄",     zScores.z_mean, iqrThreshold, iqrExtreme, "#54a24b") +
      zBadge("z_pos",  zScores.z_pos,  iqrThreshold, iqrExtreme, IQR_COLOR_OK) +
      zBadge("z_ang",  zScores.z_ang,  iqrThreshold, iqrExtreme, "#7b52ab") +
      (rankInfo
        ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#f0f0f0;` +
          `border:1px solid #ddd;border-radius:4px;padding:2px 7px;margin:2px;font-size:0.78rem;">` +
          `<span style="color:#666;font-weight:600;">Rank atipicidad</span>` +
          `<span style="color:#333;">#${rankInfo.rank_atypical} / ${rankInfo.total}</span></span>`
        : "") +
      extraBadges.map(b =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:${b.color}18;` +
        `border:1px solid ${b.color}44;border-radius:4px;padding:2px 7px;margin:2px;font-size:0.78rem;">` +
        `<span style="color:${b.color};font-weight:600;">${b.label}</span>` +
        `<span style="color:#333;">${b.value}</span></span>`
      ).join("");
    modal.appendChild(badgesDiv);
  }

  // ── Patologías ──────────────────────────────────────────────────────────
  // NOTA (U-016 revisión UX 2026-05-21): La paleta de patologías en el modal
  // es **monocromática** (naranja genérico #e07020 para todas), no cualitativa
  // (un color distinto por tipo de patología). Esto es **intencional**:
  //
  //   - El contexto del modal es **identify/compare por diente** (el usuario
  //     está viendo *un* individuo y quiere saber qué patologías tiene cada
  //     pieza). El color distintivo por patología no aporta: solo importa
  //     cuántas patologías hay (count) y cuáles son (label).
  //
  //   - Una paleta cualitativa (ej. Caries=rojo, Restauración=azul) podría
  //     confundir al usuario al compararla con el **heatmap de prevalencia**
  //     en /patologias, que usa paleta **secuencial** (blanco → azul oscuro)
  //     para codificar magnitud (prevalencia %). Ambas visualizaciones usan
  //     tareas visuales distintas (identify vs. magnitude), por lo que sus
  //     paletas no deben coincidir.
  //
  //   - Si alguna vez se implementa paleta cualitativa por patología en otra
  //     vista (ej. comparación lado-a-lado de individuos con/sin patología),
  //     usar colores de Tableau 10 consistentes + documentar la distinción.
  //
  if (pantoMeta?.flags && Object.keys(pantoMeta.flags).length > 0) {
    const flagsDiv = document.createElement("div");
    flagsDiv.style.marginBottom = "0.6rem";
    flagsDiv.innerHTML =
      `<span style="font-size:11px;color:#888;font-weight:600;margin-right:6px;">Patologías:</span>` +
      Object.entries(pantoMeta.flags).map(([k, v]) =>
        `<span style="background:#fff5f0;border:1px solid #f4a46033;border-radius:3px;` +
        `padding:1px 6px;font-size:0.77rem;margin:2px;display:inline-flex;gap:3px;">` +
        `<span style="color:#e07020;">${k}</span><span style="color:#888;">(${v})</span></span>`
      ).join("");
    modal.appendChild(flagsDiv);
  }

  // ── Sistema de tabs (SUG-007) ───────────────────────────────────────────
  
  // Estado de visualización compartido entre tabs
  const vizState = {
    showPolygon:         false,
    showCentroids:       true,
    showEigenLabels:     true,
    showSupernumeraries: false,
    showTemporary:       false,
    showEigendentadura:  true,
    showPopEllipses:     false,
    showLabels:          false,
  };

  const schContainer = document.createElement("div");

  function renderSchematic() {
    const prevSvg = schContainer.querySelector("svg");
    const savedTransform = prevSvg ? d3.zoomTransform(prevSvg) : null;
    pantoSchematic(schContainer, geomData, {
      showBbox:            false,
      showPolygon:         vizState.showPolygon,
      showCentroids:       vizState.showCentroids,
      showLabels:          vizState.showLabels,
      showEigenLabels:     vizState.showEigenLabels,
      showSupernumeraries: vizState.showSupernumeraries,
      showTemporary:       vizState.showTemporary,
      showPopEllipses:     vizState.showPopEllipses,
      showDividers:        true,
      showCurve:           false,
      showLandmarks:       false,
      showEigendentadura:  vizState.showEigendentadura,
      eigendentaduraStats: toothStats,
      thinStrokes:         true,
      initialTransform:    savedTransform,
    });
  }

  function makeToggle(label, key) {
    const btn = document.createElement("button");
    const update = () => {
      btn.style.background  = vizState[key] ? "#e8f0fe" : "#f5f5f5";
      btn.style.color       = vizState[key] ? "#2a5db0" : "#666";
      btn.style.borderColor = vizState[key] ? "#4c78a8" : "#ccc";
    };
    btn.textContent = label;
    btn.style.cssText =
      "padding:3px 10px;border:1px solid;border-radius:4px;cursor:pointer;" +
      "font-size:12px;transition:all 0.1s;";
    update();
    btn.addEventListener("click", () => {
      vizState[key] = !vizState[key];
      update();
      if (geomData) renderSchematic();
    });
    return btn;
  }

  // ── Tab 1: Geometría ────────────────────────────────────────────────────
  function createGeometryTab() {
    const tabContent = document.createElement("div");
    
    const hint = document.createElement("div");
    hint.textContent = "Scroll para zoom · Drag para mover · Doble-clic para resetear";
    hint.style.cssText = "font-size:11px;color:#aaa;margin-bottom:8px;";
    tabContent.appendChild(hint);
    
    const schContainerClone = schContainer.cloneNode(false);
    tabContent.appendChild(schContainerClone);
    schContainer.parentElement?.replaceChild(schContainerClone, schContainer);
    Object.assign(schContainer, schContainerClone);
    
    if (geomData) {
      renderSchematic();
    } else {
      schContainer.innerHTML =
        `<p style="color:#aaa;font-style:italic;padding:1rem 0;">Sin datos de geometría disponibles.</p>`;
    }
    
    // Z-scores por diente (colapsable)
    const teeth = zScores?.teeth ?? [];
    if (teeth.length > 0) {
      const teethSorted = [...teeth].sort((a, b) => b.z_total - a.z_total);
      const det = document.createElement("details");
      det.style.marginTop = "0.8rem";
      const sum = document.createElement("summary");
      sum.style.cssText = "cursor:pointer;font-size:12px;color:#555;font-weight:600;";
      sum.textContent = `Z-scores por diente (${teethSorted.length} dientes)`;
      det.appendChild(sum);

      const tableWrap = document.createElement("div");
      tableWrap.style.cssText = "overflow-x:auto;margin-top:6px;";
      tableWrap.innerHTML =
        `<table style="border-collapse:collapse;font-size:11px;width:100%;">` +
        `<thead><tr style="border-bottom:1px solid #eee;">` +
          `<th style="text-align:left;padding:3px 8px;color:#888;">FDI</th>` +
          `<th style="text-align:right;padding:3px 8px;color:#888;">z_total</th>` +
          `<th style="text-align:right;padding:3px 8px;color:#888;">z_cx</th>` +
          `<th style="text-align:right;padding:3px 8px;color:#888;">z_cy</th>` +
          `<th style="text-align:right;padding:3px 8px;color:#888;">z_angle</th>` +
        `</tr></thead><tbody>` +
        teethSorted.map(t => {
          const bg = t.z_total > 3 ? "#fff5f5" : t.z_total > 2 ? "#fffbf0" : "transparent";
          return `<tr style="border-bottom:1px solid #f5f5f5;background:${bg};">` +
            `<td style="padding:3px 8px;font-weight:600;color:#4c78a8;">${t.fdi}</td>` +
            `<td style="text-align:right;padding:3px 8px;font-weight:600;color:${t.z_total > 2 ? "#e15759" : "#333"};">${t.z_total.toFixed(3)}</td>` +
            `<td style="text-align:right;padding:3px 8px;color:#555;">${t.z_cx?.toFixed(3) ?? "–"}</td>` +
            `<td style="text-align:right;padding:3px 8px;color:#555;">${t.z_cy?.toFixed(3) ?? "–"}</td>` +
            `<td style="text-align:right;padding:3px 8px;color:#555;">${t.z_angle?.toFixed(3) ?? "–"}</td>` +
          `</tr>`;
        }).join("") +
        `</tbody></table>`;
      det.appendChild(tableWrap);
      tabContent.appendChild(det);
    }
    
    return tabContent;
  }

  // ── Tab 2: Morfometría ──────────────────────────────────────────────────
  function createMorphometryTab() {
    const tabContent = document.createElement("div");
    tabContent.style.cssText = "padding:0.5rem 0;";
    
    if (!morphoData || Object.keys(morphoData).length === 0) {
      tabContent.innerHTML =
        `<p style="color:#aaa;font-style:italic;padding:1rem 0;">` +
        `Datos morfométricos no disponibles para esta pantomografía.</p>`;
      return tabContent;
    }

    const sectionStyle = "margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid #f0f0f0;";
    const titleStyle = "margin:0 0 0.5rem;font-size:0.9rem;color:#333;font-weight:600;";
    const infoStyle = "font-size:0.82rem;color:#555;line-height:1.6;";

    const fmt = (v, digits = 2) =>
      v == null || !Number.isFinite(v) ? "–" : v.toFixed(digits);
    const zFlag = (z) => {
      if (z == null || !Number.isFinite(z)) return "";
      const abs = Math.abs(z);
      const color = abs > 2 ? "#e15759" : abs > 1 ? "#f28e2b" : "#999";
      return ` <span style="color:${color};font-size:0.75rem;">(z=${z >= 0 ? "+" : ""}${z.toFixed(2)})</span>`;
    };

    let renderedAny = false;

    // ── Forma de arcada (per-individual, unidades intercondilares) ────────
    if (morphoData.archForm) {
      const a = morphoData.archForm;
      const archSection = document.createElement("div");
      archSection.style.cssText = sectionStyle;
      const archTitle = document.createElement("h4");
      archTitle.textContent = "Forma de arcada";
      archTitle.style.cssText = titleStyle;
      archSection.appendChild(archTitle);

      const archInfo = document.createElement("div");
      archInfo.style.cssText = infoStyle;
      const clusterLabels = ["plana", "intermedia", "profunda"];
      const clusterLabel = (a.depthCluster != null)
        ? clusterLabels[a.depthCluster] ?? `cluster ${a.depthCluster}`
        : null;
      archInfo.innerHTML =
        (clusterLabel
          ? `<div><strong>Profundidad de arcada:</strong> <span style="color:#4c78a8;font-weight:600;">${clusterLabel}</span>` +
            ` <span style="color:#888;font-size:0.78rem;">(arch_depth_cluster=${a.depthCluster})</span></div>`
          : "") +
        `<div><strong>Score profundidad:</strong> ${fmt(a.depthScore, 3)}` +
        ` <span style="color:#888;font-size:0.78rem;">(unidades intercondilares)</span></div>` +
        `<div style="margin-top:6px;color:#666;font-size:0.78rem;">Maxilar</div>` +
        `<div style="padding-left:0.6rem;">` +
          `Profundidad: ${fmt(a.maxDepth, 3)} · Anchura: ${fmt(a.maxWidth, 3)}` +
        `</div>` +
        `<div style="margin-top:4px;color:#666;font-size:0.78rem;">Mandibular</div>` +
        `<div style="padding-left:0.6rem;">` +
          `Profundidad: ${fmt(a.manDepth, 3)} · Anchura: ${fmt(a.manWidth, 3)}` +
        `</div>`;
      archSection.appendChild(archInfo);
      tabContent.appendChild(archSection);
      renderedAny = true;
    }

    // ── Oclusión ──────────────────────────────────────────────────────────
    if (morphoData.occlusion) {
      const o = morphoData.occlusion;
      const occSection = document.createElement("div");
      occSection.style.cssText = sectionStyle;
      const occTitle = document.createElement("h4");
      occTitle.textContent = "Oclusión";
      occTitle.style.cssText = titleStyle;
      occSection.appendChild(occTitle);
      const occInfo = document.createElement("div");
      occInfo.style.cssText = infoStyle;
      occInfo.innerHTML =
        `<div><strong>Overjet:</strong> ${fmt(o.overjet, 4)}` +
        ` <span style="color:#888;font-size:0.78rem;">(unidades intercondilares)</span></div>` +
        `<div><strong>Overbite:</strong> ${fmt(o.overbite, 4)}` +
        ` <span style="color:#888;font-size:0.78rem;">(unidades intercondilares)</span></div>`;
      occSection.appendChild(occInfo);
      tabContent.appendChild(occSection);
      renderedAny = true;
    }

    // ── Bolton ────────────────────────────────────────────────────────────
    if (morphoData.bolton) {
      const b = morphoData.bolton;
      const boltonSection = document.createElement("div");
      boltonSection.style.cssText = sectionStyle;
      const boltonTitle = document.createElement("h4");
      boltonTitle.textContent = "Índice de Bolton";
      boltonTitle.style.cssText = titleStyle;
      boltonSection.appendChild(boltonTitle);
      const boltonInfo = document.createElement("div");
      boltonInfo.style.cssText = infoStyle;
      const anteriorAvail = b.anteriorComplete !== false && b.anteriorRatio != null;
      const overallAvail  = b.overallComplete !== false && b.overallRatio != null;
      boltonInfo.innerHTML =
        (anteriorAvail
          ? `<div><strong>Anterior:</strong> ${fmt(b.anteriorRatio, 2)} %${zFlag(b.anteriorZ)}` +
            ` <span style="color:#888;font-size:0.78rem;">(norma 77,2 ± 1,65 %)</span></div>`
          : `<div><strong>Anterior:</strong> <span style="color:#aaa;">no calculable (faltan dientes)</span></div>`) +
        (overallAvail
          ? `<div><strong>Total:</strong> ${fmt(b.overallRatio, 2)} %${zFlag(b.overallZ)}` +
            ` <span style="color:#888;font-size:0.78rem;">(norma 91,3 ± 1,91 %)</span></div>`
          : `<div><strong>Total:</strong> <span style="color:#aaa;">no calculable (faltan dientes)</span></div>`) +
        `<div style="margin-top:6px;color:#888;font-size:0.75rem;">` +
          `Aproximación 2D (lado corto de minbbox).` +
        `</div>`;
      boltonSection.appendChild(boltonInfo);
      tabContent.appendChild(boltonSection);
      renderedAny = true;
    }

    if (!renderedAny) {
      tabContent.innerHTML =
        `<p style="color:#aaa;font-style:italic;padding:1rem 0;">` +
        `Datos morfométricos no disponibles para esta pantomografía.</p>`;
    }

    return tabContent;
  }

  // ── Tab 3: Visualización ────────────────────────────────────────────────
  function createVisualizationTab() {
    const tabContent = document.createElement("div");
    tabContent.style.cssText = "padding:0.5rem 0;";
    
    if (!geomData) {
      tabContent.innerHTML =
        `<p style="color:#aaa;font-style:italic;padding:1rem 0;">Sin datos de geometría disponibles.</p>`;
      return tabContent;
    }
    
    const togglesDiv = document.createElement("div");
    togglesDiv.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;align-items:center;" +
      "padding:0 0 8px;margin-bottom:8px;";
    
    const lbl = document.createElement("span");
    lbl.style.cssText = "font-size:11px;color:#888;margin-right:2px;";
    lbl.textContent = "Capas:";
    togglesDiv.appendChild(lbl);
    
    togglesDiv.appendChild(makeToggle("Contornos",             "showPolygon"));
    togglesDiv.appendChild(makeToggle("Centroides",            "showCentroids"));
    togglesDiv.appendChild(makeToggle("Etiquetas FDI",         "showLabels"));
    togglesDiv.appendChild(makeToggle("Temporales",            "showTemporary"));
    togglesDiv.appendChild(makeToggle("Supernumerarios",       "showSupernumeraries"));
    togglesDiv.appendChild(makeToggle("Centroides eigendent.", "showEigendentadura"));
    togglesDiv.appendChild(makeToggle("Elipses población",     "showPopEllipses"));
    
    tabContent.appendChild(togglesDiv);
    
    const hint = document.createElement("div");
    hint.textContent = "Los controles de visualización afectan al schematic del tab Geometría.";
    hint.style.cssText = "font-size:11px;color:#aaa;margin-bottom:8px;padding:8px;background:#f9f9f9;border-radius:4px;";
    tabContent.appendChild(hint);
    
    const schContainerClone = schContainer.cloneNode(true);
    tabContent.appendChild(schContainerClone);
    
    return tabContent;
  }

  // Crear tabs
  const tabs = [
    { id: "geometry", label: "Geometría", icon: "📊", content: createGeometryTab },
    { id: "morphometry", label: "Morfometría", icon: "🦷", content: createMorphometryTab },
    { id: "visualization", label: "Visualización", icon: "🔬", content: createVisualizationTab },
  ];
  
  const tabsContainer = createTabs(tabs, "geometry");
  modal.appendChild(tabsContainer);

  // ── Footer de navegación ────────────────────────────────────────────────
  if (allItems && currentIndex != null) {
    const navFooter = document.createElement("div");
    navFooter.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;" +
      "margin-top:1rem;padding-top:0.8rem;border-top:1px solid #e5e5ec;";
    
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "← Anterior";
    prevBtn.disabled = currentIndex === 0;
    prevBtn.style.cssText =
      "padding:6px 14px;border:1px solid #ccc;border-radius:5px;" +
      "background:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;color:#555;" +
      "transition:all 0.15s;" +
      (currentIndex === 0 ? "opacity:0.4;cursor:not-allowed;" : "");
    if (currentIndex > 0) {
      prevBtn.style.cssText += "hover:background:#f5f5f5;hover:border-color:#4c78a8;";
    }
    
    const indicator = document.createElement("span");
    indicator.textContent = `${currentIndex + 1} de ${allItems.length}`;
    indicator.style.cssText = "font-size:0.85rem;color:#666;font-weight:600;";
    
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "Siguiente →";
    nextBtn.disabled = currentIndex === allItems.length - 1;
    nextBtn.style.cssText =
      "padding:6px 14px;border:1px solid #ccc;border-radius:5px;" +
      "background:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;color:#555;" +
      "transition:all 0.15s;" +
      (currentIndex === allItems.length - 1 ? "opacity:0.4;cursor:not-allowed;" : "");
    if (currentIndex < allItems.length - 1) {
      nextBtn.style.cssText += "hover:background:#f5f5f5;hover:border-color:#4c78a8;";
    }
    
    // Navegación prev/next
    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        close();
        const prevItem = allItems[currentIndex - 1];
        openPantoModal({
          id: prevItem.id,
          pantoMeta: prevItem.pantoMeta,
          toothStats: prevItem.toothStats,
          zScores: prevItem.zScores,
          rankInfo: prevItem.rankInfo,
          iqrThreshold: prevItem.iqrThreshold,
          iqrExtreme: prevItem.iqrExtreme,
          extraBadges: prevItem.extraBadges,
          morphoData: prevItem.morphoData,
          invalidation,
          onClose,
          allItems,
          currentIndex: currentIndex - 1,
        });
      }
    });
    
    nextBtn.addEventListener("click", () => {
      if (currentIndex < allItems.length - 1) {
        close();
        const nextItem = allItems[currentIndex + 1];
        openPantoModal({
          id: nextItem.id,
          pantoMeta: nextItem.pantoMeta,
          toothStats: nextItem.toothStats,
          zScores: nextItem.zScores,
          rankInfo: nextItem.rankInfo,
          iqrThreshold: nextItem.iqrThreshold,
          iqrExtreme: nextItem.iqrExtreme,
          extraBadges: nextItem.extraBadges,
          morphoData: nextItem.morphoData,
          invalidation,
          onClose,
          allItems,
          currentIndex: currentIndex + 1,
        });
      }
    });
    
    navFooter.append(prevBtn, indicator, nextBtn);
    modal.appendChild(navFooter);
  }

  // ── Montar y cleanup ────────────────────────────────────────────────────
  overlay.appendChild(modal);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  if (invalidation) invalidation.then(() => overlay.remove());
}
