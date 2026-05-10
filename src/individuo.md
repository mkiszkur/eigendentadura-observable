---
title: Individuo vs Población
---

# Individuo vs Población

Seleccioná una pantomografía de la tabla para comparar su geometría dental con la eigendentadura poblacional. **${individuals.length.toLocaleString("es-AR")} pantomografías** disponibles.

```js
import {pantoTable, cleanArchivo} from "./components/panto-table.js";
import {pantoSchematic} from "./components/panto-schematic.js";
import {archForm, computeArchMetrics, ARCH_UPPER, ARCH_LOWER} from "./components/arch-form.js";
import {angleRose} from "./components/angle-rose.js";
import {individualRosePlot} from "./components/individual-rose-plot.js";
import {rangeSlider} from "./components/range-slider.js";
import * as d3 from "d3";
```

```js
const toothStats       = await FileAttachment("data/tooth_stats_lm.json").json();
const individuals      = await FileAttachment("data/individual_scores.json").json();
const browserData      = await FileAttachment("data/pantos_browser.json").json();
const angleHistograms  = await FileAttachment("data/tooth_angle_histograms.json").json();
const occIndividuals   = await FileAttachment("data/occlusion_individuals.json").json();
const boltonData       = await FileAttachment("data/bolton.json").json();
const occPopData       = await FileAttachment("data/occlusion.json").json();

const meta             = browserData.metadata;
const allBrowserPantos = browserData.pantos;

// Field mapping for arch-form.js (needs mean_x/mean_y)
const toothStatsArch = toothStats.map(s => ({
  ...s, mean_x: s.cx_mean, mean_y: s.cy_mean,
  std_x: s.cx_std ?? 0, std_y: s.cy_std ?? 0,
}));

// Build lookup maps
const pbMap      = new Map(allBrowserPantos.map(p => [p.archivo, p]));
const occMap     = new Map(occIndividuals.map(d => [cleanArchivo(d.json_filename), d]));
const boltonMap  = new Map(boltonData.individuals.map(d => [d.short_filename, d]));

// Arch form ratio (maxilar): depth / intermolar, computed from individual teeth in LM-normalized space
function computeIndivArchRatio(teeth) {
  if (!teeth?.length) return null;
  const byFdi = new Map(teeth.map(t => [t.fdi, t]));
  const m16 = byFdi.get(16), m26 = byFdi.get(26);
  const i11 = byFdi.get(11), i21 = byFdi.get(21);
  if (!m16 || !m26) return null;
  const incisors = [i11, i21].filter(Boolean);
  if (!incisors.length) return null;
  const intermolar = Math.hypot(m16.cx - m26.cx, m16.cy - m26.cy);
  const frontY = incisors.reduce((s, t) => s + t.cy, 0) / incisors.length;
  const midMolarY = (m16.cy + m26.cy) / 2;
  const depth = Math.abs(midMolarY - frontY);
  return intermolar > 0 ? depth / intermolar : null;
}

// Enrich every panto with individual z-scores and arch form
const indivScoreMap = new Map(individuals.map(d => [cleanArchivo(d.json_filename), {
  z_mean: d.z_mean, z_max: d.z_max, z_pos: d.z_pos, z_ang: d.z_ang,
  arch_ratio: computeIndivArchRatio(d.teeth),
}]));

const allPantosEnriched = allBrowserPantos.map(p => ({
  ...p, ...indivScoreMap.get(p.archivo) ?? {},
}));

// Arch ratio → z-score relative to population distribution
const _archRatios = allPantosEnriched.map(p => p.arch_ratio).filter(v => v != null);
const archRatioMean = d3.mean(_archRatios);
const archRatioStd  = d3.deviation(_archRatios);
for (const p of allPantosEnriched) {
  p.arch_z = (p.arch_ratio != null && archRatioStd > 0)
    ? Math.abs((p.arch_ratio - archRatioMean) / archRatioStd)
    : null;
  p.arch_shape = p.arch_ratio != null
    ? (p.arch_ratio > 0.85 ? "Triangular" : p.arch_ratio < 0.70 ? "Cuadrada" : "Ovalada")
    : null;
}
```

<!-- ═══════ FILTROS ═══════ -->

```js
const searchInput = Inputs.text({placeholder: "Buscar archivo…", width: 260});
const searchTerm  = Generators.input(searchInput);

const catInput  = Inputs.select(["Todas", ...meta.categorias], {value: "Todas", label: "Cat."});
const catFilter = Generators.input(catInput);

const dentInput  = Inputs.select(["Todas", "Permanente", "Temporal", "Sin clasificar", "Mixta"], {value: "Todas", label: "Dent."});
const dentFilter = Generators.input(dentInput);

const flagInput  = Inputs.select(["Ninguna", ...meta.flag_names], {value: "Ninguna", label: "Patología"});
const flagFilter = Generators.input(flagInput);

const fdiInput  = Inputs.toggle({label: "FDI completo", value: false});
const fdiFilter = Generators.input(fdiInput);
const lmInput   = Inputs.toggle({label: "LM completos", value: false});
const lmFilter  = Generators.input(lmInput);

// Tipicality range sliders (min–max)
const zpVals = allPantosEnriched.map(p => p.z_pos).filter(v => v != null);
const zpSlider = rangeSlider({label: "z_pos", min: 0, max: Math.ceil(d3.max(zpVals)*10)/10, value: [0, Math.ceil(d3.max(zpVals)*10)/10], step: 0.1, format: v => v.toFixed(2)});
const zpRange = Generators.input(zpSlider);

const zaVals = allPantosEnriched.map(p => p.z_ang).filter(v => v != null);
const zaSlider = rangeSlider({label: "z_ang", min: 0, max: Math.ceil(d3.max(zaVals)*10)/10, value: [0, Math.ceil(d3.max(zaVals)*10)/10], step: 0.1, format: v => v.toFixed(2)});
const zaRange = Generators.input(zaSlider);

const azVals = allPantosEnriched.map(p => p.arch_z).filter(v => v != null);
const azSlider = rangeSlider({label: "Δ arcada", min: 0, max: Math.ceil(d3.max(azVals)*10)/10, value: [0, Math.ceil(d3.max(azVals)*10)/10], step: 0.1, format: v => v.toFixed(2)});
const azRange = Generators.input(azSlider);

// Sort state — controlled by column header clicks in the table
const sortState = Mutable({key: null, dir: "asc"});
```

```js
const [zpLo, zpHi] = zpRange;
const [zaLo, zaHi] = zaRange;
const [azLo, azHi] = azRange;
```

