---
title: Individuo vs Población
---

# Individuo vs Población

```js
import {pantoTable, cleanArchivo} from "./components/panto-table.js";
import {pantoSchematic} from "./components/panto-schematic.js";
import {miniOdontograma} from "./components/mini-odontograma.js";
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
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
```

```js
display(htl.html`<p>Seleccioná una pantomografía de la tabla para comparar su geometría dental con la eigendentadura poblacional. <strong>${individuals.length.toLocaleString("es-AR")} pantomografías</strong> disponibles.</p>`);
```

```js
// Build lookup maps
const pbMap      = new Map(allBrowserPantos.map(p => [p.archivo, p]));
const occMap     = new Map(occIndividuals.map(d => [cleanArchivo(d.json_filename), d]));
const boltonMap  = new Map(boltonData.individuals.map(d => [d.short_filename, d]));

// Symmetry score: mean lateral displacement of homologous tooth pairs
function computeSymmetry(teeth) {
  if (!teeth?.length) return null;
  const byFdi = new Map(teeth.map(t => [t.fdi, t]));
  const pairs = [[11,21],[12,22],[13,23],[14,24],[15,25],[16,26],[17,27],[18,28],
                 [41,31],[42,32],[43,33],[44,34],[45,35],[46,36],[47,37],[48,38]];
  let sum = 0, n = 0;
  for (const [a, b] of pairs) {
    const ta = byFdi.get(a), tb = byFdi.get(b);
    if (ta && tb) { sum += Math.hypot(ta.cx + tb.cx, ta.cy - tb.cy); n++; }
  }
  return n > 0 ? sum / n : null;
}

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

// Enrich every panto with individual z-scores, arch form, occlusion, and bolton
const indivScoreMap = new Map(individuals.map(d => {
  const sid = cleanArchivo(d.json_filename);
  return [sid, {
    z_mean:     d.z_mean,
    z_max:      d.z_max,
    z_pos:      d.z_pos,
    z_ang:      d.z_ang,
    arch_ratio: computeIndivArchRatio(d.teeth),
    symmetry:   computeSymmetry(d.teeth),
  }];
}));

const allPantosEnriched = allBrowserPantos.map(p => {
  const score = indivScoreMap.get(p.archivo) ?? {};
  const occ   = occMap.get(p.archivo) ?? {};
  const bol   = boltonMap.get(p.archivo) ?? {};
  return {
    ...p,
    ...score,
    overjet:    occ.overjet           ?? null,
    overbite:   occ.overbite          ?? null,
    bolton_ant: bol.anterior_ratio    ?? null,
    bolton_ov:  bol.overall_ratio     ?? null,
  };
});

// Arch ratio → z-score relative to population distribution
const _archRatios = allPantosEnriched.map(p => p.arch_ratio).filter(v => v != null);
const archRatioMean = d3.mean(_archRatios);
const archRatioStd  = d3.deviation(_archRatios);
for (const p of allPantosEnriched) {
  p.arch_z = (p.arch_ratio != null && archRatioStd > 0)
    ? Math.abs((p.arch_ratio - archRatioMean) / archRatioStd)
    : null;
  p.arch_shape = p.arch_ratio != null
    ? (p.arch_ratio >= 0.0740 ? "Triangular" : p.arch_ratio >= 0.0352 ? "Ovalada" : "Cuadrada")
    : null;
  // Morbilidad count
  p.n_morb = Object.values(p.flags ?? {}).filter(v => v > 0).length;
}

// Ranking de atipicidad (1 = más atípico por z̄)
const N_RANKED = allPantosEnriched.filter(p => p.z_mean != null).length;
[...allPantosEnriched]
  .filter(p => p.z_mean != null)
  .sort((a, b) => b.z_mean - a.z_mean)
  .forEach((p, i) => { p.rank_atypical = i + 1; });
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

const fdiInput  = Inputs.toggle({label: "Tiene FDI", value: false});
const fdiFilter = Generators.input(fdiInput);
const fdiComplInput  = Inputs.toggle({label: "FDI completo", value: false});
const fdiComplFilter = Generators.input(fdiComplInput);
const lmInput   = Inputs.toggle({label: "LM completos", value: false});
const lmFilter  = Generators.input(lmInput);

const archShapeInput  = Inputs.select(["Todas", "Ovalada", "Triangular", "Cuadrada"], {value: "Todas", label: "Arcada"});
const archShapeFilter = Generators.input(archShapeInput);

const multimorbInput  = Inputs.toggle({label: "Multimorbilidad (≥2)", value: false});
const multimorbFilter = Generators.input(multimorbInput);
const sinmorbInput    = Inputs.toggle({label: "Sin morbilidad", value: false});
const sinmorbFilter   = Generators.input(sinmorbInput);
const superInput      = Inputs.toggle({label: "Con supernumerarios", value: false});
const superFilter     = Generators.input(superInput);

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

// Ranking de atipicidad
const rankSlider = N_RANKED > 0
  ? rangeSlider({label: "Ranking", min: 1, max: N_RANKED, value: [1, N_RANKED], step: 1, format: v => `#${Math.round(v)}`})
  : null;
