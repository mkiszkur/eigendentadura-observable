---
title: Morfometría clínica
---

# Morfometría clínica

¿Cuál es la forma de arcada predominante en esta población? ¿Qué tan simétrica es la dentadura media? Esta sección deriva métricas clínicas de la geometría dental: **forma de arcada**, **overbite / overjet**, **índice de Bolton** y **simetría bilateral**, sobre **${metadata.unique_pantos.toLocaleString("es-AR")} pantomografías** con landmarks condíleos.

```js
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
import {archForm, computeArchMetrics} from "./components/arch-form.js";
import {occlusionHistograms} from "./components/occlusion.js";
import {boltonHistograms} from "./components/bolton.js";
import {symmetryOverlay, symmetryBoxplot, mirrorFdi} from "./components/symmetry-plot.js";
import {quadrantOverlay} from "./components/quadrant-overlay.js";
import {pantoSchematic} from "./components/panto-schematic.js";
import {openPantoModal} from "./components/panto-modal.js";
import * as d3 from "d3";
```

```js
const toothStats         = await FileAttachment("data/tooth_stats.json").json();
const metadata           = await FileAttachment("data/metadata.json").json();
const symmetryData       = await FileAttachment("data/symmetry_pairs.json").json();
const occlusionData      = await FileAttachment("data/occlusion.json").json();
const boltonData         = await FileAttachment("data/bolton.json").json();
const occIndividuals     = await FileAttachment("data/occlusion_individuals.json").json();
const individualsRaw     = await FileAttachment("data/individual_scores.json").json();
const pantosRawM         = await FileAttachment("data/pantos_browser.json").json();
```

```js
// Lookup maps
const indivMapM   = new Map(individualsRaw.map(d => [d.json_filename, d]));
const pantosMapM  = new Map(pantosRawM.pantos.map(p => [p.archivo, p]));

function extractIdM(fn) {
  return fn?.match(/database_original__(.+?)__json_url\.json/)?.[1] ?? null;
}
function simplifyM(fn) {
  return fn?.replace(/^database_original__/, "").replace(/__json_url\.json$/, "") ?? fn;
}

// Enrich occlusion individuals with z-scores + pantos_browser data
const occEnriched = occIndividuals.map(d => {
  const indiv = indivMapM.get(d.json_filename);
  const id    = extractIdM(d.json_filename);
  const pb    = id ? pantosMapM.get(id) : null;
  return {...d, ...(indiv ? {z_mean: indiv.z_mean, z_pos: indiv.z_pos, z_ang: indiv.z_ang, teeth: indiv.teeth} : {}),
    pb_flags: pb?.flags ?? null, pb_tooth_numbers: pb?.tooth_numbers ?? null};
});

// Bolton individuals enriched
const boltEnriched = boltonData.individuals.filter(d => d.anterior_complete || d.overall_complete).map(d => {
  const indiv = indivMapM.get(d.json_filename);
  const id    = extractIdM(d.json_filename);
  const pb    = id ? pantosMapM.get(id) : null;
  return {...d, ...(indiv ? {z_mean: indiv.z_mean, data_origin: indiv.data_origin, sex: indiv.sex, n_teeth: indiv.n_teeth, teeth: indiv.teeth} : {}),
    pb_flags: pb?.flags ?? null, pb_tooth_numbers: pb?.tooth_numbers ?? null};
});
```

```js
const clickedMorfo = Mutable(null);
function setClickedMorfo(d) { clickedMorfo.value = d; }
function clearClickedMorfo() { clickedMorfo.value = null; }
```

```js
{
  const clicked = clickedMorfo;
  const id = extractIdM(clicked?.json_filename);
  if (clicked && id) {
    const pb = pantosMapM.get(id) ?? null;
    openPantoModal({
      id,
      pantoMeta: pb,
      toothStats,
      extraBadges: [
        ...(clicked.overjet  != null ? [{label: "overjet",       value: clicked.overjet.toFixed(4),  color: "#4c78a8"}] : []),
        ...(clicked.overbite != null ? [{label: "overbite",      value: clicked.overbite.toFixed(4), color: "#72b7b2"}] : []),
        ...(clicked.anterior_ratio != null ? [{label: "Bolton ant.", value: clicked.anterior_ratio.toFixed(2), color: "#f58518"}] : []),
        ...(clicked.overall_ratio  != null ? [{label: "Bolton overall", value: clicked.overall_ratio.toFixed(2), color: "#7b52ab"}] : []),
      ],
      zScores: clicked.z_mean != null ? {z_mean: clicked.z_mean} : null,
      onClose: clearClickedMorfo,
      invalidation,
    });
  }
}
```

```js
const selectedFdi = Mutable([...ALL_FDI]);
function toggleTooth(fdi) {
  const cur = selectedFdi.value;
  const idx = cur.indexOf(fdi);
  selectedFdi.value = idx >= 0 ? cur.filter(f => f !== fdi) : [...cur, fdi];
}
function setSelection(fdis) { selectedFdi.value = fdis; }
```

## Filtro de dientes

Seleccionar qué dientes se resaltan en los gráficos de esta sección.

```js
display(teethSelector({selected: selectedFdi, onToggle: toggleTooth, onSetSelection: setSelection, fdiNombres: {}}));
```

## Forma de arcada

Spline (Catmull–Rom) pasando por los centroides medios de cada arcada. Reporta medidas ortodónticas clásicas: **ancho intercanino** (13↔23 / 43↔33), **ancho intermolar** (16↔26 / 46↔36) y **profundidad de arco**. La forma se clasifica según la razón *profundidad / ancho intermolar*: **Cuadrada** (< 0.70), **Ovalada** (0.70–0.85), **Triangular** (> 0.85).

<details>
<summary>Cómo leer este gráfico</summary>

Spline suave (Catmull–Rom) pasando por los centroides medios de cada arcada.

- **Línea azul** — arcada maxilar (superior). **Línea roja** — arcada mandibular (inferior). Los puntos de cada diente se colorean por cuadrante FDI: <span style="color:#4e79a7">■</span> Q1 · <span style="color:#59a14f">■</span> Q2 · <span style="color:#edc949">■</span> Q3 · <span style="color:#e15759">■</span> Q4.
- **Forma de arcada** (entre paréntesis en la leyenda) — clasificación según ratio *profundidad / ancho intermolar*: **Cuadrada** (< 0.70), **Ovalada** (0.70–0.85), **Triangular** (> 0.85).
- **Líneas de medición punteadas** (si están activas) — cada color corresponde a una medida clínica. Los valores numéricos aparecen en la leyenda de la esquina superior derecha:
  - <span style="color:#7C3AED">■</span> **intercanino sup** (13↔23) · <span style="color:#D97706">■</span> **intermolar sup** (16↔26)
  - <span style="color:#059669">■</span> **intercanino inf** (43↔33) · <span style="color:#DB2777">■</span> **intermolar inf** (46↔36)
- **Puntos de medición** (si están activos) — anillos de colores sobre los 8 dientes usados como puntos de referencia.

</details>