```js
{
  const filtersDiv = document.createElement("details");
  filtersDiv.style.cssText = "border:1px solid #e5e5ec;border-radius:8px;background:#f9f9fb;margin-bottom:0.8rem;";
  const sum = document.createElement("summary");
  sum.style.cssText = "padding:8px 12px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;cursor:pointer;user-select:none;";
  sum.textContent = "Filtros";
  filtersDiv.appendChild(sum);
  const inner = document.createElement("div");
  inner.style.cssText = "padding:0.8rem 1rem;border-top:1px solid #e5e5ec;display:flex;flex-direction:column;gap:10px;";

  const row1 = document.createElement("div");
  row1.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;";
  row1.append(searchInput, catInput, dentInput, flagInput);
  inner.appendChild(row1);

  const row2 = document.createElement("div");
  row2.style.cssText = "display:flex;gap:10px;align-items:center;";
  row2.append(fdiInput, lmInput);
  inner.appendChild(row2);

  const row3 = document.createElement("div");
  row3.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 16px;";
  const note = document.createElement("div");
  note.style.cssText = "grid-column:1/-1;font-size:0.78rem;color:#777;";
  note.innerHTML = "Rangos de tipicidad y forma de arcada:";
  row3.appendChild(note);
  row3.appendChild(zpSlider);
  row3.appendChild(zaSlider);
  row3.appendChild(azSlider);
  inner.appendChild(row3);

  filtersDiv.appendChild(inner);
  display(filtersDiv);
}
```

```js
goToPage(0);
const _filtered = allPantosEnriched.filter(p => {
  if (searchTerm && !cleanArchivo(p.archivo).toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (catFilter !== "Todas" && p.categoria !== catFilter) return false;
  if (dentFilter !== "Todas" && !p.denticion?.toLowerCase().includes(dentFilter.toLowerCase())) return false;
  if (flagFilter !== "Ninguna" && !(p.flags && p.flags[flagFilter] > 0)) return false;
  if (fdiFilter && !p.fdi_completo) return false;
  if (lmFilter && !p.lm_completo) return false;
  if (p.z_pos  != null && (p.z_pos  < zpLo || p.z_pos  > zpHi)) return false;
  if (p.z_ang  != null && (p.z_ang  < zaLo || p.z_ang  > zaHi)) return false;
  if (p.arch_z != null && (p.arch_z < azLo || p.arch_z > azHi)) return false;
  return true;
});

// Sort by column click
const sk = sortState.key;
const sd = sortState.dir;
const pantos = sk
  ? [..._filtered].sort((a, b) => {
      const av = a[sk] ?? (sd === "asc" ? Infinity : -Infinity);
      const bv = b[sk] ?? (sd === "asc" ? Infinity : -Infinity);
      return sd === "asc" ? (av > bv ? 1 : av < bv ? -1 : 0) : (bv > av ? 1 : bv < av ? -1 : 0);
    })
  : _filtered;
```

## Selección de individuo

```js
const PAGE_SIZE = 15;
const pageState = Mutable(0);
function goToPage(p) { pageState.value = p; }
```

```js
const selectedArchivo = Mutable(pantos.length > 0 ? pantos[0].archivo : null);
function selectRow(archivo) { selectedArchivo.value = archivo; }
```

```js
display(pantoTable({
  pantos,
  page: pageState,
  pageSize: PAGE_SIZE,
  selectedA: selectedArchivo,
  onSelectA: selectRow,
  onPage: goToPage,
  sortKey: sortState.key,
  sortDir: sortState.dir,
  onSortChange: ({key, dir}) => { sortState.value = {key, dir}; },
  extraColumns: [
    {key: "z_mean",     header: "z̄",      width: "42px", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "z_pos",      header: "z_pos",   width: "42px", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "z_ang",      header: "z_ang",   width: "42px", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "arch_shape", header: "Arcada",  width: "70px", format: v => v ?? "—"},
    {key: "arch_z",     header: "Δarc",    width: "42px", format: v => v != null ? v.toFixed(2) : "—"},
  ],
}));
```

<!-- ═══════ DATOS DEL INDIVIDUO SELECCIONADO (single reactive cell) ═══════ -->

```js
const selectedData = {
  indiv:      individuals.find(d => cleanArchivo(d.json_filename) === selectedArchivo),
  indivPb:    pbMap.get(selectedArchivo) ?? null,
  indivOcc:   occMap.get(selectedArchivo) ?? null,
  indivBolton: boltonMap.get(selectedArchivo) ?? null,
};
```

<!-- ═══════ PANTOMOGRAFÍA ═══════ -->

```js
const pantoGeom = selectedArchivo
  ? await fetch(`_file/data/pantos_geometry/${selectedArchivo}.json`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
  : null;
```

```js
{
  const {indiv, indivPb} = selectedData;
  if (indiv) {
    const fl = Object.entries(indivPb?.flags ?? {}).filter(([,v]) => v > 0);
    display(html`<div style="display:flex;gap:12px;flex-wrap:wrap;margin:0.6rem 0 0.4rem;font-size:13px;">
      <div style="padding:5px 12px;background:#f5f5f5;border-radius:5px;"><strong>Archivo:</strong> ${cleanArchivo(indiv.json_filename)}</div>
      <div style="padding:5px 12px;background:#f5f5f5;border-radius:5px;"><strong>Origen:</strong> ${indiv.data_origin ?? "—"}</div>
      <div style="padding:5px 12px;background:#f5f5f5;border-radius:5px;"><strong>Sexo:</strong> ${indiv.sex ?? "—"}</div>
      <div style="padding:5px 12px;background:#f5f5f5;border-radius:5px;"><strong>Dientes:</strong> ${indiv.n_teeth}</div>
      <div style="padding:5px 12px;background:${indiv.z_mean > 2 ? '#fff3cd' : '#f5f5f5'};border-radius:5px;">
        <strong>z̄:</strong> ${indiv.z_mean.toFixed(2)} &nbsp; <strong>z_max:</strong> ${indiv.z_max.toFixed(2)}
      </div>
      ${fl.length > 0 ? html`<div style="padding:5px 12px;background:#fdf0f0;border-radius:5px;font-size:12px;">${fl.map(([k,v]) => html`<span style="background:#e15759;color:#fff;border-radius:3px;padding:1px 6px;margin:0 2px;font-size:11px;">${k}: ${v}</span>`)}</div>` : ""}
    </div>`);
  }
}
```