const rankRange = rankSlider ? Generators.input(rankSlider) : null;

// Simetría bilateral
const symVals = allPantosEnriched.map(p => p.symmetry).filter(v => v != null);
const symSlider = symVals.length ? rangeSlider({label: "Simetría", min: 0, max: Math.ceil(d3.max(symVals)*1000)/1000, value: [0, Math.ceil(d3.max(symVals)*1000)/1000], step: 0.001, format: v => v.toFixed(3)}) : null;
const symRange = symSlider ? Generators.input(symSlider) : null;

// z-score sliders (z_mean, z_max)
const zmVals = allPantosEnriched.map(p => p.z_mean).filter(v => v != null);
const zmSlider = zmVals.length ? rangeSlider({label: "z̄", min: 0, max: Math.ceil(d3.max(zmVals)*10)/10, value: [0, Math.ceil(d3.max(zmVals)*10)/10], step: 0.1, format: v => v.toFixed(2)}) : null;
const zmRange = zmSlider ? Generators.input(zmSlider) : null;

const zmxVals = allPantosEnriched.map(p => p.z_max).filter(v => v != null);
const zmxSlider = zmxVals.length ? rangeSlider({label: "z_max", min: 0, max: Math.ceil(d3.max(zmxVals)*10)/10, value: [0, Math.ceil(d3.max(zmxVals)*10)/10], step: 0.1, format: v => v.toFixed(2)}) : null;
const zmxRange = zmxSlider ? Generators.input(zmxSlider) : null;

// Occlusion sliders (overjet, overbite)
const ojVals = allPantosEnriched.map(p => p.overjet).filter(v => v != null);
const ojMin = ojVals.length ? Math.floor(d3.min(ojVals)*10)/10 : 0;
const ojMax = ojVals.length ? Math.ceil(d3.max(ojVals)*10)/10 : 1;
const ojSlider = ojVals.length ? rangeSlider({label: "Overjet", min: ojMin, max: ojMax, value: [ojMin, ojMax], step: 0.1, format: v => v.toFixed(2)}) : null;
const ojRange = ojSlider ? Generators.input(ojSlider) : null;

const obVals = allPantosEnriched.map(p => p.overbite).filter(v => v != null);
const obMin = obVals.length ? Math.floor(d3.min(obVals)*10)/10 : 0;
const obMax = obVals.length ? Math.ceil(d3.max(obVals)*10)/10 : 1;
const obSlider = obVals.length ? rangeSlider({label: "Overbite", min: obMin, max: obMax, value: [obMin, obMax], step: 0.1, format: v => v.toFixed(2)}) : null;
const obRange = obSlider ? Generators.input(obSlider) : null;

