---
title: Análisis de casos atípicos
---

# Análisis de casos atípicos

¿Qué hace a una dentadura "típica" o "atípica"? Esta sección analiza la distribución de la **tipicidad posicional y angular** en la población completa, identifica las dentaduras más y menos representativas, y permite visualizarlas sobre la eigendentadura.

**${individuals.length.toLocaleString("es-AR")} pantomografías** con z-scores calculados (posición y ángulo de cada diente relativo a la media poblacional).

```js
import {atipicalityScatter} from "./components/atipicality-scatter.js";
import {pantoSchematic} from "./components/panto-schematic.js";
import * as d3 from "d3";
```

```js
const toothStats         = await FileAttachment("data/tooth_stats.json").json();
const typicalityExtremes = await FileAttachment("data/typicality_extremes.json").json();
const individuals        = await FileAttachment("data/individual_scores.json").json();
const geoPathData        = await FileAttachment("data/geo_patologia.json").json();
const pantosRaw          = await FileAttachment("data/pantos_browser.json").json();
```

```js
// Mapas de datos auxiliares
const nPathMap  = new Map(geoPathData.records.map(r => [r.id, r.n_pathologies]));
const pantosMap = new Map(pantosRaw.pantos.map(p => [p.archivo, p]));

function extractGeoId(fn) {
  const m = fn?.match(/database_original__(.+?)__json_url\.json/);
  return m?.[1] ?? null;
}

function simplifyFn(fn) {
  return fn?.replace(/^database_original__/, "").replace(/__json_url\.json$/, "") ?? fn;
}

const individualsEnriched = individuals.map(d => {
  const geoId = extractGeoId(d.json_filename);
  const pb    = geoId ? pantosMap.get(geoId) : null;
  return {
    ...d,
    n_pathologies:    nPathMap.get(geoId) ?? null,
    pb_flags:         pb?.flags         ?? null,
    pb_tooth_numbers: pb?.tooth_numbers ?? null,
  };
});
```

```js
// Cómputo IQR sobre dentaduras elegibles (≥10 dientes)
const zEligible = individualsEnriched
  .filter(d => d.n_teeth >= 10 && d.z_mean != null)
  .map(d => d.z_mean)
  .sort(d3.ascending);

const iqrQ1        = d3.quantile(zEligible, 0.25);
const iqrQ3        = d3.quantile(zEligible, 0.75);
const iqrVal       = iqrQ3 - iqrQ1;
const iqrThreshold = iqrQ3 + 1.5 * iqrVal;   // ~2.80 — outliers moderados
const iqrExtreme   = iqrQ3 + 3.0 * iqrVal;   // ~3.79 — outliers extremos

// Ranking completo por z_mean descendente
const sortedDesc = [...individualsEnriched]
  .filter(d => d.n_teeth >= 10 && d.z_mean != null)
  .sort((a, b) => b.z_mean - a.z_mean);

const rankAtypMap = new Map(sortedDesc.map((d, i) => [d.json_filename, {
  rank_atypical: i + 1,
  rank_typical:  sortedDesc.length - i,
  total:         sortedDesc.length,
}]));
```

## Atipicidad posicional vs angular — población completa

¿Son los pacientes atípicos por su **posición** dental, por su **ángulo** de rotación, o por ambas cosas?
Cada punto es una pantomografía. Las líneas punteadas marcan la mediana de la población en cada eje. Los círculos en rojo son outliers (z̄ ≥ Q3 + 1.5·IQR).

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X (z_pos)** — atipicidad posicional: desvío promedio de los centroides dentales respecto a la media poblacional, en desvíos estándar. Valores altos = dientes muy desplazados de su posición típica.
- **Eje Y (z_ang)** — atipicidad angular: desvío medio del ángulo de cada diente respecto al ángulo poblacional.
- **Líneas punteadas** — mediana de la población en cada eje; dividen el espacio en 4 cuadrantes.
- **Anillo rojo** — outliers formales (z̄ ≥ Q3 + 1.5·IQR); ver criterio en la sección siguiente.
- **Color** — codificado según el selector.

Un paciente en el cuadrante superior derecho tiene dientes desplazados _y_ rotados respecto a la distribución esperada. Hacé clic en cualquier punto para ver la pantomografía de esa dentadura.

</details>

```js
const colorByInput = Inputs.select(
  new Map([
    ["Atipicidad (z̄)", "atipicidad"],
    ["N° de dientes",   "n_teeth"],
    ["N° de patologías","n_pathologies"],
    ["Centro clínico",  "origin"],
    ["Sexo",            "sex"],
  ]),
  {label: "Colorear por", value: "atipicidad"}
);
const colorBy = Generators.input(colorByInput);
display(colorByInput);
```