```js
// Opciones de visualización del esquemático — reactivas
const paContornosInput  = Inputs.toggle({label: "Contornos de dientes", value: true});
const paEigenInput      = Inputs.toggle({label: "Eigendentadura (elipses ±1σ)", value: false});
const paCentroidesInput = Inputs.toggle({label: "Centroides", value: true});
const paLabelsInput     = Inputs.toggle({label: "Labels FDI", value: true});

const paContornos  = Generators.input(paContornosInput);
const paEigen      = Generators.input(paEigenInput);
const paCentroides = Generators.input(paCentroidesInput);
const paLabels     = Generators.input(paLabelsInput);
```

```js
display(html`<details style="border:1px solid #e5e5ec;border-radius:6px;background:#f9f9fb;margin:0.4rem 0 0.2rem;">
  <summary style="padding:6px 12px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;cursor:pointer;user-select:none;">Opciones de visualización</summary>
  <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:6px 12px 10px;font-size:0.85rem;border-top:1px solid #e5e5ec;">
    ${paContornosInput}${paEigenInput}${paCentroidesInput}${paLabelsInput}
  </div>
</details>`);
```

<details><summary>Cómo leer este visor</summary>

La pantomografía muestra la geometría completa del individuo. Activá **Eigendentadura** para superponer los elipses ±1σ de la eigendentadura (posición media ± desviación estándar de la población), proyectados al espacio de píxeles de la imagen usando la transformación inversa de los landmarks. Los **Contornos** muestran los polígonos de cada diente anotado; los **Centroides** son los puntos geométricos de cada diente; los **Labels FDI** muestran la numeración dental. Usá doble-clic para resetear el zoom.

</details>

```js
{
  const container = document.createElement("div");
  container.style.cssText = "border:1px solid #dde3f0;border-radius:8px;padding:6px;background:#fafafa;margin:0.6rem 0;overflow:hidden;";
  if (pantoGeom) {
    pantoSchematic(container, pantoGeom, {
      showBbox: false,
      showPolygon:       paContornos,
      showCentroids:     paCentroides,
      showLabels:        paLabels,
      showDividers:      true,
      showLandmarks:     false,
      showEigendentadura: paEigen,
      eigendentaduraStats: toothStatsArch,
    });
  } else {
    container.innerHTML = `<p style="color:#aaa;text-align:center;padding:2rem 1rem;font-size:13px;">Sin geometría disponible para esta muestra${selectedArchivo ? ` (${selectedArchivo})` : ""}.</p>`;
  }
  display(container);
}
```

## Z-scores por diente

Cuántas desviaciones estándar se separa cada diente del promedio poblacional. Seleccioná la métrica para ver el componente de interés.

<details><summary>Cómo leer este gráfico</summary>

Cada barra es un diente, ordenado anatómicamente de molar a molar (arcada superior izquierda → derecha, luego inferior). La altura es el z-score absoluto en la métrica seleccionada. La escala de color va de amarillo (z≈1) a rojo intenso (z≥3); las líneas de referencia marcan 1σ y 2σ. **z_cx**: desviación horizontal. **z_cy**: desviación vertical. **Promedio cx,cy**: media de las dos componentes posicionales. **z_angular**: desviación en ángulo de inclinación. **z_total**: métrica compuesta posicional + angular.

</details>

```js
const ZSCORE_METRICS = [
  {key: "z_cx",    label: "z_cx — X"},
  {key: "z_cy",    label: "z_cy — Y"},
  {key: "z_pos",   label: "Promedio cx,cy"},
  {key: "z_angle", label: "z_angular"},
  {key: "z_total", label: "z_total"},
];
const zMetricInput = Inputs.radio(ZSCORE_METRICS.map(m => m.key), {
  value: "z_total",
  format: k => ZSCORE_METRICS.find(m => m.key === k).label,
});
const zMetric = Generators.input(zMetricInput);
```

```js
display(html`<details style="border:1px solid #e5e5ec;border-radius:6px;background:#f9f9fb;margin:0.4rem 0 0.2rem;">
  <summary style="padding:6px 12px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;cursor:pointer;user-select:none;">Opciones de visualización</summary>
  <div style="padding:8px 12px 10px;border-top:1px solid #e5e5ec;">
    ${zMetricInput}
  </div>
</details>`);
```

```js
{
  const {indiv} = selectedData;
  if (!indiv || !indiv.teeth || indiv.teeth.length === 0) {
    display(html`<p style="color:#999;">Seleccioná un individuo.</p>`);
  } else {
    const ORDER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
    const teeth = [...indiv.teeth].sort((a,b) => ORDER.indexOf(a.fdi) - ORDER.indexOf(b.fdi));

    const getZ = t => zMetric === "z_pos"
      ? (Math.abs(t.z_cx) + Math.abs(t.z_cy)) / 2
      : Math.abs(t[zMetric] ?? 0);

    const metricLabel = ZSCORE_METRICS.find(m => m.key === zMetric)?.label ?? zMetric;

    const W = Math.min(width, 680), H = 240;
    const margin = {top:20,right:24,bottom:48,left:50};
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const xS = d3.scaleBand().domain(teeth.map(d => d.fdi)).range([0,innerW]).padding(0.15);
    const maxZ = d3.max(teeth, getZ);
    const yS = d3.scaleLinear().domain([0, Math.max(maxZ*1.1, 3)]).range([innerH, 0]);
    const cS = d3.scaleSequential(d3.interpolateOrRd).domain([0, Math.max(maxZ, 3)]);

    const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("font-family","var(--sans-serif, system-ui)");
    const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

    for (const z of [1, 2]) {
      g.append("line").attr("x1",0).attr("x2",innerW).attr("y1",yS(z)).attr("y2",yS(z))
        .attr("stroke", z===2 ? "#e15759" : "#ccc").attr("stroke-dasharray","4,3").attr("stroke-width",z===2?1.5:1);
      g.append("text").attr("x",innerW+4).attr("y",yS(z)+4).attr("font-size",9).attr("fill",z===2?"#e15759":"#999").text(`${z}σ`);
    }

    for (const t of teeth) {
      const val = getZ(t);
      g.append("rect")
        .attr("x",xS(t.fdi)).attr("y",yS(val))
        .attr("width",xS.bandwidth()).attr("height",innerH - yS(val))
        .attr("fill",cS(val)).attr("rx",2)
        .append("title").text(`FDI ${t.fdi}\n${metricLabel} = ${val.toFixed(3)}\nz_cx=${t.z_cx.toFixed(2)}  z_cy=${t.z_cy.toFixed(2)}  z_angle=${t.z_angle.toFixed(2)}  z_total=${t.z_total.toFixed(2)}`);
    }

    g.append("g").attr("transform",`translate(0,${innerH})`).call(d3.axisBottom(xS).tickSize(0))
      .call(g => g.select(".domain").remove())
      .selectAll("text").attr("transform","rotate(-45)").attr("text-anchor","end").attr("font-size",9);
    g.append("g").call(d3.axisLeft(yS).ticks(5)).call(g => g.select(".domain").remove());
    g.append("text").attr("transform","rotate(-90)").attr("x",-innerH/2).attr("y",-35)
      .attr("fill","#666").attr("text-anchor","middle").attr("font-size",11).text(`|${metricLabel}|`);

    display(svg.node());
  }
}
```