// Bolton sliders
const baVals = allPantosEnriched.map(p => p.bolton_ant).filter(v => v != null);
const baMin = baVals.length ? Math.floor(d3.min(baVals)*1000)/1000 : 0;
const baMax = baVals.length ? Math.ceil(d3.max(baVals)*1000)/1000 : 1;
const baSlider = baVals.length ? rangeSlider({label: "Bolton ant.", min: baMin, max: baMax, value: [baMin, baMax], step: 0.001, format: v => v.toFixed(3)}) : null;
const baRange = baSlider ? Generators.input(baSlider) : null;

const boVals = allPantosEnriched.map(p => p.bolton_ov).filter(v => v != null);
const boMin = boVals.length ? Math.floor(d3.min(boVals)*1000)/1000 : 0;
const boMax = boVals.length ? Math.ceil(d3.max(boVals)*1000)/1000 : 1;
const boSlider = boVals.length ? rangeSlider({label: "Bolton total", min: boMin, max: boMax, value: [boMin, boMax], step: 0.001, format: v => v.toFixed(3)}) : null;
const boRange = boSlider ? Generators.input(boSlider) : null;

// Sort state — controlled by column header clicks in the table
const sortState = Mutable({key: null, dir: "asc"});
const setSortState = ({key, dir}) => { sortState.value = {key, dir}; };
```

```js
const zpLo = zpRange[0], zpHi = zpRange[1];
const zaLo = zaRange[0], zaHi = zaRange[1];
const azLo = azRange[0], azHi = azRange[1];
const rankLo = rankRange ? rankRange[0] : 1,       rankHi = rankRange ? rankRange[1] : Infinity;
const symLo  = symRange  ? symRange[0]  : -Infinity, symHi  = symRange  ? symRange[1]  : Infinity;
const zmLo  = zmRange  ? zmRange[0]  : -Infinity, zmHi  = zmRange  ? zmRange[1]  : Infinity;
const zmxLo = zmxRange ? zmxRange[0] : -Infinity, zmxHi = zmxRange ? zmxRange[1] : Infinity;
const ojLo  = ojRange  ? ojRange[0]  : -Infinity, ojHi  = ojRange  ? ojRange[1]  : Infinity;
const obLo  = obRange  ? obRange[0]  : -Infinity, obHi  = obRange  ? obRange[1]  : Infinity;
const baLo  = baRange  ? baRange[0]  : -Infinity, baHi  = baRange  ? baRange[1]  : Infinity;
const boLo  = boRange  ? boRange[0]  : -Infinity, boHi  = boRange  ? boRange[1]  : Infinity;
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
  row1.append(searchInput, catInput, dentInput, flagInput, archShapeInput);
  inner.appendChild(row1);

  const row2 = document.createElement("div");
  row2.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;align-items:center;";
  row2.append(fdiInput, fdiComplInput, lmInput, multimorbInput, sinmorbInput, superInput);
  inner.appendChild(row2);

  const row3 = document.createElement("div");
  row3.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 16px;";
  const note = document.createElement("div");
  note.style.cssText = "grid-column:1/-1;font-size:0.78rem;color:#777;";
  note.innerHTML = "Rangos de ranking, tipicidad, simetría, arcada, oclusión y proporciones:";
  row3.appendChild(note);
  if (rankSlider) row3.appendChild(rankSlider);
  if (symSlider)  row3.appendChild(symSlider);
  if (zmSlider)  row3.appendChild(zmSlider);
  if (zmxSlider) row3.appendChild(zmxSlider);
  row3.appendChild(zpSlider);
  row3.appendChild(zaSlider);
  row3.appendChild(azSlider);
  if (ojSlider) row3.appendChild(ojSlider);
  if (obSlider) row3.appendChild(obSlider);
  if (baSlider) row3.appendChild(baSlider);
  if (boSlider) row3.appendChild(boSlider);
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
  if (fdiFilter && !(p.con_fdi > 0)) return false;
  if (fdiComplFilter && !p.fdi_completo) return false;
  if (lmFilter && !p.lm_completo) return false;
  if (archShapeFilter !== "Todas" && p.arch_shape !== archShapeFilter) return false;
  if (multimorbFilter && p.n_morb < 2) return false;
  if (sinmorbFilter && p.n_morb > 0) return false;
  if (superFilter && !(p.n_super > 0)) return false;
  if (p.rank_atypical != null && (p.rank_atypical < rankLo || p.rank_atypical > rankHi)) return false;
  if (p.symmetry  != null && (p.symmetry  < symLo  || p.symmetry  > symHi))  return false;
  if (p.z_mean    != null && (p.z_mean    < zmLo  || p.z_mean    > zmHi))  return false;
  if (p.z_max     != null && (p.z_max     < zmxLo || p.z_max     > zmxHi)) return false;
  if (p.z_pos     != null && (p.z_pos     < zpLo  || p.z_pos     > zpHi))  return false;
  if (p.z_ang     != null && (p.z_ang     < zaLo  || p.z_ang     > zaHi))  return false;
  if (p.arch_z    != null && (p.arch_z    < azLo  || p.arch_z    > azHi))  return false;
  if (p.overjet   != null && (p.overjet   < ojLo  || p.overjet   > ojHi))  return false;
  if (p.overbite  != null && (p.overbite  < obLo  || p.overbite  > obHi))  return false;
  if (p.bolton_ant != null && (p.bolton_ant < baLo || p.bolton_ant > baHi)) return false;
  if (p.bolton_ov != null && (p.bolton_ov < boLo  || p.bolton_ov > boHi))  return false;
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
{
  const nTotal    = allPantosEnriched.length;
  const nFiltered = pantos.length;
  const nNoScore  = pantos.filter(p => p.z_mean == null).length;
  const bar = document.createElement("div");
  bar.style.cssText = "font-size:11px;color:#888;margin-bottom:4px;display:flex;gap:12px;align-items:center;";
  bar.innerHTML =
    `<span><strong style="color:#333;">${nFiltered.toLocaleString("es-AR")}</strong> de ${nTotal.toLocaleString("es-AR")} registros</span>` +
    (nNoScore > 0
      ? `<span style="color:#e07020;">⚠ ${nNoScore} sin z-score (aparecen al final al ordenar por z)</span>`
      : ``);
  display(bar);
}

