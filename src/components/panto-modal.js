/**
 * PantoModal — modal estándar para visualizar pantomografías.
 *
 * Uso:
 *   import { openPantoModal } from "./components/panto-modal.js";
 *
 *   openPantoModal({
 *     id,           // string — ID corto de la panto (sin prefijo/sufijo)
 *     pantoMeta,    // object — entrada de pantos_browser.json
 *     toothStats,   // array  — tooth_stats.json (para eigendentadura)
 *     zScores,      // object — { z_mean, z_pos, z_ang, z_max, teeth }  (opcional)
 *     rankInfo,     // object — { rank_atypical, rank_typical, total }   (opcional)
 *     iqrThreshold, // number — umbral moderado (opcional)
 *     iqrExtreme,   // number — umbral extremo  (opcional)
 *     extraBadges,  // array  — [{ label, value, color }] badges adicionales (opcional)
 *     invalidation, // Promise — Observable invalidation para auto-cierre (opcional)
 *   });
 */
import * as d3 from "d3";
import { pantoSchematic } from "./panto-schematic.js";
import { miniOdontograma } from "./mini-odontograma.js";

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
  invalidation = null,
  onClose = null,
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

  // ── Toggles de visualización ────────────────────────────────────────────
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

  const togglesDiv = document.createElement("div");
  togglesDiv.style.cssText =
    "display:flex;flex-wrap:wrap;gap:6px;align-items:center;" +
    "padding:6px 0 8px;border-top:1px solid #f0f0f0;margin-bottom:6px;";

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

  if (geomData) {
    const lbl = document.createElement("span");
    lbl.style.cssText = "font-size:11px;color:#888;margin-right:2px;";
    lbl.textContent = "Mostrar:";
    togglesDiv.appendChild(lbl);
    togglesDiv.appendChild(makeToggle("Contornos",             "showPolygon"));
    togglesDiv.appendChild(makeToggle("Centroides",            "showCentroids"));
    togglesDiv.appendChild(makeToggle("Etiquetas FDI",         "showLabels"));
    togglesDiv.appendChild(makeToggle("Temporales",            "showTemporary"));
    togglesDiv.appendChild(makeToggle("Supernumerarios",       "showSupernumeraries"));
    togglesDiv.appendChild(makeToggle("Centroides eigendent.", "showEigendentadura"));
    togglesDiv.appendChild(makeToggle("Elipses población",     "showPopEllipses"));
    modal.appendChild(togglesDiv);
  }

  // ── Hint ────────────────────────────────────────────────────────────────
  const hint = document.createElement("div");
  hint.textContent = "Scroll para zoom · Drag para mover · Doble-clic para resetear";
  hint.style.cssText = "font-size:11px;color:#aaa;margin-bottom:6px;";
  modal.appendChild(hint);

  // ── Schematic ───────────────────────────────────────────────────────────
  modal.appendChild(schContainer);

  if (geomData) {
    renderSchematic();
  } else {
    schContainer.innerHTML =
      `<p style="color:#aaa;font-style:italic;padding:1rem 0;">Sin datos de geometría disponibles.</p>`;
  }

  // ── Z-scores por diente (colapsable) ────────────────────────────────────
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
    modal.appendChild(det);
  }

  // ── Montar y cleanup ────────────────────────────────────────────────────
  overlay.appendChild(modal);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  if (invalidation) invalidation.then(() => overlay.remove());
}