## Individuo en la población — atipicidad

<details><summary>Cómo leer este gráfico</summary>

**Eje X — z_pos**: atipicidad posicional media (desvío de los centroides dentales respecto al promedio poblacional). **Eje Y — z_ang**: atipicidad angular media. Cada punto es una pantomografía, coloreada por z̄ (atipicidad global: amarillo → rojo). El **punto rojo** con círculo es el individuo seleccionado. Individuos cerca del origen son los más típicos. Recortado en el percentil 99.

</details>

```js
{
  const {indiv} = selectedData;
  if (indiv) {
    const pop = individuals.filter(d => d.z_pos != null && d.z_ang != null);
    const p99x = d3.quantile(pop.map(d => d.z_pos).sort(d3.ascending), 0.99);
    const p99y = d3.quantile(pop.map(d => d.z_ang).sort(d3.ascending), 0.99);
    const zmMax = d3.max(pop, d => d.z_mean ?? 0);
    const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, zmMax * 0.7]);

    const W = Math.min(width, 600), H = 320;
    const margin = {top:16,right:24,bottom:46,left:52};
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;
    const xS = d3.scaleLinear().domain([0,p99x]).range([0,iW]);
    const yS = d3.scaleLinear().domain([0,p99y]).range([iH,0]);

    const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("font-family","var(--sans-serif, system-ui)");
    svg.append("defs").append("clipPath").attr("id","indiv-clip2").append("rect").attr("width",iW).attr("height",iH);
    const gO = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);
    gO.append("g").attr("transform",`translate(0,${iH})`).call(d3.axisBottom(xS).ticks(5))
      .append("text").attr("x",iW/2).attr("y",36).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("z_pos (atipicidad posicional)");
    gO.append("g").call(d3.axisLeft(yS).ticks(4))
      .append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-40).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("z_ang (atipicidad angular)");

    const g = gO.append("g").attr("clip-path","url(#indiv-clip2)");
    g.selectAll("circle.pop").data(pop.filter(d => d.z_pos <= p99x && d.z_ang <= p99y)).join("circle")
      .attr("cx",d=>xS(d.z_pos)).attr("cy",d=>yS(d.z_ang))
      .attr("r",2).attr("fill",d=>colorScale(d.z_mean??0)).attr("opacity",0.45);

    const zp = indiv.z_pos ?? 0, za = indiv.z_ang ?? 0;
    if (zp <= p99x && za <= p99y) {
      g.append("circle").attr("cx",xS(zp)).attr("cy",yS(za)).attr("r",9).attr("fill","none").attr("stroke","#e15759").attr("stroke-width",2.5);
      g.append("circle").attr("cx",xS(zp)).attr("cy",yS(za)).attr("r",4).attr("fill","#e15759").attr("opacity",0.95);
    }
    display(svg.node());
    display(html`<small style="color:#888">● rojo = individuo seleccionado · color = z̄ (amarillo→rojo: más atípico) · recortado en p99.</small>`);
  } else {
    display(html`<p style="color:#999">Seleccioná un individuo.</p>`);
  }
}
```

## Forma de arcada

Spline del individuo (línea punteada de color) superpuesto sobre la forma de arcada media poblacional (gris). Los puntos de color son los dientes del individuo por cuadrante.

<details><summary>Cómo leer este gráfico</summary>

La **línea gris tenue** de fondo es la arcada media de la población (eigendentadura). La **línea punteada de color** es el spline que conecta los dientes del individuo seleccionado: azul oscuro para el maxilar superior, rojo oscuro para la mandibular. Los **puntos de color** son los centroides de cada diente, coloreados por cuadrante (Q1 azul, Q2 verde, Q3 amarillo, Q4 rojo). La tabla inferior compara medidas morfométricas clásicas entre el individuo y la población.

</details>