```js
const minTeethInput = Inputs.range([4, 32], {label: "Mínimo de dientes", step: 1, value: 10});
const minTeeth = Generators.input(minTeethInput);
display(minTeethInput);
```

```js
const clickedIndividual = Mutable(null);
function setClickedIndividual(d) { clickedIndividual.value = d; }
function clearClickedIndividual() { clickedIndividual.value = null; }
```

```js
display(atipicalityScatter(individualsEnriched, {
  width: Math.min(width, 700),
  height: 460,
  colorBy,
  minTeeth,
  selectedPanto: null,
  onClickPanto: setClickedIndividual,
  threshold: iqrThreshold,
}));
```

```js
{
  const clicked = clickedIndividual;
  const id      = extractGeoId(clicked?.json_filename);

  if (clicked && id) {
    let geomData = null;
    try {
      const resp = await fetch(`_file/data/pantos_geometry/${id}.json`);
      if (resp.ok) geomData = await resp.json();
    } catch(e) {}

    if (geomData) {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;";

      const modal = document.createElement("div");
      modal.style.cssText = "background:white;border-radius:10px;padding:1.5rem;max-width:min(980px,95vw);max-height:92vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.35);";

      const close = () => { overlay.remove(); clearClickedIndividual(); };

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      closeBtn.style.cssText = "position:absolute;top:10px;right:14px;font-size:22px;border:none;background:none;cursor:pointer;color:#888;line-height:1;";
      closeBtn.addEventListener("click", close);

      // — Z-score badge helper ——————————————————————————
      function zBadge(label, val, color = "#4c78a8") {
        const lvl = val >= iqrExtreme ? "#c0392b" : val >= iqrThreshold ? "#e15759" : color;
        return `<span style="display:inline-flex;align-items:center;gap:4px;background:${lvl}18;border:1px solid ${lvl}44;border-radius:4px;padding:2px 7px;margin-right:6px;margin-bottom:4px;font-size:0.78rem;">` +
          `<span style="color:${lvl};font-weight:600;">${label}</span>` +
          `<span style="color:#333;">${val.toFixed(4)}</span></span>`;
      }

      // — Ranking ———————————————————————————————————————
      const rankInfo = rankAtypMap.get(clicked.json_filename);
      const rankBadge = rankInfo
        ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#f0f0f0;border:1px solid #ddd;border-radius:4px;padding:2px 7px;margin-right:6px;margin-bottom:4px;font-size:0.78rem;"><span style="color:#666;font-weight:600;">Ranking atipicidad</span><span style="color:#333;">#${rankInfo.rank_atypical} / ${rankInfo.total}</span></span>`
        : "";

      // — Patologías ————————————————————————————————————
      const flags = clicked.pb_flags;
      let flagsHtml = "";
      if (flags && Object.keys(flags).length > 0) {
        const items = Object.entries(flags).map(([k, v]) =>
          `<span style="display:inline-flex;align-items:center;gap:3px;background:#fff5f0;border:1px solid #f4a46033;border-radius:3px;padding:1px 6px;font-size:0.77rem;margin:2px;">` +
          `<span style="color:#e07020;">${k}</span><span style="color:#888;">(${v})</span></span>`
        ).join("");
        flagsHtml = `<div style="margin-bottom:0.6rem;"><span style="font-size:11px;color:#888;font-weight:600;margin-right:6px;">Patologías:</span>${items}</div>`;
      } else {
        flagsHtml = `<div style="margin-bottom:0.6rem;font-size:11px;color:#aaa;">Sin patologías registradas</div>`;
      }

      // — Dientes faltantes ——————————————————————————————
      const ALL_FDI = [...Array.from({length:8},(_,i)=>11+i), ...Array.from({length:8},(_,i)=>21+i),
                       ...Array.from({length:8},(_,i)=>31+i), ...Array.from({length:8},(_,i)=>41+i)];
      const presentSet = new Set(clicked.pb_tooth_numbers ?? []);
      const missing = ALL_FDI.filter(f => !presentSet.has(f));
      let missingHtml = "";
      if (missing.length > 0) {
        const items = missing.map(f =>
          `<span style="display:inline-flex;background:#f5f5f5;border:1px solid #e5e5e5;border-radius:3px;padding:1px 5px;font-size:0.77rem;color:#888;margin:2px;">${f}</span>`
        ).join("");
        missingHtml = `<div style="margin-bottom:0.8rem;"><span style="font-size:11px;color:#888;font-weight:600;margin-right:6px;">Dientes faltantes (${missing.length}):</span>${items}</div>`;
      }

      const header = document.createElement("div");
      header.innerHTML =
        `<div style="margin-bottom:6px;padding-right:2rem;">` +
          `<strong style="font-family:monospace;font-size:0.82rem;">${id}</strong>` +
          `<span style="color:#777;font-size:0.82rem;margin-left:0.8rem;">${clicked.data_origin ?? "–"} · ${clicked.sex ?? "–"} · ${clicked.n_teeth} dientes</span>` +
        `</div>` +
        `<div style="margin-bottom:0.5rem;flex-wrap:wrap;display:flex;">` +
          zBadge("z̄", clicked.z_mean, "#54a24b") +
          zBadge("z_pos", clicked.z_pos, "#4c78a8") +
          zBadge("z_ang", clicked.z_ang, "#7b52ab") +
          rankBadge +
        `</div>` +
        flagsHtml +
        missingHtml;

      // — Tabla por diente ——————————————————————————————
      const teethSorted = [...(clicked.teeth ?? [])].sort((a, b) => b.z_total - a.z_total);
      const tableHtml = `<details style="margin-bottom:0.8rem;">
        <summary style="cursor:pointer;font-size:12px;color:#555;font-weight:600;">Z-scores por diente (${teethSorted.length} dientes)</summary>
        <div style="overflow-x:auto;margin-top:6px;">
        <table style="border-collapse:collapse;font-size:11px;width:100%;">
          <thead><tr style="border-bottom:1px solid #eee;">
            <th style="text-align:left;padding:3px 8px;color:#888;">FDI</th>
            <th style="text-align:right;padding:3px 8px;color:#888;">z_total</th>
            <th style="text-align:right;padding:3px 8px;color:#888;">z_cx</th>
            <th style="text-align:right;padding:3px 8px;color:#888;">z_cy</th>
            <th style="text-align:right;padding:3px 8px;color:#888;">z_angle</th>
          </tr></thead>
          <tbody>${teethSorted.map(t => {
            const bg = t.z_total > 3 ? "#fff5f5" : t.z_total > 2 ? "#fffbf0" : "transparent";
            return `<tr style="border-bottom:1px solid #f5f5f5;background:${bg};">
              <td style="padding:3px 8px;font-weight:600;color:#4c78a8;">${t.fdi}</td>
              <td style="text-align:right;padding:3px 8px;font-weight:600;color:${t.z_total > 2 ? "#e15759" : "#333"};">${t.z_total.toFixed(3)}</td>
              <td style="text-align:right;padding:3px 8px;color:#555;">${t.z_cx.toFixed(3)}</td>
              <td style="text-align:right;padding:3px 8px;color:#555;">${t.z_cy.toFixed(3)}</td>
              <td style="text-align:right;padding:3px 8px;color:#555;">${t.z_angle.toFixed(3)}</td>
            </tr>`;
          }).join("")}</tbody>
        </table></div></details>`;
      const tableDiv = document.createElement("div");
      tableDiv.innerHTML = tableHtml;

      const hint = document.createElement("div");
      hint.textContent = "Scroll para zoom · Drag para mover · Doble-clic para resetear · Círculos grises = eigendentadura (media poblacional)";
      hint.style.cssText = "font-size:11px;color:#aaa;margin-bottom:0.5rem;";

      const schContainer = document.createElement("div");
      pantoSchematic(schContainer, geomData, {
        showBbox: false,
        showPolygon: true,
        showCentroids: true,
        showLabels: true,
        showLandmarks: true,
        showDividers: true,
        showEigendentadura: true,
        eigendentaduraStats: toothStats,
      });

      modal.append(closeBtn, header, tableDiv, hint, schContainer);
      overlay.appendChild(modal);
      overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

      document.body.appendChild(overlay);
      invalidation.then(() => overlay.remove());
    }
  }
}
```

## Ranking de outliers — casos más atípicos

**Criterio**: z̄ ≥ Q3 + 1.5·IQR = **${iqrThreshold.toFixed(3)}** (Q1=${iqrQ1.toFixed(3)}, Q3=${iqrQ3.toFixed(3)}, IQR=${iqrVal.toFixed(3)}). Las **${sortedDesc.filter(d => d.z_mean >= iqrThreshold).length} dentaduras** que superan este umbral se consideran outliers. Hacé clic en una fila para ver la pantomografía.

```js
{
  const outliers = sortedDesc.filter(d => d.z_mean >= iqrThreshold);

  const container = d3.create("div").style("overflow-x", "auto");
  const table = container.append("table")
    .style("border-collapse", "collapse")
    .style("font-size", "12px")
    .style("width", "100%");

  table.append("thead").append("tr")
    .selectAll("th")
    .data(["#", "ID", "Centro", "Sexo", "Dientes", "z̄", "z_pos", "z_ang", "Patologías"])
    .join("th")
    .style("text-align", "left")
    .style("padding", "4px 8px")
    .style("border-bottom", "2px solid #eee")
    .style("color", "#888")
    .style("font-weight", "600")
    .style("white-space", "nowrap")
    .text(d => d);

  const tbody = table.append("tbody");
  tbody.selectAll("tr")
    .data(outliers)
    .join("tr")
    .style("cursor", "pointer")
    .style("border-bottom", "1px solid #f5f5f5")
    .on("click", (event, d) => setClickedIndividual(d))
    .on("mouseover", function() { d3.select(this).style("background", "#fdf5f5"); })
    .on("mouseout",  function() { d3.select(this).style("background", null); })
    .each(function(d, i) {
      const tr  = d3.select(this);
      const lvl = d.z_mean >= iqrExtreme ? "#c0392b" : "#e15759";
      tr.append("td").style("padding", "3px 8px").style("color", "#aaa").text(i + 1);
      tr.append("td").style("padding", "3px 8px").style("font-family", "monospace").style("font-size", "10px").text(simplifyFn(d.json_filename));
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.data_origin ?? "–");
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.sex ?? "–");
      tr.append("td").style("padding", "3px 8px").style("text-align", "right").text(d.n_teeth);
      tr.append("td").style("padding", "3px 8px").style("font-weight", "600").style("color", lvl).text(d.z_mean.toFixed(4));
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.z_pos.toFixed(4));
      tr.append("td").style("padding", "3px 8px").style("color", "#555").text(d.z_ang.toFixed(4));
      tr.append("td").style("padding", "3px 8px").style("color", "#888").style("font-size", "10px")
        .text(d.pb_flags ? Object.keys(d.pb_flags).join(", ") : "–");
    });

  display(container.node());
}
```

## Distribución de z̄ — histograma poblacional

Distribución de z̄ en las **${zEligible.length.toLocaleString("es-AR")} dentaduras elegibles**. Las barras rojas corresponden a los outliers (z̄ ≥ Q3 + 1.5·IQR = ${iqrThreshold.toFixed(3)}).

```js
const zoomOutliersInput = Inputs.toggle({label: "Zoom en cola de outliers", value: false});
const zoomOutliers = Generators.input(zoomOutliersInput);
display(zoomOutliersInput);
```

```js
{
  const xDomain = zoomOutliers
    ? [iqrThreshold - 0.3, d3.max(zEligible) + 0.1]
    : [0, d3.max(zEligible) + 0.1];
  display(Plot.plot({
    width: Math.min(width, 720),
    height: 300,
    marginBottom: 45,
    x: {label: "z̄ (score de tipicidad)", domain: xDomain},
    y: {label: "N° dentaduras"},
    color: {domain: ["Población", "Outliers (IQR)"], range: ["#4c78a8", "#e15759"], legend: true},
    marks: [
      Plot.rectY(
        individualsEnriched.filter(d => d.n_teeth >= 10 && d.z_mean != null),
        Plot.binX(
          {y: "count"},
          {x: "z_mean", fill: d => d.z_mean >= iqrThreshold ? "Outliers (IQR)" : "Población", thresholds: 60}
        )
      ),
      Plot.ruleX([iqrThreshold], {stroke: "#e15759", strokeDasharray: "5,3", strokeWidth: 1.5}),
      ...(iqrExtreme < d3.max(zEligible) ? [Plot.ruleX([iqrExtreme], {stroke: "#c0392b", strokeDasharray: "3,2", strokeWidth: 1})] : []),
    ],
  }));
}
```

<small>Línea roja punteada = umbral moderado (Q3 + 1.5·IQR = ${iqrThreshold.toFixed(3)}). Línea roja sólida = umbral extremo (Q3 + 3·IQR = ${iqrExtreme.toFixed(3)}). Activar "Zoom en cola" para ver la distribución de outliers en detalle.</small>

<div style="border-left: 4px solid #54a24b; background: #f7fff7; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La mayoría de los individuos son <strong>consistentemente típicos o consistentemente atípicos</strong> en posición y ángulo simultáneamente: la dentadura de un individuo tiende a ser globalmente regular o globalmente irregular, sin disociación marcada entre las dos dimensiones. Los outliers formales (z̄ ≥ Q3 + 1.5·IQR ≈ ${iqrThreshold.toFixed(2)}) se distribuyen sin concentración en ningún subgrupo clínico o demográfico particular.
</div>