```js
const archMetrics = computeArchMetrics(toothStats);
const showMeasurementsArchInput = Inputs.toggle({label: "Líneas de medición", value: true});
const showMeasurementsArch = Generators.input(showMeasurementsArchInput);
const showArchLabelsInput = Inputs.toggle({label: "Etiquetas inline", value: false});
const showArchLabels = Generators.input(showArchLabelsInput);
const showMeasurePtsInput = Inputs.toggle({label: "Puntos de medición", value: false});
const showMeasurePts = Generators.input(showMeasurePtsInput);
```

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
display(html`<div style="display:flex; gap:16px; align-items:center; padding:4px 0;">${showMeasurementsArchInput}${showArchLabelsInput}${showMeasurePtsInput}</div>`);
```

</details>

```js
display(archForm({
  toothStats,
  selectedFdi: selectedFdi,
  showMeasurements: showMeasurementsArch,
  showLabels: showArchLabels,
  showMeasurePoints: showMeasurePts,
  width: Math.min(width, 900),
  height: 520,
}));
```

```js
const archRows = [
  {Arcada: "Maxilar (superior)",    ...archMetrics.maxilar},
  {Arcada: "Mandibular (inferior)", ...archMetrics.mandibular},
].map(r => ({
  "Arcada": r.Arcada,
  "Ancho intercanino": r.intercanine,
  "Ancho intermolar": r.intermolar,
  "Profundidad": r.depth,
  "Ratio prof/ancho": r.ratio,
  "Forma": r.shape,
}));
display(Inputs.table(archRows, {
  format: {
    "Ancho intercanino": d3.format(".4f"),
    "Ancho intermolar": d3.format(".4f"),
    "Profundidad": d3.format(".4f"),
    "Ratio prof/ancho": d3.format(".3f"),
  },
}));
```

## Overbite y overjet (proxy poblacional)

Medidas clásicas de oclusión calculadas a partir de los **centroides de los incisivos centrales**
(11/21 superiores, 41/31 inferiores) en coordenadas *landmark-normalized*:

- **Overjet** = |Δx| entre el centroide medio de los superiores y el de los inferiores
  (cuánto sobresalen horizontalmente unos respecto de otros).
- **Overbite** = Δy entre superiores e inferiores (separación vertical media de los
  incisivos opuestos).

Por estar basados en centroides 2D (y no en bordes incisales reales),
estas son **proxies poblacionales** útiles para comparar dentaduras entre sí,
no medidas clínicas en milímetros. n = ${occlusionData.n_dentitions} dentaduras con los 4 incisivos presentes.

<details>
<summary>Cómo leer este gráfico</summary>

Ambas métricas se calculan a partir de los **centroides 2D** de los incisivos centrales (11/21 superiores, 41/31 inferiores). No son mediciones clínicas en milímetros desde bordes incisales; son **proxies poblacionales** en unidades landmark-normalized.

- **Overjet** — distancia horizontal |Δx| entre el centroide medio de los incisivos superiores e inferiores. Mide el resalte horizontal.
- **Overbite** — diferencia vertical Δy entre superiores e inferiores. Mide el resalte vertical.
- **Histogramas** — distribución poblacional de cada métrica con líneas de referencia para la mediana.

Por basarse en centroides 2D, estos valores son útiles para comparar dentaduras *dentro del dataset*, pero no equivalen a las medidas clínicas estándar.

</details>

```js
display(occlusionHistograms({occlusionData, width: Math.min(width, 1000)}));
```

## Diagrama poblacional (overjet vs overbite)

Cada punto es una dentadura. El círculo negro marca la mediana poblacional; dentaduras alejadas del centro tienen oclusiones atípicas.

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X** — overjet: separación horizontal entre centroides de incisivos superiores e inferiores. Valores más altos = mayor resalte anterior.
- **Eje Y** — overbite: separación vertical entre centroides de incisivos superiores e inferiores. Valores positivos = superiores por encima de inferiores.
- **Líneas grises punteadas** — mediana de overjet y overbite en la población.
- **Líneas grises sólidas** — línea de cero para referencia (overjet=0 o overbite=0).
- Ambos ejes están en unidades landmark-normalized (escala intercondílea = 1.0), no en milímetros clínicos.

**Colorado por criterios clínicos** (opción por defecto): las categorías se definen respecto al IQR poblacional.
- <span style="color:#4c78a8">■</span> **Normal** — dentro del rango típico.
- <span style="color:#f28e2b">■</span> **Overjet elevado** — overjet > Q3 + 1.5×IQR.
- <span style="color:#e15759">■</span> **Overbite elevado** — overbite > Q3 + 1.5×IQR (mordida profunda).
- <span style="color:#72b7b2">■</span> **Mordida abierta** — overbite < Q1 − 1.5×IQR.
- <span style="color:#b279a2">■</span> **Mordida cruzada** — overjet negativo.

</details>

```js
const occColorInput = Inputs.select(
  new Map([
    ["Criterios clínicos","clinica"],
    ["Atipicidad (z̄)","atipicidad"],
    ["N° dientes","n_teeth"],
    ["Centro clínico","origin"],
    ["Sexo","sex"],
  ]),
  {label: "Colorear por", value: "clinica"}
);
const occColor = Generators.input(occColorInput);