```js
{
  const {indiv} = selectedData;
  if (!indiv || !indiv.teeth || !indiv.teeth.length) {
    display(html`<p style="color:#999">Seleccioná un individuo.</p>`);
  } else {
    const W = Math.min(width, 660), H = 430;
    const margin = {top:30,right:30,bottom:50,left:55};
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const xs = toothStatsArch.map(s => s.mean_x), ys = toothStatsArch.map(s => s.mean_y);
    const padX = 0.05, padY = 0.05;
    const xDomain = [d3.min(xs)-padX, d3.max(xs)+padX];
    const yDomain = [d3.min(ys)-padY, d3.max(ys)+padY];
    const unit = Math.min(innerW/(xDomain[1]-xDomain[0]), innerH/(yDomain[1]-yDomain[0]));
    const usedW = (xDomain[1]-xDomain[0])*unit, usedH = (yDomain[1]-yDomain[0])*unit;
    const xS = d3.scaleLinear().domain(xDomain).range([(innerW-usedW)/2, (innerW-usedW)/2+usedW]);
    const yS = d3.scaleLinear().domain(yDomain).range([(innerH-usedH)/2, (innerH-usedH)/2+usedH]);

    // Render population arch, then gray out so individual stands out
    const archSvgNode = archForm({toothStats: toothStatsArch, showMeasurements: false, width: W, height: H});
    const archSel = d3.select(archSvgNode);
    archSel.selectAll("path").filter(function() { return this.getAttribute("fill") === "none"; })
      .attr("stroke", "#c8c8c8").attr("opacity", 0.4);
    archSel.selectAll("circle")
      .attr("fill", "#d4d4d4").attr("stroke", "#bbb").attr("opacity", 0.4);

    const Q_COLORS = {1:"#4e79a7",2:"#59a14f",3:"#edc949",4:"#e15759"};
    const indivByFdi = new Map(indiv.teeth.map(t => [t.fdi, t]));
    const gOver = d3.select(archSvgNode).append("g").attr("transform",`translate(${margin.left},${margin.top})`);

    // Individual arch splines
    for (const [archFdis, color] of [[ARCH_UPPER,"#1a4f7a"],[ARCH_LOWER,"#b02020"]]) {
      const pts = archFdis.map(f => indivByFdi.get(f)).filter(Boolean).map(t => [xS(t.cx),yS(t.cy)]);
      if (pts.length >= 3) {
        gOver.append("path").attr("d", d3.line().curve(d3.curveCatmullRom.alpha(0.5))(pts))
          .attr("fill","none").attr("stroke",color).attr("stroke-width",2.2).attr("stroke-dasharray","5,3").attr("opacity",0.88);
      }
    }
    // Individual tooth centroids
    for (const t of indiv.teeth) {
      const q = Math.floor(t.fdi/10);
      gOver.append("circle").attr("cx",xS(t.cx)).attr("cy",yS(t.cy)).attr("r",5)
        .attr("fill",Q_COLORS[q]??"#999").attr("stroke","#fff").attr("stroke-width",1.2).attr("opacity",0.92)
        .append("title").text(`FDI ${t.fdi}  z=${t.z_total.toFixed(2)}`);
    }

    // Legend
    const lg = d3.select(archSvgNode).append("g").attr("transform",`translate(${margin.left+8},${margin.top+8})`);
    lg.append("rect").attr("width",170).attr("height",62).attr("fill","#fff").attr("stroke","#ddd").attr("rx",3).attr("opacity",0.95);
    lg.append("line").attr("x1",10).attr("y1",16).attr("x2",30).attr("y2",16).attr("stroke","#c8c8c8").attr("stroke-width",2);
    lg.append("text").attr("x",36).attr("y",20).attr("font-size",10).attr("fill","#888").text("Población (eigendentadura)");
    lg.append("line").attr("x1",10).attr("y1",34).attr("x2",30).attr("y2",34).attr("stroke","#1a4f7a").attr("stroke-width",2).attr("stroke-dasharray","5,3");
    lg.append("text").attr("x",36).attr("y",38).attr("font-size",10).attr("fill","#333").text("Individuo — maxilar");
    lg.append("line").attr("x1",10).attr("y1",52).attr("x2",30).attr("y2",52).attr("stroke","#b02020").attr("stroke-width",2).attr("stroke-dasharray","5,3");
    lg.append("text").attr("x",36).attr("y",56).attr("font-size",10).attr("fill","#333").text("Individuo — mandibular");

    display(archSvgNode);

    const im = computeArchMetrics(indiv.teeth.map(t => ({...t,mean_x:t.cx,mean_y:t.cy})));
    const pm = computeArchMetrics(toothStatsArch);
    const rows = [];
    for (const [k,label] of [["maxilar","Maxilar"],["mandibular","Mandibular"]]) {
      const m = im[k], p = pm[k]; if (!m && !p) continue;
      rows.push({Arcada:label,"Intercanino ind":m?.intercanine?.toFixed(3)??"—","Intercanino pop":p?.intercanine?.toFixed(3)??"—","Intermolar ind":m?.intermolar?.toFixed(3)??"—","Intermolar pop":p?.intermolar?.toFixed(3)??"—","Forma ind":m?.shape??"—","Forma pop":p?.shape??"—"});
    }
    if (rows.length) display(Inputs.table(rows));
  }
}
```

## Overjet y overbite

Posición del individuo (punto rojo) dentro de la nube poblacional. Cada punto gris es una pantomografía de la población.

<details><summary>Cómo leer este gráfico</summary>

**Overjet** (eje X): distancia horizontal entre los incisivos superiores e inferiores en coordenadas landmark-normalized. **Overbite** (eje Y): distancia vertical de la misma relación. Valores positivos indican overjet/overbite "normal"; valores negativos, mordida invertida. Cada punto gris semitransparente es un individuo de la población. El **punto rojo** es la muestra seleccionada. Las líneas de referencia marcan el cero en ambos ejes.

</details>