display(pantoTable({
  pantos,
  page: pageState,
  pageSize: PAGE_SIZE,
  selectedA: selectedArchivo,
  onSelectA: selectRow,
  onPage: goToPage,
  sortKey: sortState.key,
  sortDir: sortState.dir,
  onSortChange: setSortState,
  extraColumns: [
    {key: "rank_atypical", header: "Rank",    width: "40px", format: v => v != null ? `#${v}` : "—"},
    {key: "z_mean",        header: "z̄",       width: "42px", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "z_pos",         header: "z_pos",   width: "42px", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "z_ang",         header: "z_ang",   width: "42px", format: v => v != null ? v.toFixed(1) : "—"},
    {key: "arch_shape",    header: "Arcada",  width: "70px", format: v => v ?? "—"},
    {key: "arch_z",        header: "Δarc",    width: "42px", format: v => v != null ? v.toFixed(2) : "—"},
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

<details><summary>Cómo leer este visor</summary>

La pantomografía muestra la geometría completa del individuo. Activá **Eigendentadura** para superponer los centroides de la eigendentadura (posición media de la población). Activá **Elipses población** para ver los elipses ±1σ de dispersión poblacional. Los **Contornos** muestran los polígonos de cada diente; los **Centroides** son los puntos geométricos; las **Etiquetas FDI** muestran la numeración dental. Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

```js
{
  const {indiv, indivPb} = selectedData;

  const ALL_FDI_PERM = [11,12,13,14,15,16,17,18, 21,22,23,24,25,26,27,28,
                        31,32,33,34,35,36,37,38, 41,42,43,44,45,46,47,48];
  const toothNumbers = indivPb?.tooth_numbers ?? [];
  const presentSet   = new Set(toothNumbers);
  const missing      = ALL_FDI_PERM.filter(f => !presentSet.has(f));
  const nPermanent   = ALL_FDI_PERM.filter(f => presentSet.has(f)).length;
  const nTemporary   = toothNumbers.filter(f => f >= 51 && f <= 85).length;
  const nSuper       = pantoGeom?.shapes?.filter(s => s.et === "tooth" && s.es === "supernumerary").length ?? 0;

  function zBadge(label, val, color = "#4c78a8") {
    if (val == null) return "";
    const hi = val >= 3, med = val >= 2;
    const c = hi ? "#c0392b" : med ? "#e15759" : color;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c}18;border:1px solid ${c}44;` +
      `border-radius:4px;padding:2px 7px;margin:2px;font-size:0.78rem;">` +
      `<span style="color:${c};font-weight:600;">${label}</span>` +
      `<span style="color:#333;">${Number(val).toFixed(3)}</span></span>`;
  }

  const vizState = {
    // Diente
    showPolygon:         false,
    showBbox:            false,
    showMinbbox:         false,
    showCentroids:       true,
    showLabels:          false,
    showGrid:            false,
    showTemporary:       false,
    showSupernumeraries: false,
    // Referencia
    showDividers:        false,
    showCurve:           false,
    showDentitionBbox:   false,
    showLandmarks:       false,
    showEigendentadura:  true,
    showEigenLabels:     true,
    showPopEllipses:     false,
    showMinbboxUpper:    false,
    showMinbboxLower:    false,
    showMinbboxQ1:       false,
    showMinbboxQ2:       false,
    showMinbboxQ3:       false,
    showMinbboxQ4:       false,
    // Entidades
    showMetalCrown:      true,
    showMetalBridge:     true,
    showMetalImplant:    true,
    showMetalPost:       true,
    showMetalOrtodoncia: true,
    showMetalGeneric:    true,
  };

  let selectedTeeth = [...ALL_FDI];

  const schContainer = document.createElement("div");
  const toothSelContainer = document.createElement("div");

  function renderSchematic() {
    const prevSvg = schContainer.querySelector("svg");
    const savedTransform = prevSvg ? d3.zoomTransform(prevSvg) : null;
    pantoSchematic(schContainer, pantoGeom, {
      initialTransform:    savedTransform,
      thinStrokes:         true,
      ...vizState,
      selectedTeeth:       selectedTeeth.length === ALL_FDI.length ? null : selectedTeeth,
      eigendentaduraStats: toothStatsArch,
    });
  }

  function renderToothSel() {
    toothSelContainer.innerHTML = "";
    toothSelContainer.appendChild(teethSelector({
      selected: selectedTeeth,
      cellW: 22, cellH: 19,
      onToggle: fdi => {
        const i = selectedTeeth.indexOf(fdi);
        selectedTeeth = i >= 0 ? selectedTeeth.filter(f => f !== fdi) : [...selectedTeeth, fdi];
        renderToothSel();
        if (pantoGeom) renderSchematic();
      },
      onSetSelection: fdis => {
        selectedTeeth = [...fdis];
        renderToothSel();
        if (pantoGeom) renderSchematic();
      },
    }));
  }

  function makeToggle(label, key) {
    const btn = document.createElement("button");
    const update = () => {
      btn.style.background  = vizState[key] ? "#e8f0fe" : "#f5f5f5";
      btn.style.color       = vizState[key] ? "#2a5db0" : "#666";
      btn.style.borderColor = vizState[key] ? "#4c78a8" : "#ccc";
    };
    btn.textContent = label;
    btn.style.cssText = "padding:2px 8px;border:1px solid;border-radius:4px;cursor:pointer;font-size:11px;transition:all 0.1s;white-space:nowrap;";
    update();
    btn.addEventListener("click", () => {
      vizState[key] = !vizState[key];
      update();
      if (pantoGeom) renderSchematic();
    });
    return btn;
  }

  function makeRow(...items) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:3px 0;";
    row.append(...items);
    return row;
  }

  function makeSection(title) {
    const det = document.createElement("details");
    const sum = document.createElement("summary");
    sum.style.cssText = "cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#666;padding:4px 0;user-select:none;";
    sum.textContent = title;
    det.appendChild(sum);
    det.style.cssText = "border-top:1px solid #eee;padding:2px 0;";
    return det;
  }

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "border:1px solid #dde3f0;border-radius:8px;padding:1rem 1.2rem;background:#fafafa;margin:0.6rem 0;overflow:hidden;";

  // ── Header: ID + metadata grid ──
  if (indiv) {
    const headerGrid = document.createElement("div");
    headerGrid.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start;margin-bottom:0.6rem;";

    const metaDiv = document.createElement("div");
    const metaParts = [
      indivPb?.categoria ?? "–",
      indivPb?.denticion ?? indiv.sex ?? "–",
      `${nPermanent} perm.${missing.length > 0 ? ` (${missing.length} faltantes)` : ""}`,
    ];
    if (nTemporary > 0) metaParts.push(`${nTemporary} temp.`);
    metaDiv.innerHTML =
      `<div style="font-family:monospace;font-size:0.85rem;font-weight:700;margin-bottom:4px;">${selectedArchivo}</div>` +
      `<div style="font-size:0.82rem;color:#666;">` +
        metaParts.join(" · ") +
        (nSuper > 0 ? ` · <span style="color:#e07020;font-weight:600;">${nSuper} supernumerario${nSuper > 1 ? "s" : ""}</span>` : "") +
      `</div>` +
      `<div style="font-size:0.78rem;color:#999;margin-top:2px;">` +
        [indiv.data_origin, indiv.sex].filter(Boolean).join(" · ") +
      `</div>`;

    const odontDiv = document.createElement("div");
    odontDiv.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;gap:3px;";
    odontDiv.appendChild(miniOdontograma({toothNumbers, cellSize: 14, gap: 2}));
    const countParts = [`${nPermanent} perm. · ${missing.length} faltantes`];
    if (nTemporary > 0) countParts.push(`${nTemporary} temp.`);
    if (nSuper > 0) countParts.push(`${nSuper} supernum.`);
    const countSpan = document.createElement("span");
    countSpan.style.cssText = "font-size:11px;color:#888;text-align:right;";
    countSpan.textContent = countParts.join(" · ");
    odontDiv.appendChild(countSpan);

    headerGrid.append(metaDiv, odontDiv);
    wrapper.appendChild(headerGrid);

    // ── Z-score badges ──
    const badgesDiv = document.createElement("div");
    badgesDiv.style.cssText = "display:flex;flex-wrap:wrap;margin-bottom:0.5rem;";
    badgesDiv.innerHTML =
      zBadge("z̄",     indiv.z_mean, "#54a24b") +
      zBadge("z_max",  indiv.z_max,  "#e15759") +
      zBadge("z_pos",  indiv.z_pos,  "#4c78a8") +
      zBadge("z_ang",  indiv.z_ang,  "#7b52ab");
    wrapper.appendChild(badgesDiv);

    // ── Patologías ──
    const flags = indivPb?.flags ?? {};
    const activeFlags = Object.entries(flags).filter(([, v]) => v > 0);
    if (activeFlags.length > 0) {
      const flagsDiv = document.createElement("div");
      flagsDiv.style.marginBottom = "0.6rem";
      flagsDiv.innerHTML =
        `<span style="font-size:11px;color:#888;font-weight:600;margin-right:6px;">Patologías:</span>` +
        activeFlags.map(([k, v]) =>
          `<span style="background:#fff5f0;border:1px solid #f4a46033;border-radius:3px;` +
          `padding:1px 6px;font-size:0.77rem;margin:2px;display:inline-flex;gap:3px;">` +
          `<span style="color:#e07020;">${k}</span><span style="color:#888;">(${v})</span></span>`
        ).join("");
      wrapper.appendChild(flagsDiv);
    }
  }

  // ── Controls panel ──
  const controlsPanel = document.createElement("div");
  controlsPanel.style.cssText = "border-top:1px solid #e5e5ec;margin:0.5rem 0 0.4rem;padding-top:2px;";

  // ▸ Diente
  const secDiente = makeSection("Diente");
  const dContent = document.createElement("div");
  dContent.style.cssText = "padding:4px 0 6px;";
  dContent.append(
    makeRow(
      makeToggle("Contornos",      "showPolygon"),
      makeToggle("Centroides",     "showCentroids"),
      makeToggle("Etiquetas FDI",  "showLabels"),
      makeToggle("Bbox",           "showBbox"),
      makeToggle("MinBbox",        "showMinbbox"),
      makeToggle("Grilla",         "showGrid"),
      makeToggle("Temporales",     "showTemporary"),
      makeToggle("Supernumerarios","showSupernumeraries"),
    ),
    toothSelContainer,
  );
  renderToothSel();
  secDiente.appendChild(dContent);

  // ▸ Referencia
  const secRef = makeSection("Referencia");
  const mbGrp = document.createElement("span");
  mbGrp.style.cssText = "font-size:11px;color:#888;white-space:nowrap;";
  mbGrp.textContent = "MinBbox:";
  const rContent = document.createElement("div");
  rContent.style.cssText = "padding:4px 0 6px;";
  rContent.append(
    makeRow(
      makeToggle("Divisores",       "showDividers"),
      makeToggle("Curva maxilar",   "showCurve"),
      makeToggle("Bbox dentición",  "showDentitionBbox"),
      makeToggle("Landmarks",       "showLandmarks"),
    ),
    makeRow(
      makeToggle("Eigendentadura",  "showEigendentadura"),
      makeToggle("Elipses pobl.",   "showPopEllipses"),
      makeToggle("Etiq. eigen",     "showEigenLabels"),
    ),
    makeRow(
      mbGrp,
      makeToggle("Sup", "showMinbboxUpper"),
      makeToggle("Inf", "showMinbboxLower"),
      makeToggle("Q1",  "showMinbboxQ1"),
      makeToggle("Q2",  "showMinbboxQ2"),
      makeToggle("Q3",  "showMinbboxQ3"),
      makeToggle("Q4",  "showMinbboxQ4"),
    ),
  );
  secRef.appendChild(rContent);

  // ▸ Entidades
  const secEnt = makeSection("Entidades");
  const eContent = document.createElement("div");
  eContent.style.cssText = "padding:4px 0 6px;";
  eContent.appendChild(makeRow(
    makeToggle("Coronas",    "showMetalCrown"),
    makeToggle("Puentes",    "showMetalBridge"),
    makeToggle("Implantes",  "showMetalImplant"),
    makeToggle("Posts",      "showMetalPost"),
    makeToggle("Ortodoncia", "showMetalOrtodoncia"),
    makeToggle("Genérico",   "showMetalGeneric"),
  ));
  secEnt.appendChild(eContent);

  controlsPanel.append(secDiente, secRef, secEnt);
  wrapper.appendChild(controlsPanel);

  // ── Visor ──
  if (pantoGeom) {
    const hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;color:#aaa;padding:2px 0 4px;";
    hint.textContent = "Scroll para zoom · Drag para mover · Doble-clic para resetear";
    wrapper.append(hint, schContainer);
    renderSchematic();
  } else {
    const noGeom = document.createElement("p");
    noGeom.style.cssText = "color:#aaa;text-align:center;padding:2rem 1rem;font-size:13px;";
    noGeom.textContent = `Sin geometría disponible para esta muestra${selectedArchivo ? ` (${selectedArchivo})` : ""}.`;
    wrapper.appendChild(noGeom);
  }

  display(wrapper);
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

**Eje X — z_pos**: atipicidad posicional media (desvío de los centroides dentales respecto al promedio poblacional). **Eje Y — z_ang**: atipicidad angular media. Cada punto es una pantomografía, coloreada por z̄ (atipicidad global: amarillo → rojo). El **punto rojo** con círculo es el individuo seleccionado. Individuos cerca del origen son los más típicos. Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

```js
{
  const {indiv} = selectedData;
  if (indiv) {
    const pop = individuals.filter(d => d.z_pos != null && d.z_ang != null);
    const zmMax = d3.max(pop, d => d.z_mean ?? 0);
    const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, zmMax * 0.7]);

    const xMax = d3.max(pop, d => d.z_pos) * 1.05;
    const yMax = d3.max(pop, d => d.z_ang) * 1.05;

    const W = Math.min(width, 600), H = 380;
    const margin = {top:16,right:24,bottom:46,left:52};
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;
    const xS0 = d3.scaleLinear().domain([0, xMax]).range([0,iW]);
    const yS0 = d3.scaleLinear().domain([0, yMax]).range([iH,0]);
    let xS = xS0.copy(), yS = yS0.copy();

    const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("font-family","var(--sans-serif, system-ui)");
    svg.append("defs").append("clipPath").attr("id","indiv-clip2").append("rect").attr("width",iW).attr("height",iH);
    const gO = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);
    const xAxisG = gO.append("g").attr("transform",`translate(0,${iH})`);
    const yAxisG = gO.append("g");
    const xLabel = gO.append("text").attr("x",margin.left + iW/2 - margin.left).attr("y",iH + 36).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("z_pos (atipicidad posicional)");
    gO.append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-40).attr("fill","#555").attr("text-anchor","middle").attr("font-size",11).text("z_ang (atipicidad angular)");

    const g = gO.append("g").attr("clip-path","url(#indiv-clip2)");

    function drawScatter() {
      g.selectAll("*").remove();
      xAxisG.selectAll("*").remove();
      yAxisG.selectAll("*").remove();
      xAxisG.call(d3.axisBottom(xS).ticks(5));
      yAxisG.call(d3.axisLeft(yS).ticks(4));

      g.selectAll("circle.pop").data(pop).join("circle")
        .attr("cx",d=>xS(d.z_pos)).attr("cy",d=>yS(d.z_ang))
        .attr("r",2).attr("fill",d=>colorScale(d.z_mean??0)).attr("opacity",0.45);

      const zp = indiv.z_pos ?? 0, za = indiv.z_ang ?? 0;
      g.append("circle").attr("cx",xS(zp)).attr("cy",yS(za)).attr("r",9).attr("fill","none").attr("stroke","#e15759").attr("stroke-width",2.5);
      g.append("circle").attr("cx",xS(zp)).attr("cy",yS(za)).attr("r",4).attr("fill","#e15759").attr("opacity",0.95);
    }
    drawScatter();

    // Zoom & pan
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", ({transform}) => {
        xS = transform.rescaleX(xS0);
        yS = transform.rescaleY(yS0);
        drawScatter();
      });
    svg.call(zoom);
    svg.on("dblclick.zoom", () => {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      xS = xS0.copy(); yS = yS0.copy();
      drawScatter();
    });

    display(svg.node());
    display(html`<small style="color:#888">● rojo = individuo seleccionado · color = z̄ (amarillo→rojo: más atípico) · scroll para zoom, drag para mover, doble-clic para resetear.</small>`);
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