const occTeethData = occEnriched.filter(d => d.overjet != null && d.overbite != null);
const occTeethExt  = d3.extent(occTeethData, d => d.n_teeth ?? 0);
const occTeethInput = Inputs.range(occTeethExt, {
  label: "Mín. dientes",
  step: 1,
  value: occTeethExt[0],
});
const occTeethMin = Generators.input(occTeethInput);
```

```js
{
  const vizDiv = document.createElement("details");
  vizDiv.style.cssText = "margin-bottom:8px;";
  const vizSum = document.createElement("summary");
  vizSum.style.cssText = "cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;";
  vizSum.textContent = "Opciones de visualización";
  vizDiv.appendChild(vizSum);
  const inner = document.createElement("div");
  inner.style.cssText = "padding:0.5rem 0.3rem 0.2rem;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;";
  inner.appendChild(occColorInput);
  inner.appendChild(occTeethInput);
  vizDiv.appendChild(inner);
  display(vizDiv);
}
```

```js
{
  const allData = occEnriched.filter(d => d.overjet != null && d.overbite != null);
  const data = allData.filter(d => (d.n_teeth ?? 0) >= occTeethMin);

  const medJ = d3.median(allData, d => d.overjet);
  const medB = d3.median(allData, d => d.overbite);

  // Clinical thresholds (based on population IQR)
  const q1J = d3.quantile(allData.map(d => d.overjet).sort(d3.ascending), 0.25);
  const q3J = d3.quantile(allData.map(d => d.overjet).sort(d3.ascending), 0.75);
  const iqrJ = q3J - q1J;
  const q1B = d3.quantile(allData.map(d => d.overbite).sort(d3.ascending), 0.25);
  const q3B = d3.quantile(allData.map(d => d.overbite).sort(d3.ascending), 0.75);
  const iqrB = q3B - q1B;

  // Clinical category: based on outlier thresholds and sign
  const clinicCat = (d) => {
    const j = d.overjet, b = d.overbite;
    if (j < 0) return "Mordida cruzada";
    if (b < q1B - 1.5*iqrB) return "Mordida abierta";
    if (b > q3B + 1.5*iqrB) return "Overbite elevado";
    if (j > q3J + 1.5*iqrJ) return "Overjet elevado";
    return "Normal";
  };
  const clinicColors = {
    "Normal":           "#4c78a8",
    "Overjet elevado":  "#f28e2b",
    "Overbite elevado": "#e15759",
    "Mordida abierta":  "#72b7b2",
    "Mordida cruzada":  "#b279a2",
  };

  // Color scales
  const origins = [...new Set(allData.map(d => d.data_origin).filter(Boolean))].sort();
  const sexes   = [...new Set(allData.map(d => d.sex).filter(Boolean))].sort();
  const colorOrig = d3.scaleOrdinal(["#4e79a7","#e15759","#59a14f","#f28e2b"]).domain(origins);
  const colorSex  = d3.scaleOrdinal(["#4e79a7","#e15759"]).domain(sexes);
  const maxZ = d3.max(allData, d => d.z_mean ?? 0);
  const colorAtip = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxZ]);
  const teethExt  = d3.extent(allData, d => d.n_teeth);
  const colorTeeth = d3.scaleSequential(t => d3.interpolateRdYlBu(1 - t)).domain(teethExt);

  function getCol(d) {
    if (occColor === "clinica")  return clinicColors[clinicCat(d)] ?? "#aaa";
    if (occColor === "origin")   return colorOrig(d.data_origin) ?? "#aaa";
    if (occColor === "sex")      return d.sex ? colorSex(d.sex) : "#ccc";
    if (occColor === "n_teeth")  return colorTeeth(d.n_teeth ?? teethExt[0]);
    return colorAtip(d.z_mean ?? 0);
  }

  const W = Math.min(width, 680), H = 440;
  const M = {top:20, right:160, bottom:50, left:60};
  const iW = W - M.left - M.right, iH = H - M.top - M.bottom;

  const xExt = d3.extent(allData, d => d.overjet);
  const yExt = d3.extent(allData, d => d.overbite);
  const xS = d3.scaleLinear().domain([Math.min(0, xExt[0])*1.05, xExt[1]*1.05]).range([0, iW]);
  const yS = d3.scaleLinear().domain([Math.min(0, yExt[0])*1.05 - (yExt[1]-yExt[0])*0.02, yExt[1]*1.05]).range([iH, 0]);

  const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width","100%")
    .style("font-family","var(--sans-serif,system-ui,sans-serif)");
  const defs = svg.append("defs");
  defs.append("clipPath").attr("id","occ-clip").append("rect").attr("width",iW).attr("height",iH);

  const gO = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);
  const g  = gO.append("g").attr("clip-path","url(#occ-clip)");

  // Zero reference lines (for clinical context)
  if (xS(0) > 0 && xS(0) < iW)
    g.append("line").attr("x1",xS(0)).attr("x2",xS(0)).attr("y1",0).attr("y2",iH)
      .attr("stroke","#ccc").attr("stroke-width",1);
  if (yS(0) > 0 && yS(0) < iH)
    g.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(0)).attr("y2",yS(0))
      .attr("stroke","#ccc").attr("stroke-width",1);

  // Grid + axes
  gO.append("g").attr("transform",`translate(0,${iH})`).call(d3.axisBottom(xS).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("y1",-iH));
  gO.append("g").call(d3.axisLeft(yS).ticks(6))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",iW));
  gO.append("text").attr("x",iW/2).attr("y",iH+38).attr("text-anchor","middle").attr("font-size",11).attr("fill","#666").text("Overjet (|Δx| landmark-normalized)");
  gO.append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-44).attr("text-anchor","middle").attr("font-size",11).attr("fill","#666").text("Overbite (Δy landmark-normalized)");

  // Median crosshairs
  g.append("line").attr("x1",xS(medJ)).attr("x2",xS(medJ)).attr("y1",0).attr("y2",iH)
    .attr("stroke","#888").attr("stroke-dasharray","5,3").attr("stroke-width",1);
  g.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(medB)).attr("y2",yS(medB))
    .attr("stroke","#888").attr("stroke-dasharray","5,3").attr("stroke-width",1);

  // Points
  g.selectAll("circle.dot").data(data).join("circle").attr("class","dot")
    .attr("cx", d => xS(d.overjet)).attr("cy", d => yS(d.overbite))
    .attr("r", 2.5).attr("fill", d => getCol(d)).attr("opacity", 0.55)
    .style("cursor","pointer")
    .on("click", (event,d) => { event.stopPropagation(); setClickedMorfo(d); })
    .append("title").text(d => `${simplifyM(d.json_filename)}\nOverjet=${d.overjet?.toFixed(4)} · Overbite=${d.overbite?.toFixed(4)}\nz̄=${d.z_mean?.toFixed(4) ?? "–"}\nClic para ver detalle`);

  // Median label
  gO.append("text").attr("x",xS(medJ)+6).attr("y",yS(medB)-6).attr("font-size",10).attr("fill","#555").text("mediana");

  // Legend
  const lx = iW + 16;
  if (occColor === "clinica") {
    const cats = Object.keys(clinicColors);
    gO.append("text").attr("x",lx).attr("y",10).attr("font-size",9).attr("fill","#888").attr("font-weight","bold").text("Criterio");
    cats.forEach((cat, i) => {
      const c = clinicColors[cat];
      gO.append("circle").attr("cx",lx+5).attr("cy",24+i*18).attr("r",5).attr("fill",c).attr("opacity",0.8);
      gO.append("text").attr("x",lx+14).attr("y",28+i*18).attr("font-size",9).attr("fill","#333").text(cat);
    });
  } else if (occColor === "atipicidad") {
    const gradId = "occ-grad";
    const barH = 90, barW = 12;
    const grad = defs.append("linearGradient").attr("id",gradId).attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");
    [0,0.25,0.5,0.75,1].forEach(t => grad.append("stop").attr("offset",`${t*100}%`).attr("stop-color",colorAtip(t*maxZ)));
    gO.append("text").attr("x",lx).attr("y",10).attr("font-size",9).attr("fill","#888").attr("font-weight","bold").text("z̄");
    gO.append("rect").attr("x",lx).attr("y",14).attr("width",barW).attr("height",barH).attr("fill",`url(#${gradId})`).attr("rx",2);
    gO.append("text").attr("x",lx+barW+4).attr("y",18).attr("font-size",9).attr("fill","#555").text(d3.format(".2f")(maxZ));
    gO.append("text").attr("x",lx+barW+4).attr("y",14+barH).attr("font-size",9).attr("fill","#555").text("0");
  } else {
    const items = occColor === "origin" ? origins.map(o => ({l:o, c:colorOrig(o)}))
      : occColor === "sex" ? sexes.map(s => ({l:s, c:colorSex(s)}))
      : [{l:`${teethExt[0]}`, c:colorTeeth(teethExt[0])},{l:`${teethExt[1]}`, c:colorTeeth(teethExt[1])}];
    gO.append("text").attr("x",lx).attr("y",10).attr("font-size",9).attr("fill","#888").attr("font-weight","bold").text(occColor === "origin" ? "Centro" : occColor === "sex" ? "Sexo" : "N° dientes");
    items.forEach(({l,c},i) => {
      gO.append("circle").attr("cx",lx+5).attr("cy",24+i*18).attr("r",5).attr("fill",c).attr("opacity",0.8);
      gO.append("text").attr("x",lx+14).attr("y",28+i*18).attr("font-size",10).attr("fill","#333").text(l);
    });
  }

  gO.append("text").attr("x",iW).attr("y",-5).attr("text-anchor","end").attr("font-size",9).attr("fill","#aaa").text("Clic en un punto para ver la pantomografía");

  display(svg.node());
}
```

```js
const occRows = [
  {Métrica: "Overjet (|Δx|)",  ...occlusionData.stats.overjet},
  {Métrica: "Overbite (Δy)",   ...occlusionData.stats.overbite},
];
display(Inputs.table(occRows, {
  format: {
    mean:   d3.format(".4f"), std:    d3.format(".4f"),
    median: d3.format(".4f"), q1:     d3.format(".4f"), q3: d3.format(".4f"),
    p05:    d3.format(".4f"), p95:    d3.format(".4f"),
    min:    d3.format(".4f"), max:    d3.format(".4f"),
  },
}));
```

### Casos extremos — Overjet y Overbite

Las 10 dentaduras con valores más extremos de overjet y overbite. Clic en una fila para ver la pantomografía.

```js
{
  const fmt4 = d3.format(".4f");
  const dataAll = occEnriched.filter(d => d.overjet != null && d.overbite != null);

  function makeTop10Table(sorted, valueKey, valueLabel, colorHex) {
    const top = sorted.slice(0, 10);
    const wrap = document.createElement("div");
    wrap.style.cssText = "overflow-x:auto;margin-bottom:1rem;";
    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse;font-size:12px;width:100%;";
    table.innerHTML =
      `<thead><tr style="border-bottom:2px solid #eee;">` +
      `<th style="text-align:left;padding:4px 8px;color:#888;">#</th>` +
      `<th style="text-align:left;padding:4px 8px;color:#888;">ID</th>` +
      `<th style="text-align:right;padding:4px 8px;color:${colorHex};">${valueLabel}</th>` +
      `<th style="text-align:right;padding:4px 8px;color:#888;">overjet</th>` +
      `<th style="text-align:right;padding:4px 8px;color:#888;">overbite</th>` +
      `<th style="text-align:right;padding:4px 8px;color:#888;">z̄</th>` +
      `<th style="text-align:left;padding:4px 8px;color:#888;">Centro · Sexo</th>` +
      `</tr></thead>`;
    const tbody = document.createElement("tbody");
    top.forEach((d, i) => {
      const id = extractIdM(d.json_filename);
      const tr = document.createElement("tr");
      tr.style.cssText = "border-bottom:1px solid #f5f5f5;cursor:pointer;";
      tr.innerHTML =
        `<td style="padding:4px 8px;color:#aaa;">${i+1}</td>` +
        `<td style="padding:4px 8px;font-family:monospace;font-size:11px;color:#4c78a8;">${simplifyM(d.json_filename)}</td>` +
        `<td style="text-align:right;padding:4px 8px;font-weight:700;color:${colorHex};">${fmt4(d[valueKey])}</td>` +
        `<td style="text-align:right;padding:4px 8px;color:#555;">${fmt4(d.overjet)}</td>` +
        `<td style="text-align:right;padding:4px 8px;color:#555;">${fmt4(d.overbite)}</td>` +
        `<td style="text-align:right;padding:4px 8px;color:#555;">${d.z_mean != null ? fmt4(d.z_mean) : "–"}</td>` +
        `<td style="padding:4px 8px;color:#555;">${d.data_origin ?? "–"} · ${d.sex ?? "–"}</td>`;
      tr.addEventListener("mouseenter", () => { tr.style.background = "#f5f8ff"; });
      tr.addEventListener("mouseleave", () => { tr.style.background = ""; });
      tr.addEventListener("click", () => {
        const pb = pantosMapM.get(id) ?? null;
        openPantoModal({
          id,
          pantoMeta: pb,
          toothStats,
          extraBadges: [
            {label: "overjet",  value: fmt4(d.overjet),  color: "#4c78a8"},
            {label: "overbite", value: fmt4(d.overbite), color: "#72b7b2"},
          ],
          zScores: d.z_mean != null ? {z_mean: d.z_mean} : null,
          invalidation,
        });
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  const byOverjet  = [...dataAll].sort((a, b) => b.overjet  - a.overjet);
  const byOverbite = [...dataAll].sort((a, b) => b.overbite - a.overbite);

  const container = document.createElement("div");
  container.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;";

  const colA = document.createElement("div");
  colA.innerHTML = `<div style="font-size:12px;font-weight:700;color:#4c78a8;margin-bottom:6px;">Top 10 — mayor overjet</div>`;
  colA.appendChild(makeTop10Table(byOverjet, "overjet", "overjet", "#4c78a8"));

  const colB = document.createElement("div");
  colB.innerHTML = `<div style="font-size:12px;font-weight:700;color:#72b7b2;margin-bottom:6px;">Top 10 — mayor overbite</div>`;
  colB.appendChild(makeTop10Table(byOverbite, "overbite", "overbite", "#72b7b2"));

  container.append(colA, colB);
  display(container);
}
```

## Índice de Bolton

**Pregunta clínica**: ¿las piezas mandibulares y maxilares de cada paciente están en proporción equilibrada para el cierre oclusal? Bolton (1958/1962) definió dos relaciones porcentuales que se aceptan como referencia ortodóntica:

- **Anterior** = `100 × Σ MD(43–33) / Σ MD(13–23)` — norma **77.2 ± 1.65**
- **Overall**  = `100 × Σ MD(46–36) / Σ MD(16–26)` — norma **91.3 ± 1.91**

El ancho mesiodistal (MD) de cada diente se aproxima por el **lado corto del minbbox** (rectángulo de área mínima sobre el polígono de segmentación). En la vista panorámica el eje mayor del minbbox sigue el eje oclusogingival, por lo que el lado corto aproxima la dimensión MD. Es una **aproximación 2D**, no una medición clínica con calibrador.

La banda verde marca el rango clínicamente aceptable (± 1 SD de la norma); la línea verde la media de Bolton; la línea negra punteada la mediana observada en el dataset.

<details>
<summary>Cómo leer este gráfico</summary>

El índice de Bolton mide si los dientes mandibulares y maxilares de un paciente están en proporción equilibrada para el cierre oclusal.

- **Anterior** = 100 × Σ MD(43–33) / Σ MD(13–23) — norma clínica **77.2 ± 1.65**
- **Overall** = 100 × Σ MD(46–36) / Σ MD(16–26) — norma clínica **91.3 ± 1.91**
- **Banda verde** — rango clínicamente aceptable (± 1 SD de la norma de Bolton).
- **Línea verde** — media de Bolton; **línea negra punteada** — mediana del dataset.
- Valores fuera de la banda sugieren discrepancia maxilo-mandibular que podría requerir compensación ortodóntica.

El ancho mesiodistal (MD) se aproxima por el **lado corto del rectángulo de área mínima** (minbbox) del polígono de segmentación. Es una aproximación 2D, no una medición con calibrador.

</details>

```js
display(boltonHistograms({boltonData, width: Math.min(width, 1000)}));
```

### Scatter Bolton: anterior vs overall

Cada punto es una dentadura con ambas medidas disponibles. Clic para ver la pantomografía. Las bandas verdes marcan el rango normativo de Bolton (± 1 SD). Scroll para zoom, drag para mover, doble-clic para resetear.

<details>
<summary style="cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;">¿Cómo leer este gráfico?</summary>
<div style="padding:0.7rem 0.5rem 0.2rem;font-size:0.85rem;line-height:1.6;color:#444;">

- **Eje X** — índice de Bolton anterior (43–33 / 13–23 × 100). Norma clínica: 77.2 ± 1.65.
- **Eje Y** — índice de Bolton overall (46–36 / 16–26 × 100). Norma clínica: 91.3 ± 1.91.
- **Banda verde** en cada eje — rango normativo (± 1 SD de Bolton, 1958/1962).
- **Líneas verdes punteadas** — media de Bolton en cada índice.
- Puntos fuera de la banda verde en alguno de los dos ejes presentan discrepancia maxilo-mandibular que podría requerir compensación ortodóntica.

</div>
</details>

```js
const boltColorInput = Inputs.select(
  new Map([["Atipicidad (z̄)","atipicidad"],["N° dientes","n_teeth"],["Centro clínico","origin"],["Sexo","sex"]]),
  {label: "Colorear por", value: "atipicidad"}
);
const boltColor = Generators.input(boltColorInput);
```

```js
{
  const vizDiv = document.createElement("details");
  vizDiv.style.cssText = "margin-bottom:8px;";
  const vizSum = document.createElement("summary");
  vizSum.style.cssText = "cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;";
  vizSum.textContent = "Opciones de visualización";
  vizDiv.appendChild(vizSum);
  const inner = document.createElement("div");
  inner.style.cssText = "padding:0.5rem 0.3rem 0.2rem;";
  inner.appendChild(boltColorInput);
  vizDiv.appendChild(inner);
  display(vizDiv);
}
```

```js
{
  const data = boltEnriched.filter(d => d.anterior_complete && d.overall_complete);
  const W = Math.min(width, 600), H = 440;
  const M = {top:20, right:160, bottom:50, left:65};
  const iW = W - M.left - M.right, iH = H - M.top - M.bottom;

  const norms = boltonData.norms;
  const xDom = [d3.min(data,d=>d.anterior_ratio)*0.995, d3.max(data,d=>d.anterior_ratio)*1.005];
  const yDom = [d3.min(data,d=>d.overall_ratio)*0.995,  d3.max(data,d=>d.overall_ratio)*1.005];
  const xS0 = d3.scaleLinear().domain(xDom).range([0, iW]);
  const yS0 = d3.scaleLinear().domain(yDom).range([iH, 0]);

  // Color scales
  const origins2 = [...new Set(data.map(d => d.data_origin).filter(Boolean))].sort();
  const sexes2   = [...new Set(data.map(d => d.sex).filter(Boolean))].sort();
  const cOrig2  = d3.scaleOrdinal(["#4e79a7","#e15759","#59a14f","#f28e2b"]).domain(origins2);
  const cSex2   = d3.scaleOrdinal(["#4e79a7","#e15759"]).domain(sexes2);
  const maxZ2   = d3.max(data, d => d.z_mean ?? 0);
  const cAtip2  = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxZ2]);
  const tExt2   = d3.extent(data, d => d.n_teeth ?? 0);
  const cTeeth2 = d3.scaleSequential(t => d3.interpolateRdYlBu(1-t)).domain(tExt2);

  function getColB(d) {
    if (boltColor === "origin")  return cOrig2(d.data_origin) ?? "#aaa";
    if (boltColor === "sex")     return d.sex ? cSex2(d.sex) : "#ccc";
    if (boltColor === "n_teeth") return cTeeth2(d.n_teeth ?? tExt2[0]);
    return cAtip2(d.z_mean ?? 0);
  }

  const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width","100%")
    .style("font-family","var(--sans-serif,system-ui,sans-serif)")
    .style("cursor","grab");
  const defs2 = svg.append("defs");
  defs2.append("clipPath").attr("id","bolt-clip").append("rect").attr("width",iW).attr("height",iH);
  const gO2 = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);
  const g2  = gO2.append("g").attr("clip-path","url(#bolt-clip)");

  // Axes (redrawn on zoom)
  const xAxis = gO2.append("g").attr("transform",`translate(0,${iH})`);
  const yAxis = gO2.append("g");
  gO2.append("text").attr("x",iW/2).attr("y",iH+38).attr("text-anchor","middle").attr("font-size",11).attr("fill","#666").text("Bolton Anterior (%)");
  gO2.append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-50).attr("text-anchor","middle").attr("font-size",11).attr("fill","#666").text("Bolton Overall (%)");
  gO2.append("text").attr("x",iW).attr("y",-5).attr("text-anchor","end").attr("font-size",9).attr("fill","#aaa").text("Scroll = zoom · Drag = mover · Doble-clic = resetear · Clic en punto = panto");

  function drawAxes(xS, yS) {
    xAxis.call(d3.axisBottom(xS).ticks(6))
      .call(ax => ax.select(".domain").attr("stroke","#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("y1",-iH));
    yAxis.call(d3.axisLeft(yS).ticks(6))
      .call(ax => ax.select(".domain").attr("stroke","#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",iW));
  }

  function drawContent(xS, yS) {
    g2.selectAll("*").remove();
    const axBand = [norms.anterior.mean - norms.anterior.std, norms.anterior.mean + norms.anterior.std];
    const oyBand = [norms.overall.mean  - norms.overall.std,  norms.overall.mean  + norms.overall.std];
    const xd = xS.domain(), yd = yS.domain();
    // Normative bands
    g2.append("rect").attr("x",xS(Math.max(xd[0],axBand[0]))).attr("y",0)
      .attr("width",Math.max(0, xS(Math.min(xd[1],axBand[1]))-xS(Math.max(xd[0],axBand[0]))))
      .attr("height",iH).attr("fill","#59a14f").attr("opacity",0.07);
    g2.append("rect").attr("x",0).attr("y",yS(Math.min(yd[1],oyBand[1])))
      .attr("width",iW)
      .attr("height",Math.max(0, yS(Math.max(yd[0],oyBand[0]))-yS(Math.min(yd[1],oyBand[1]))))
      .attr("fill","#59a14f").attr("opacity",0.07);
    // Normative mean lines
    g2.append("line").attr("x1",xS(norms.anterior.mean)).attr("x2",xS(norms.anterior.mean)).attr("y1",0).attr("y2",iH).attr("stroke","#59a14f").attr("stroke-dasharray","5,3").attr("stroke-width",1.2);
    g2.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(norms.overall.mean)).attr("y2",yS(norms.overall.mean)).attr("stroke","#59a14f").attr("stroke-dasharray","5,3").attr("stroke-width",1.2);
    // Points
    g2.selectAll("circle.dot").data(data).join("circle").attr("class","dot")
      .attr("cx", d => xS(d.anterior_ratio)).attr("cy", d => yS(d.overall_ratio))
      .attr("r", 2.5).attr("fill", d => getColB(d)).attr("opacity", 0.55)
      .style("cursor","pointer")
      .on("click", (event,d) => { event.stopPropagation(); setClickedMorfo(d); })
      .append("title").text(d => `${simplifyM(d.json_filename)}\nAnterior=${d.anterior_ratio?.toFixed(2)}% · Overall=${d.overall_ratio?.toFixed(2)}%\nz̄=${d.z_mean?.toFixed(4) ?? "–"}\nClic para ver detalle`);
  }

  drawAxes(xS0, yS0);
  drawContent(xS0, yS0);

  // Legend
  const lx = iW + 16;
  if (boltColor === "atipicidad") {
    const gradId = "bolt-grad";
    const barH = 90, barW = 12;
    const grad = defs2.append("linearGradient").attr("id",gradId).attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");
    [0,0.25,0.5,0.75,1].forEach(t => grad.append("stop").attr("offset",`${t*100}%`).attr("stop-color",cAtip2(t*maxZ2)));
    gO2.append("text").attr("x",lx).attr("y",10).attr("font-size",9).attr("fill","#888").attr("font-weight","bold").text("z̄");
    gO2.append("rect").attr("x",lx).attr("y",14).attr("width",barW).attr("height",barH).attr("fill",`url(#${gradId})`).attr("rx",2);
    gO2.append("text").attr("x",lx+barW+4).attr("y",18).attr("font-size",9).attr("fill","#555").text(d3.format(".2f")(maxZ2));
    gO2.append("text").attr("x",lx+barW+4).attr("y",14+barH).attr("font-size",9).attr("fill","#555").text("0");
  } else {
    const items = boltColor === "origin" ? origins2.map(o => ({l:o, c:cOrig2(o)}))
      : boltColor === "sex" ? sexes2.map(s => ({l:s, c:cSex2(s)}))
      : [{l:`${tExt2[0]}`, c:cTeeth2(tExt2[0])},{l:`${tExt2[1]}`, c:cTeeth2(tExt2[1])}];
    gO2.append("text").attr("x",lx).attr("y",10).attr("font-size",9).attr("fill","#888").attr("font-weight","bold").text(boltColor === "origin" ? "Centro" : boltColor === "sex" ? "Sexo" : "N° dientes");
    items.forEach(({l,c},i) => {
      gO2.append("circle").attr("cx",lx+5).attr("cy",24+i*18).attr("r",5).attr("fill",c).attr("opacity",0.8);
      gO2.append("text").attr("x",lx+14).attr("y",28+i*18).attr("font-size",10).attr("fill","#333").text(l);
    });
  }

  // Zoom
  const zoom = d3.zoom().scaleExtent([0.5, 20]).on("zoom", (event) => {
    const t = event.transform;
    const xSz = t.rescaleX(xS0);
    const ySz = t.rescaleY(yS0);
    drawAxes(xSz, ySz);
    drawContent(xSz, ySz);
  });
  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  });

  display(svg.node());
}
```

```js
const boltRows = [
  {Métrica: "Anterior (43–33 / 13–23)", n: boltonData.eligibility.anterior, ...boltonData.stats.anterior, norma: `${boltonData.norms.anterior.mean} ± ${boltonData.norms.anterior.std}`},
  {Métrica: "Overall (46–36 / 16–26)",  n: boltonData.eligibility.overall,  ...boltonData.stats.overall,  norma: `${boltonData.norms.overall.mean} ± ${boltonData.norms.overall.std}`},
];
display(Inputs.table(boltRows, {
  format: {
    mean: d3.format(".2f"), std: d3.format(".2f"),
    median: d3.format(".2f"), q1: d3.format(".2f"), q3: d3.format(".2f"),
    p05: d3.format(".2f"), p95: d3.format(".2f"),
    min: d3.format(".2f"), max: d3.format(".2f"),
  },
}));
```

<div style="font-size:0.85rem; color:#555; background:#f8f8f8; border:1px solid #e8e8e8; border-radius:4px; padding:0.7rem 1rem; margin:0.8rem 0 1.5rem; line-height:1.6;">
<strong>Contexto bibliográfico</strong> — La mediana de esta cohorte (anterior: <strong>${boltonData.stats.anterior.median.toFixed(2)}</strong>, overall: <strong>${boltonData.stats.overall.median.toFixed(2)}</strong>) se mantiene dentro del rango normativo original de Bolton (1958). La dispersión observada (P05–P95 en la tabla) es más amplia que en la muestra original de Bolton (<em>n</em> = 55 individuos con oclusión ideal), lo cual es esperable dado el carácter poblacional —no seleccionado— de esta cohorte. Estudios en diversas poblaciones (Paredes-Gallardo &amp; Cibrián-Uhalte, 2006; Uysal et al., 2005) confirman amplia aplicabilidad transcultural de las normas de Bolton con variaciones menores.
</div>

## Simetría bilateral

**Pregunta clínica**: ¿las piezas del lado derecho están en posiciones "espejo"
de sus homólogas izquierdas? Para cada par homólogo (p.ej. 16↔26) se usan
**solo las dentaduras que tienen ambos dientes del par** y la asimetría se
mide **por dentadura** (análisis pareado, robusto a ausencias y outliers).

Para cada par calculamos por dentadura: `Δ reflejo X = cx_izq + cx_der`,
`ΔY = cy_izq − cy_der` y `distancia = √(Δx² + ΔY²)`. Se reportan **mediana
y rango intercuartílico** (menos sensibles a outliers que la media).

### Boxplots de asimetría por par

<details>
<summary style="cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;">¿Cómo leer este gráfico?</summary>
<div style="padding:0.7rem 0.5rem 0.2rem;font-size:0.85rem;line-height:1.6;color:#444;">

Para cada par homólogo (ej. 16↔26) se analizan solo las dentaduras con ambos dientes presentes.

- **Caja** — IQR (Q1–Q3) de la distancia de asimetría por dentadura. La línea central es la mediana.
- **Bigotes** — percentiles P5 y P95.
- **`n`** sobre cada caja — cantidad de dentaduras con el par completo.
- Los 3 pares con mayor asimetría mediana se destacan en el **overlay de medianas** (sección siguiente).

</div>
</details>

```js
display(symmetryBoxplot({
  symmetryData,
  selectedFdi: selectedFdi,
  width: Math.min(width, 980),
  height: 360,
}));
```

### Dispersión 2D de asimetría por par

Para el par seleccionado, cada punto es una dentadura individual. El eje X muestra la diferencia entre el diente derecho reflejado y el izquierdo (Δx-reflejo); el eje Y la diferencia vertical (ΔY). El origen representa simetría perfecta. Scroll para zoom, drag para mover, doble-clic para resetear.

<details>
<summary style="cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;">¿Cómo leer este gráfico?</summary>
<div style="padding:0.7rem 0.5rem 0.2rem;font-size:0.85rem;line-height:1.6;color:#444;">

- **Eje X (Δx-reflejo)** — cuánto difiere el diente derecho reflejado del izquierdo horizontalmente. Cero = simetría horizontal perfecta.
- **Eje Y (ΔY)** — cuánto difiere verticalmente. Cero = misma altura.
- **Color** — magnitud de la distancia de asimetría: amarillo (baja) → rojo (alta). La escala se ajusta al P95 para no saturar.
- **Círculo ◯** — mediana poblacional para este par.
- **Líneas punteadas** — ejes de simetría perfecta (0,0).
- Clic en un punto para ver la pantomografía.

</div>
</details>

```js
const symPairInput = Inputs.select(
  symmetryData.pairs.map(p => p.fdi_r),
  {
    label: "Par homólogo",
    format: v => {
      const p = symmetryData.pairs.find(x => x.fdi_r === v);
      return p ? `${p.fdi_r} ↔ ${p.fdi_l} (n=${p.n_paired.toLocaleString("es-AR")})` : v;
    },
    value: symmetryData.pairs[0]?.fdi_r,
  }
);
const symPairSelected = Generators.input(symPairInput);
```

```js
{
  const vizDiv = document.createElement("details");
  vizDiv.style.cssText = "margin-bottom:8px;";
  const vizSum = document.createElement("summary");
  vizSum.style.cssText = "cursor:pointer;font-size:0.85rem;color:#555;font-weight:600;";
  vizSum.textContent = "Opciones de visualización";
  vizDiv.appendChild(vizSum);
  const inner = document.createElement("div");
  inner.style.cssText = "padding:0.5rem 0.3rem 0.2rem;";
  inner.appendChild(symPairInput);
  vizDiv.appendChild(inner);
  display(vizDiv);
}
```

```js
{
  const pair = symmetryData.pairs.find(p => p.fdi_r === symPairSelected);
  if (!pair) { display(html`<p style="color:#999">Par no encontrado.</p>`); }
  else {
    const pts = pair.points.map(p => ({
      json_filename: p.json_filename,
      dx: p.cx_r_flipped - p.cx_l,
      dy: p.cy_r - p.cy_l,
      dist: Math.sqrt((p.cx_r_flipped - p.cx_l) ** 2 + (p.cy_r - p.cy_l) ** 2),
    }));

    const W = Math.min(width, 560), H = 400;
    const M = {top:16, right:110, bottom:46, left:52};
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;

    const xExt = d3.extent(pts, d => d.dx);
    const yExt = d3.extent(pts, d => d.dy);
    const pad = Math.max(Math.abs(xExt[0]), Math.abs(xExt[1]), Math.abs(yExt[0]), Math.abs(yExt[1])) * 1.12;

    const xS0 = d3.scaleLinear().domain([-pad, pad]).range([0, iW]);
    const yS0 = d3.scaleLinear().domain([-pad, pad]).range([iH, 0]);
    const colorDomain = [0, d3.quantile(pts.map(d => d.dist).sort(d3.ascending), 0.95)];
    const colorS = d3.scaleSequential(d3.interpolateYlOrRd).domain(colorDomain);

    const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width","100%")
      .style("font-family","var(--sans-serif, system-ui)").style("cursor","grab");
    const defs = svg.append("defs");
    defs.append("clipPath").attr("id","sym-clip").append("rect").attr("width",iW).attr("height",iH);
    const gO = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);
    const g  = gO.append("g").attr("clip-path","url(#sym-clip)");

    const xAxisG = gO.append("g").attr("transform",`translate(0,${iH})`);
    const yAxisG = gO.append("g");
    gO.append("text").attr("x",iW/2).attr("y",iH+38).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("Δx-reflejo (der. reflejado − izq.)");
    gO.append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-44).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("ΔY (der. − izq.)");
    gO.append("text").attr("x",iW).attr("y",-2).attr("text-anchor","end").attr("font-size",9).attr("fill","#aaa").text("Scroll=zoom · Drag=mover · Dbl-clic=reset · Clic=panto");

    const mxDx = d3.median(pts, d => d.dx);
    const mxDy = d3.median(pts, d => d.dy);

    function drawSym(xS, yS) {
      g.selectAll("*").remove();
      xAxisG.call(d3.axisBottom(xS).ticks(5).tickFormat(d3.format(".4f")))
        .call(ax => ax.select(".domain").attr("stroke","#ccc"))
        .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("y1",-iH));
      yAxisG.call(d3.axisLeft(yS).ticks(5).tickFormat(d3.format(".4f")))
        .call(ax => ax.select(".domain").attr("stroke","#ccc"))
        .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",iW));
      g.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(0)).attr("y2",yS(0)).attr("stroke","#ccc").attr("stroke-dasharray","4,3");
      g.append("line").attr("x1",xS(0)).attr("x2",xS(0)).attr("y1",0).attr("y2",iH).attr("stroke","#ccc").attr("stroke-dasharray","4,3");
      g.selectAll("circle.pt").data(pts).join("circle").attr("class","pt")
        .attr("cx", d => xS(d.dx)).attr("cy", d => yS(d.dy))
        .attr("r", 2).attr("fill", d => colorS(d.dist)).attr("opacity", 0.55).attr("stroke","none")
        .style("cursor","pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          const id = extractIdM(d.json_filename);
          if (id) {
            const pb = pantosMapM.get(id) ?? null;
            openPantoModal({id, pantoMeta: pb, toothStats, invalidation});
          }
        })
        .append("title").text(d => `${simplifyM(d.json_filename)}\nΔx=${d.dx.toFixed(4)}  ΔY=${d.dy.toFixed(4)}  dist=${d.dist.toFixed(4)}`);
      g.append("circle").attr("cx",xS(mxDx)).attr("cy",yS(mxDy))
        .attr("r",6).attr("fill","none").attr("stroke","#333").attr("stroke-width",1.8);
      g.append("text").attr("x",xS(mxDx)+8).attr("y",yS(mxDy)-6).attr("font-size",10).attr("fill","#333")
        .text(`mediana (${mxDx.toFixed(4)}, ${mxDy.toFixed(4)})`);
    }
    drawSym(xS0, yS0);

    // Color scale legend
    const lx = iW + 10, barH = 80, barW = 10;
    const gradId = `sym-grad-${symPairSelected}`;
    const grad = defs.append("linearGradient").attr("id",gradId).attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");
    [0,0.25,0.5,0.75,1].forEach(t => grad.append("stop").attr("offset",`${t*100}%`).attr("stop-color",colorS(t*colorDomain[1])));
    gO.append("text").attr("x",lx).attr("y",10).attr("font-size",9).attr("fill","#888").attr("font-weight","bold").text("dist");
    gO.append("rect").attr("x",lx).attr("y",14).attr("width",barW).attr("height",barH).attr("fill",`url(#${gradId})`).attr("rx",2);
    gO.append("text").attr("x",lx+barW+3).attr("y",18).attr("font-size",9).attr("fill","#555").text(d3.format(".4f")(colorDomain[1]));
    gO.append("text").attr("x",lx+barW+3).attr("y",14+barH).attr("font-size",9).attr("fill","#555").text("0");

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.5, 30]).on("zoom", (event) => {
      const t = event.transform;
      drawSym(t.rescaleX(xS0), t.rescaleY(yS0));
    });
    svg.call(zoom);
    svg.on("dblclick.zoom", () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity));

    display(svg.node());
  }
}
```

### Top 10 — mayor distancia de asimetría por par

```js
{
  const pair = symmetryData.pairs.find(p => p.fdi_r === symPairSelected);
  if (!pair || !pair.points[0]?.json_filename) {
    display(html`<p style="color:#aaa;font-size:12px;">Sin datos de ranking disponibles.</p>`);
  } else {
    const fmt4 = d3.format(".4f");
    const pts = pair.points
      .map(p => ({
        json_filename: p.json_filename,
        dx: p.cx_r_flipped - p.cx_l,
        dy: p.cy_r - p.cy_l,
        dist: Math.sqrt((p.cx_r_flipped - p.cx_l) ** 2 + (p.cy_r - p.cy_l) ** 2),
      }))
      .sort((a, b) => b.dist - a.dist)
      .slice(0, 10);

    const wrap = document.createElement("div");
    wrap.style.cssText = "overflow-x:auto;";
    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse;font-size:12px;width:100%;";
    table.innerHTML =
      `<thead><tr style="border-bottom:2px solid #eee;">` +
      `<th style="text-align:left;padding:4px 8px;color:#888;">#</th>` +
      `<th style="text-align:left;padding:4px 8px;color:#888;">ID</th>` +
      `<th style="text-align:right;padding:4px 8px;color:#e15759;">dist</th>` +
      `<th style="text-align:right;padding:4px 8px;color:#888;">Δx</th>` +
      `<th style="text-align:right;padding:4px 8px;color:#888;">ΔY</th>` +
      `</tr></thead>`;
    const tbody = document.createElement("tbody");
    pts.forEach((d, i) => {
      const id = extractIdM(d.json_filename);
      const tr = document.createElement("tr");
      tr.style.cssText = "border-bottom:1px solid #f5f5f5;cursor:pointer;";
      tr.innerHTML =
        `<td style="padding:4px 8px;color:#aaa;">${i+1}</td>` +
        `<td style="padding:4px 8px;font-family:monospace;font-size:11px;color:#4c78a8;">${simplifyM(d.json_filename)}</td>` +
        `<td style="text-align:right;padding:4px 8px;font-weight:700;color:#e15759;">${fmt4(d.dist)}</td>` +
        `<td style="text-align:right;padding:4px 8px;color:#555;">${fmt4(d.dx)}</td>` +
        `<td style="text-align:right;padding:4px 8px;color:#555;">${fmt4(d.dy)}</td>`;
      tr.addEventListener("mouseenter", () => { tr.style.background = "#f5f8ff"; });
      tr.addEventListener("mouseleave", () => { tr.style.background = ""; });
      tr.addEventListener("click", () => {
        if (id) {
          const pb = pantosMapM.get(id) ?? null;
          openPantoModal({id, pantoMeta: pb, toothStats, invalidation});
        }
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    display(wrap);
  }
}
```

## Overlay de medianas pareadas en el espacio anatómico

Cada par aporta **un** punto azul (diente izquierdo en su posición **mediana**
de la población pareada) y **un** punto naranja (diente derecho homólogo
**reflejado** contra el plano sagital, también en su mediana pareada). Si
la población fuera perfectamente simétrica, ambos puntos del par coincidirían.
El largo y el color de la línea entre ellos representan la magnitud de
asimetría mediana del par.

```js
display(symmetryOverlay({
  symmetryData,
  selectedFdi: selectedFdi,
  highlightTopN: 3,
  width: Math.min(width, 900),
  height: 500,
}));
```

### Tabla resumen por par

```js
const symRows = symmetryData.pairs.map(p => ({
  "Par (der ↔ izq)": `${p.fdi_r} ↔ ${p.fdi_l}`,
  "N pareado": p.n_paired,
  "Mediana dist.": p.stats.distance.median,
  "Q1 dist.": p.stats.distance.q1,
  "Q3 dist.": p.stats.distance.q3,
  "IQR dist.": p.stats.distance.iqr,
  "P95 dist.": p.stats.distance.p95,
  "Mediana Δreflejoᴧ": p.stats.dx_reflect.median,
  "Mediana ΔY": p.stats.dy.median,
}));
display(Inputs.table(symRows, {
  format: {
    "Mediana dist.": d3.format(".4f"),
    "Q1 dist.": d3.format(".4f"),
    "Q3 dist.": d3.format(".4f"),
    "IQR dist.": d3.format(".4f"),
    "P95 dist.": d3.format(".4f"),
    "Mediana Δreflejoᴧ": d3.format(".4f"),
    "Mediana ΔY": d3.format(".4f"),
  },
}));
```

## Overlay de los 4 cuadrantes

Elegí qué cuadrantes superponer. Con **exactamente 2** seleccionados, se dibujan flechas entre posiciones FDI homólogas y se reporta la distancia media: **Q1 vs Q2** evalúa simetría bilateral; **Q1 vs Q4** evalúa alineación oclusal.

<details>
<summary>Cómo leer este gráfico</summary>

Todos los dientes se proyectan sobre un mismo hemilado (|x|, y): los del lado derecho se reflejan para que coincidan en espacio con los del lado izquierdo. Esto permite comparación directa entre cuadrantes.

- **Comparando Q1 vs Q2** (o Q4 vs Q3) — evalúa simetría bilateral *en la geometría media*: los puntos deberían superponerse si la arcada es simétrica.
- **Comparando Q1 vs Q4** (o Q2 vs Q3) — evalúa alineación oclusal: si los dientes superiores están directamente sobre los inferiores, los puntos coinciden.
- **Flechas** (con exactamente 2 cuadrantes) — conectan pares FDI homólogos (posición 1 con posición 1, etc.) y se reporta la distancia media.
- **Elipses ±1σ** (opcionales) — muestran la dispersión gaussiana de cada posición.

</details>

```js
const selectedQuadrantsInput = Inputs.checkbox(
  [1, 2, 3, 4],
  {
    label: "Cuadrantes",
    value: [1, 2],
    format: (q) => ({1: "Q1 (sup. der.)", 2: "Q2 (sup. izq.)", 3: "Q3 (inf. izq.)", 4: "Q4 (inf. der.)"})[q],
  }
);
const selectedQuadrants = Generators.input(selectedQuadrantsInput);
const showQuadrantEllipsesInput = Inputs.toggle({label: "Mostrar elipse ±1σ", value: true});
const showQuadrantEllipses = Generators.input(showQuadrantEllipsesInput);
```

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
display(html`<div style="display:flex; gap:16px; align-items:center; padding:4px 0;">${selectedQuadrantsInput}${showQuadrantEllipsesInput}</div>`);
```

</details>

```js
display(quadrantOverlay({
  toothStats,
  quadrants: selectedQuadrants,
  showEllipses: showQuadrantEllipses,
  width: Math.min(width, 760),
  height: 480,
}));
```

## Z-scores morfométricos individuales

Para cada individuo con datos completos, se calcula cuántos desvíos estándar se aleja de la media poblacional en cada métrica clínica. Un z-score cercano a 0 indica un individuo "típico"; valores > 2 o < −2 indican baja frecuencia clínica.

```js
{
  // Compute per-individual morphometric z-scores
  const ovStats = occlusionData.stats;

  // Join: overjet/overbite individuals ∩ bolton individuals (by short ID)
  const boltMap = new Map(boltEnriched.map(d => [d.short_filename, d]));

  const morfoScores = occEnriched.map(d => {
    const id = extractIdM(d.json_filename);
    const b  = id ? boltMap.get(id) : null;
    const z_overjet  = ovStats.overjet.std  > 0 ? (d.overjet  - ovStats.overjet.mean)  / ovStats.overjet.std  : null;
    const z_overbite = ovStats.overbite.std > 0 ? (d.overbite - ovStats.overbite.mean) / ovStats.overbite.std : null;
    return {
      id,
      json_filename: d.json_filename,
      z_overjet, z_overbite,
      z_bolton_ant: b?.anterior_z ?? null,
      z_bolton_ov:  b?.overall_z  ?? null,
      overjet: d.overjet, overbite: d.overbite,
      anterior_ratio: b?.anterior_ratio ?? null,
      overall_ratio:  b?.overall_ratio  ?? null,
      data_origin: d.data_origin, sex: d.sex,
    };
  }).filter(d => d.z_overjet != null);

  // Histogram of z_overjet
  const W = Math.min(width, 620), H = 280;
  const margin = {top: 16, right: 24, bottom: 44, left: 48};
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  // Use Plot for histograms, one per metric
  const metrics = [
    {key: "z_overjet",  label: "z — Overjet",    data: morfoScores.filter(d => d.z_overjet  != null).map(d => d.z_overjet)},
    {key: "z_overbite", label: "z — Overbite",   data: morfoScores.filter(d => d.z_overbite != null).map(d => d.z_overbite)},
    {key: "z_bolton_ant", label: "z — Bolton ant.", data: morfoScores.filter(d => d.z_bolton_ant != null).map(d => d.z_bolton_ant)},
    {key: "z_bolton_ov",  label: "z — Bolton overall", data: morfoScores.filter(d => d.z_bolton_ov  != null).map(d => d.z_bolton_ov)},
  ];

  const gridDiv = document.createElement("div");
  gridDiv.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-bottom:1rem;";

  for (const {label, data} of metrics) {
    const pMin = d3.min(data), pMax = d3.max(data);
    const p = Plot.plot({
      width: 280, height: 180,
      marginLeft: 36, marginBottom: 36,
      x: {label, domain: [Math.min(pMin, -3.5), Math.max(pMax, 3.5)]},
      y: {label: null},
      marks: [
        Plot.rectY(data, Plot.binX({y: "count"}, {x: d => d, thresholds: 30, fill: "#4e79a7", fillOpacity: 0.7})),
        Plot.ruleX([-2, 2], {stroke: "#e15759", strokeDasharray: "5,3", strokeWidth: 1.2}),
        Plot.ruleX([0], {stroke: "#888", strokeDasharray: "4,3"}),
      ],
    });
    gridDiv.appendChild(p);
  }
  display(gridDiv);
  display(html`<small style="color:#888">Líneas rojas punteadas = ±2σ. Línea gris = z=0 (media poblacional). Las distribuciones son aproximadamente normales por construcción (los z-scores se calculan con la media y SD de la misma muestra).</small>`);
}
```

<div style="border-left: 4px solid #72b7b2; background: #f7fdfd; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La arcada de esta población es predominantemente <strong>cuadrada</strong> (ratio profundidad/ancho intermolar < 0.70 en ambas arcadas) — primer cálculo de este tipo para esta cohorte. Los índices de Bolton medianos se mantienen dentro del rango normativo, con variabilidad individual considerable. La asimetría bilateral es baja a nivel poblacional; los pares anteriores (13↔23) presentan la mayor desviación respecto al plano sagital.
</div>