```js
{
  const {indivOcc} = selectedData;
  const pop = occIndividuals.filter(d => d.overjet != null && isFinite(d.overjet) && d.overbite != null && isFinite(d.overbite));

  const W = Math.min(width, 520), H = 360;
  const margin = {top:20,right:24,bottom:52,left:56};
  const iW = W-margin.left-margin.right, iH = H-margin.top-margin.bottom;

  const ojVals = pop.map(d => d.overjet), obVals = pop.map(d => d.overbite);
  const p01oj = d3.quantile(ojVals.slice().sort(d3.ascending), 0.01);
  const p99oj = d3.quantile(ojVals.slice().sort(d3.ascending), 0.99);
  const p01ob = d3.quantile(obVals.slice().sort(d3.ascending), 0.01);
  const p99ob = d3.quantile(obVals.slice().sort(d3.ascending), 0.99);

  // Clinical thresholds (IQR-based, same as morfometria)
  const q1J = d3.quantile(ojVals.slice().sort(d3.ascending), 0.25);
  const q3J = d3.quantile(ojVals.slice().sort(d3.ascending), 0.75);
  const q1B = d3.quantile(obVals.slice().sort(d3.ascending), 0.25);
  const q3B = d3.quantile(obVals.slice().sort(d3.ascending), 0.75);
  const iqrJ = q3J - q1J, iqrB = q3B - q1B;
  const thOJHigh = q3J + 1.5 * iqrJ;
  const thOBHigh = q3B + 1.5 * iqrB;
  const thOBLow  = q1B - 1.5 * iqrB;

  function clinColor(d) {
    if (d.overjet < 0)            return "#b279a2"; // mordida cruzada
    if (d.overbite < thOBLow)     return "#72b7b2"; // mordida abierta
    if (d.overbite > thOBHigh)    return "#e15759"; // overbite elevado
    if (d.overjet  > thOJHigh)    return "#f28e2b"; // overjet elevado
    return "#4e79a7";                                // normal
  }

  const xS = d3.scaleLinear().domain([p01oj, p99oj]).range([0,iW]).nice();
  const yS = d3.scaleLinear().domain([p01ob, p99ob]).range([iH,0]).nice();

  const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("font-family","var(--sans-serif, system-ui)");
  svg.append("defs").append("clipPath").attr("id","occ-clip").append("rect").attr("width",iW).attr("height",iH);
  const gO = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  gO.append("g").attr("transform",`translate(0,${iH})`).call(d3.axisBottom(xS).ticks(6))
    .call(g => g.select(".domain").remove())
    .append("text").attr("x",iW/2).attr("y",38).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("Overjet (landmark-normalized)");
  gO.append("g").call(d3.axisLeft(yS).ticks(5))
    .call(g => g.select(".domain").remove())
    .append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-42).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("Overbite");

  const gc = gO.append("g").attr("clip-path","url(#occ-clip)");

  // Zero + median reference lines
  const medJ = d3.median(pop, d => d.overjet);
  const medB = d3.median(pop, d => d.overbite);
  if (xS.domain()[0] < 0) gc.append("line").attr("x1",xS(0)).attr("x2",xS(0)).attr("y1",0).attr("y2",iH).attr("stroke","#bbb").attr("stroke-width",1);
  if (yS.domain()[0] < 0) gc.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(0)).attr("y2",yS(0)).attr("stroke","#bbb").attr("stroke-width",1);
  gc.append("line").attr("x1",xS(medJ)).attr("x2",xS(medJ)).attr("y1",0).attr("y2",iH).attr("stroke","#ccc").attr("stroke-dasharray","4,3").attr("stroke-width",1);
  gc.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(medB)).attr("y2",yS(medB)).attr("stroke","#ccc").attr("stroke-dasharray","4,3").attr("stroke-width",1);

  // Population cloud — colored by clinical category
  gc.selectAll("circle.p").data(pop.filter(d => d.overjet>=xS.domain()[0]&&d.overjet<=xS.domain()[1]&&d.overbite>=yS.domain()[0]&&d.overbite<=yS.domain()[1])).join("circle")
    .attr("cx",d=>xS(d.overjet)).attr("cy",d=>yS(d.overbite))
    .attr("r",2).attr("fill",d=>clinColor(d)).attr("opacity",0.25);

  // Selected individual
  const oj = indivOcc?.overjet, ob = indivOcc?.overbite;
  if (oj != null && isFinite(oj) && ob != null && isFinite(ob)) {
    gc.append("circle").attr("cx",xS(oj)).attr("cy",yS(ob)).attr("r",10).attr("fill","none").attr("stroke","#e15759").attr("stroke-width",2.5);
    gc.append("circle").attr("cx",xS(oj)).attr("cy",yS(ob)).attr("r",4.5).attr("fill","#e15759");
    gc.append("text").attr("x",xS(oj)+13).attr("y",yS(ob)+4).attr("font-size",10).attr("fill","#e15759").attr("font-weight",600)
      .text(`(${oj.toFixed(3)}, ${ob.toFixed(3)})`);
  } else {
    gO.append("text").attr("x",iW/2).attr("y",iH/2).attr("text-anchor","middle").attr("font-size",12).attr("fill","#aaa").text("Sin dato de oclusión para este individuo");
  }

  // Color legend
  const legData = [["#4e79a7","Normal"],["#f28e2b","Overjet elevado"],["#e15759","Overbite elevado"],["#72b7b2","Mordida abierta"],["#b279a2","Mordida cruzada"]];
  const lgG = svg.append("g").attr("transform",`translate(${margin.left + iW - 140},${margin.top + 6})`);
  lgG.append("rect").attr("width",142).attr("height",legData.length*14+6).attr("fill","white").attr("stroke","#eee").attr("rx",3).attr("opacity",0.9);
  legData.forEach(([c,l],i) => {
    lgG.append("circle").attr("cx",8).attr("cy",i*14+12).attr("r",4).attr("fill",c);
    lgG.append("text").attr("x",16).attr("y",i*14+16).attr("font-size",9).attr("fill","#444").text(l);
  });

  display(svg.node());
  display(html`<small style="color:#888">● rojo con círculo = individuo · color = categoría clínica · recortado en p1–p99.</small>`);
}
```

## Índice de Bolton

Relación maxilar/mandibular anterior y total. El punto rojo es el individuo seleccionado; las líneas de referencia marcan las normas de Bolton.

<details><summary>Cómo leer este gráfico</summary>

El **índice de Bolton** compara el ancho mesiodistal total de los dientes maxilares y mandibulares. **Eje X — Bolton anterior**: razón entre los 6 dientes anteriores superiores e inferiores (norma ≈ 77,2 %). **Eje Y — Bolton total**: razón entre los 12 dientes (norma ≈ 91,3 %). Cada punto púrpura es un individuo de la población. La **banda verde** marca el rango normativo (±1 SD de Bolton); las **líneas verdes punteadas**, la media. El **punto rojo** es el individuo seleccionado. Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

```js
{
  const {indivBolton} = selectedData;
  const pop = boltonData.individuals.filter(d => d.anterior_complete && d.overall_complete && d.anterior_ratio != null && d.overall_ratio != null);
  const norms = boltonData.norms;
  const ANT_MEAN = norms.anterior.mean, ANT_STD = norms.anterior.std;
  const OV_MEAN  = norms.overall.mean,  OV_STD  = norms.overall.std;

  const W = Math.min(width, 560), H = 400;
  const M = {top:20, right:24, bottom:52, left:60};
  const iW = W - M.left - M.right, iH = H - M.top - M.bottom;

  const antVals = pop.map(d => d.anterior_ratio), ovVals = pop.map(d => d.overall_ratio);
  const p01a = d3.quantile(antVals.slice().sort(d3.ascending), 0.01);
  const p99a = d3.quantile(antVals.slice().sort(d3.ascending), 0.99);
  const p01o = d3.quantile(ovVals.slice().sort(d3.ascending),  0.01);
  const p99o = d3.quantile(ovVals.slice().sort(d3.ascending),  0.99);
  const xS0 = d3.scaleLinear().domain([Math.min(p01a, ANT_MEAN-2), Math.max(p99a, ANT_MEAN+2)]).range([0, iW]).nice();
  const yS0 = d3.scaleLinear().domain([Math.min(p01o, OV_MEAN-2),  Math.max(p99o, OV_MEAN+2)]).range([iH, 0]).nice();

  const ba = indivBolton?.anterior_ratio, bo = indivBolton?.overall_ratio;
  const hasIndiv = ba != null && isFinite(ba) && bo != null && isFinite(bo);

  const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width","100%")
    .style("font-family","var(--sans-serif,system-ui,sans-serif)").style("cursor","grab");
  const defs = svg.append("defs");
  defs.append("clipPath").attr("id","bol-clip").append("rect").attr("width",iW).attr("height",iH);
  const gO = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);
  const gc  = gO.append("g").attr("clip-path","url(#bol-clip)");

  const xAxis = gO.append("g").attr("transform",`translate(0,${iH})`);
  const yAxis = gO.append("g");
  gO.append("text").attr("x",iW/2).attr("y",iH+38).attr("text-anchor","middle").attr("font-size",11).attr("fill","#666").text("Bolton anterior (%)");
  gO.append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-46).attr("text-anchor","middle").attr("font-size",11).attr("fill","#666").text("Bolton total (%)");
  gO.append("text").attr("x",iW).attr("y",-5).attr("text-anchor","end").attr("font-size",9).attr("fill","#aaa").text("Scroll = zoom · Drag = mover · Doble-clic = resetear");

  function drawAxes(xS, yS) {
    xAxis.call(d3.axisBottom(xS).ticks(6).tickFormat(d => d + "%"))
      .call(ax => ax.select(".domain").attr("stroke","#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("y1",-iH));
    yAxis.call(d3.axisLeft(yS).ticks(5).tickFormat(d => d + "%"))
      .call(ax => ax.select(".domain").attr("stroke","#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",iW));
  }

  function drawContent(xS, yS) {
    gc.selectAll("*").remove();
    const xd = xS.domain(), yd = yS.domain();
    const axBand = [ANT_MEAN - ANT_STD, ANT_MEAN + ANT_STD];
    const oyBand = [OV_MEAN  - OV_STD,  OV_MEAN  + OV_STD];
    // Normative bands (green)
    gc.append("rect")
      .attr("x", xS(Math.max(xd[0], axBand[0]))).attr("y", 0)
      .attr("width",  Math.max(0, xS(Math.min(xd[1], axBand[1])) - xS(Math.max(xd[0], axBand[0]))))
      .attr("height", iH).attr("fill","#59a14f").attr("opacity",0.07);
    gc.append("rect")
      .attr("x", 0).attr("y", yS(Math.min(yd[1], oyBand[1])))
      .attr("width", iW)
      .attr("height", Math.max(0, yS(Math.max(yd[0], oyBand[0])) - yS(Math.min(yd[1], oyBand[1]))))
      .attr("fill","#59a14f").attr("opacity",0.07);
    // Normative mean lines (green dashed)
    gc.append("line").attr("x1",xS(ANT_MEAN)).attr("x2",xS(ANT_MEAN)).attr("y1",0).attr("y2",iH)
      .attr("stroke","#59a14f").attr("stroke-dasharray","5,3").attr("stroke-width",1.2);
    gc.append("line").attr("x1",0).attr("x2",iW).attr("y1",yS(OV_MEAN)).attr("y2",yS(OV_MEAN))
      .attr("stroke","#59a14f").attr("stroke-dasharray","5,3").attr("stroke-width",1.2);
    // Population cloud
    gc.selectAll("circle.pop").data(pop).join("circle").attr("class","pop")
      .attr("cx", d => xS(d.anterior_ratio)).attr("cy", d => yS(d.overall_ratio))
      .attr("r", 2).attr("fill","#7b52ab").attr("opacity",0.13);
    // Individual point (drawn last to stay on top)
    if (hasIndiv) {
      gc.append("circle").attr("cx",xS(ba)).attr("cy",yS(bo)).attr("r",10)
        .attr("fill","none").attr("stroke","#e15759").attr("stroke-width",2);
      gc.append("circle").attr("cx",xS(ba)).attr("cy",yS(bo)).attr("r",4.5).attr("fill","#e15759");
      gc.append("text").attr("x",xS(ba)+13).attr("y",yS(bo)+4)
        .attr("font-size",10).attr("fill","#e15759").attr("font-weight",600)
        .text(`(${ba.toFixed(1)}%, ${bo.toFixed(1)}%)`);
    } else {
      gc.append("text").attr("x",iW/2).attr("y",iH/2)
        .attr("text-anchor","middle").attr("font-size",12).attr("fill","#aaa")
        .text("Sin dato de Bolton para este individuo");
    }
  }

  drawAxes(xS0, yS0);
  drawContent(xS0, yS0);

  const zoom = d3.zoom().scaleExtent([0.5, 20]).on("zoom", (event) => {
    const t = event.transform;
    drawAxes(t.rescaleX(xS0), t.rescaleY(yS0));
    drawContent(t.rescaleX(xS0), t.rescaleY(yS0));
  });
  svg.call(zoom);
  svg.on("dblclick.zoom", () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity));

  display(svg.node());
  display(html`<small style="color:#888">● púrpura = población · ● rojo = individuo · banda verde = norma Bolton ±1 SD.</small>`);
}
```

## Overlay de los 4 cuadrantes

Cada cuadrante del individuo reflejado a la misma hemicara (|x|). Los puntos grises son los centroides medios poblacionales. Permite evaluar simetría interna y desviación respecto al patrón poblacional.

<details><summary>Cómo leer este gráfico</summary>

Los cuatro cuadrantes dentales (Q1 sup. derecho, Q2 sup. izquierdo, Q3 inf. izquierdo, Q4 inf. derecho) se reflejan al mismo lado tomando el valor absoluto de X, de modo que los dientes homólogos queden superpuestos. Cada **punto de color** es un diente del individuo en su cuadrante correspondiente; los números son la posición dentro del cuadrante (1=incisivo central → 8=molar de juicio). Los **círculos grises** son los centroides medios poblacionales. Si los puntos de los cuatro cuadrantes coinciden, el individuo es muy simétrico y típico; si se dispersan, hay asimetría o atipicidad posicional.

</details>

```js
{
  const {indiv} = selectedData;
  if (!indiv || !indiv.teeth || !indiv.teeth.length) {
    display(html`<p style="color:#999">Seleccioná un individuo.</p>`);
  } else {
    const W = Math.min(width, 580), H = 390;
    const margin = {top:28,right:150,bottom:36,left:44};
    const iW = W-margin.left-margin.right, iH = H-margin.top-margin.bottom;

    const popQ = toothStatsArch.filter(s => s.fdi>=11&&s.fdi<=48&&s.quadrant>=1&&s.quadrant<=4)
      .map(s => ({pos:s.fdi%10, q:s.quadrant, x:Math.abs(s.mean_x), y:s.mean_y}));
    const indQ = indiv.teeth.filter(t => t.fdi>=11&&t.fdi<=48)
      .map(t => ({fdi:t.fdi, pos:t.fdi%10, q:Math.floor(t.fdi/10), x:Math.abs(t.cx), y:t.cy}));

    const all = [...popQ,...indQ];
    const xMax = d3.max(all,d=>d.x)*1.1;
    const yMin = d3.min(all,d=>d.y), yMax = d3.max(all,d=>d.y);
    const unit = Math.min(iW/xMax, iH/(yMax-yMin));
    const offX = (iW-xMax*unit)/2, offY = (iH-(yMax-yMin)*unit)/2;
    const x = v => offX+v*unit, y = v => offY+(v-yMin)*unit;

    const QC = {1:"#4e79a7",2:"#f28e2b",3:"#e15759",4:"#59a14f"};
    const QL = {1:"Q1 — sup. der.",2:"Q2 — sup. izq.",3:"Q3 — inf. izq.",4:"Q4 — inf. der."};

    const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("background","#fff").style("font-family","var(--sans-serif, system-ui)");
    const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

    g.append("line").attr("x1",x(0)).attr("x2",x(0)).attr("y1",y(yMin)).attr("y2",y(yMax)).attr("stroke","#bbb").attr("stroke-dasharray","3,3");

    for (const d of popQ) {
      g.append("circle").attr("cx",x(d.x)).attr("cy",y(d.y)).attr("r",6).attr("fill","#e8e8e8").attr("stroke","#ccc").attr("stroke-width",0.4);
      g.append("text").attr("x",x(d.x)).attr("y",y(d.y)+4).attr("text-anchor","middle").attr("font-size",7).attr("fill","#aaa").text(d.pos);
    }
    for (const d of indQ) {
      const c = QC[d.q]??"#999";
      g.append("circle").attr("cx",x(d.x)).attr("cy",y(d.y)).attr("r",4).attr("fill",c).attr("stroke","#333").attr("stroke-width",0.5).attr("opacity",0.85)
        .append("title").text(`Q${d.q} FDI ${d.fdi}`);
      g.append("text").attr("x",x(d.x)).attr("y",y(d.y)-6).attr("text-anchor","middle").attr("font-size",7).attr("fill",c).text(d.pos);
    }

    const lg = svg.append("g").attr("transform",`translate(${W-margin.right+8},${margin.top})`);
    lg.append("circle").attr("cx",5).attr("cy",6).attr("r",5).attr("fill","#e8e8e8").attr("stroke","#ccc");
    lg.append("text").attr("x",14).attr("y",10).attr("font-size",10).attr("fill","#888").text("Población");
    let i=1;
    for (const [q,l] of Object.entries(QL)) {
      const ly = 10+i*18;
      lg.append("circle").attr("cx",5).attr("cy",ly+4).attr("r",4).attr("fill",QC[+q]);
      lg.append("text").attr("x",14).attr("y",ly+8).attr("font-size",9).attr("fill","#555").text(l);
      i++;
    }
    display(svg.node());
    display(html`<small style="color:#888">Cada cuadrante reflejado a |x|. Los números son la posición FDI (1–8). Gris = media poblacional.</small>`);
  }
}
```

## Distribución angular: individuo vs población

La **flecha roja** indica el ángulo del diente en el individuo seleccionado. Clic en un diente para ver el detalle ampliado.

<details><summary>Cómo leer este gráfico</summary>

Cada diagrama de rosa muestra la distribución de los ángulos de un diente en la población (histograma circular). La **línea negra** marca el ángulo medio poblacional; el **arco** acotado corresponde a ±1σ. La **flecha roja** es el ángulo del diente en el individuo seleccionado. Si la flecha cae dentro del arco, el diente está angularmente dentro del rango típico; si queda fuera, su inclinación es atípica. Clic en cualquier diente para abrir el detalle ampliado con el histograma completo.

</details>

```js
const showAngleModal = (fdi) => {
  document.querySelectorAll("[data-angle-modal]").forEach(el => el.remove());
  const record = angleHistograms.find(r => r.fdi === fdi);
  if (!record) return;
  const tIndiv = (selectedData.indiv?.teeth || []).find(t => t.fdi === fdi);

  const overlay = document.createElement("div");
  overlay.dataset.angleModal = "1";
  Object.assign(overlay.style, {position:"fixed",inset:"0",background:"rgba(0,0,0,.45)",zIndex:"1000",display:"flex",alignItems:"center",justifyContent:"center"});
  const close = () => overlay.remove();

  const panel = document.createElement("div");
  Object.assign(panel.style, {background:"white",borderRadius:"8px",padding:"18px 22px",boxShadow:"0 8px 28px rgba(0,0,0,.25)",maxWidth:"560px",fontFamily:"var(--sans-serif, system-ui)"});

  const header = document.createElement("div");
  Object.assign(header.style,{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"});
  const title = document.createElement("strong"); title.style.fontSize = "15px"; title.textContent = `Distribución angular — FDI ${fdi}`;
  const btn = document.createElement("button"); btn.textContent = "✕ Cerrar";
  Object.assign(btn.style,{border:"none",background:"#eee",borderRadius:"4px",padding:"4px 10px",cursor:"pointer",fontSize:"13px"});
  btn.addEventListener("click", close);
  header.append(title, btn);

  const hint = document.createElement("div");
  Object.assign(hint.style,{color:"#666",fontSize:"11px",marginBottom:"10px"});
  hint.textContent = tIndiv ? "Línea negra = ángulo medio poblacional · Arco = ±1σ · Flecha roja = ángulo del individuo." : "Línea negra = ángulo medio poblacional · Arco = ±1σ.";

  panel.append(header, hint, angleRose({record, size:420, individualAngle: tIndiv?.angle ?? null, individualLabel: "individuo"}));
  overlay.append(panel);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.body.append(overlay);
};
```

```js
display(individualRosePlot({angleHistograms, toothStats, indiv: selectedData.indiv, onToothClick: showAngleModal, width}));
```

## Detalle de dientes

```js
{
  const {indiv} = selectedData;
  if (indiv?.teeth) {
    const fmt = d3.format(".4f"), fmt2 = d3.format(".2f");
    display(Inputs.table(
      [...indiv.teeth].sort((a,b) => Math.abs(b.z_total) - Math.abs(a.z_total)),
      {columns:["fdi","cx","cy","angle","z_cx","z_cy","z_angle","z_total"],
       header:{fdi:"FDI",cx:"X",cy:"Y",angle:"Ángulo",z_cx:"z_X",z_cy:"z_Y",z_angle:"z_ángulo",z_total:"z_total"},
       format:{cx:fmt,cy:fmt,angle:d=>d.toFixed(1)+"°",z_cx:fmt2,z_cy:fmt2,z_angle:fmt2,z_total:fmt2},sort:"z_total",reverse:true}
    ));
  }
}
```

<div style="border-left:4px solid #b07aa1;background:#fdf7fd;padding:0.8rem 1rem;margin:2rem 0 0.5rem;border-radius:0 4px 4px 0;font-size:0.9rem;line-height:1.6;">
<strong>Hallazgo principal</strong> — Los z-scores por diente, la forma de arcada, el overjet/overbite y el Bolton permiten ubicar cualquier individuo dentro del continuo de variabilidad poblacional. Ver la distribución completa en <a href="./tipicidad">Tipicidad y outliers →</a>
</div>
