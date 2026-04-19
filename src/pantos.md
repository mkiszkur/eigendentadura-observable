---
title: Explorador de Pantomografías
---

# Explorador de Pantomografías

```js
import {pantoSchematic} from "./components/panto-schematic.js";
import {pantoTable, cleanArchivo} from "./components/panto-table.js";
import {miniOdontograma} from "./components/mini-odontograma.js";
import {odontograma} from "./components/odontograma.js";
import * as d3 from "d3";
```

```js
const toothStatsData = await FileAttachment("data/tooth_stats.json").json();
const browserData = await FileAttachment("data/pantos_browser.json").json();
const meta = browserData.metadata;
const allPantos = browserData.pantos;
```

<!-- ═══════ FILTROS ═══════ -->

```js
const searchInput = Inputs.text({placeholder: "Buscar archivo…", width: 280});
const searchTerm = Generators.input(searchInput);

const catInput = Inputs.select(["Todas", ...meta.categorias], {value: "Todas", label: "Cat."});
const catFilter = Generators.input(catInput);

const dentInput = Inputs.select(["Todas", ...meta.denticiones], {value: "Todas", label: "Dent."});
const dentFilter = Generators.input(dentInput);

const flagInput = Inputs.select(["Ninguna", ...meta.flag_names], {value: "Ninguna", label: "Patología"});
const flagFilter = Generators.input(flagInput);

const fdiInput = Inputs.toggle({label: "FDI completo", value: false});
const fdiFilter = Generators.input(fdiInput);
const lmInput = Inputs.toggle({label: "LM completos", value: false});
const lmFilter = Generators.input(lmInput);
const metalFilterInput = Inputs.toggle({label: "Con metal", value: false});
const metalRequired = Generators.input(metalFilterInput);
const cariesFilterInput = Inputs.toggle({label: "Con caries", value: false});
const cariesRequired = Generators.input(cariesFilterInput);
const sinFdiInput = Inputs.toggle({label: "Sin FDI", value: false});
const sinFdiFilter = Generators.input(sinFdiInput);
```

```js
display(html`<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: end;">
  ${searchInput}${catInput}${dentInput}${flagInput}
</div>`);
```

<details>
<summary style="cursor: pointer; font-size: 13px; color: #666;">Más filtros…</summary>

```js
display(html`<div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 6px 0;">
  ${fdiInput}${lmInput}${metalFilterInput}${cariesFilterInput}${sinFdiInput}
</div>`);
```

</details>

```js
const pantos = allPantos.filter(p => {
  if (searchTerm && !cleanArchivo(p.archivo).toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (catFilter !== "Todas" && p.categoria !== catFilter) return false;
  if (dentFilter !== "Todas" && p.denticion !== dentFilter) return false;
  if (flagFilter !== "Ninguna" && !(p.flags && p.flags[flagFilter] > 0)) return false;
  if (fdiFilter && !p.fdi_completo) return false;
  if (lmFilter && !p.lm_completo) return false;
  if (metalRequired && !(p.flags && p.flags["Metal"] > 0)) return false;
  if (cariesRequired && !(p.flags && p.flags["Caries"] > 0)) return false;
  if (sinFdiFilter && p.con_fdi > 0) return false;
  return true;
});
```

<!-- ═══════ TABLA PAGINADA ═══════ -->

```js
const PAGE_SIZE = 15;
const pageState = Mutable(0);

function goToPage(p) { pageState.value = p; }
```

```js
const selectedArchivo = Mutable(pantos.length > 0 ? pantos[0].archivo : null);

function selectRow(archivo) {
  selectedArchivo.value = archivo;
}
```

```js
display(pantoTable({
  pantos,
  page: pageState,
  pageSize: PAGE_SIZE,
  selectedA: selectedArchivo,
  onSelectA: selectRow,
  onPage: goToPage,
}));
```

```js
const selectedPanto = pantos.find(p => p.archivo === selectedArchivo);
```

<!-- ═══════ DETALLE DE SELECCIÓN ═══════ -->

```js
if (selectedPanto) {
  const fl = Object.entries(selectedPanto.flags || {});
  display(html`<div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: start; padding: 8px 0; border-top: 1px solid #eee; margin-top: 4px;">
    <div style="display: flex; gap: 20px; align-items: start; font-size: 12px; flex-wrap: wrap;">
      <span><b>${selectedPanto.dientes}</b> dientes (FDI:${selectedPanto.con_fdi}, sin:${selectedPanto.sin_fdi}) · Cat <b>${selectedPanto.categoria}</b>${selectedPanto.score != null ? ` (${selectedPanto.score})` : ""} · ${selectedPanto.denticion}</span>
      <span>Q1:${selectedPanto.q1} Q2:${selectedPanto.q2} Q3:${selectedPanto.q3} Q4:${selectedPanto.q4} · ${selectedPanto.img_w}×${selectedPanto.img_h}px</span>
      ${fl.length > 0 ? html`<span>${fl.map(([k,v]) => html`<span style="background:#f0f0f0;border-radius:3px;padding:0 4px;margin:0 1px;font-size:11px">${k}:${v}</span>`)}</span>` : ""}
    </div>
    <div>
      ${miniOdontograma({toothNumbers: selectedPanto.tooth_numbers, cellSize: 18, gap: 2})}
    </div>
  </div>`);
}
```

<!-- ═══════ ESQUEMA ═══════ -->

```js
const pantoGeom = selectedArchivo
  ? await fetch(`/_file/data/pantos_geometry/${selectedArchivo.replace('.json', '')}.json`).then(r => {
      if (!r.ok) throw new Error(`No geometry for ${selectedArchivo}`);
      return r.json();
    }).catch(e => { console.warn(e); return null; })
  : null;
```

<!-- Toggles de visualización: todos en un solo bloque reactivo para evitar re-renders parciales -->

```js
const bboxInput = Inputs.toggle({label: "Bbox", value: false});
const showBbox = Generators.input(bboxInput);
const minbboxInput = Inputs.toggle({label: "MinBbox", value: false});
const showMinbbox = Generators.input(minbboxInput);
const polygonInput = Inputs.toggle({label: "Contorno", value: true});
const showPolygon = Generators.input(polygonInput);
const centroidInput = Inputs.toggle({label: "Centroides", value: false});
const showCentroids = Generators.input(centroidInput);
const labelsInput = Inputs.toggle({label: "Etiquetas", value: true});
const showLabels = Generators.input(labelsInput);
const gridInput = Inputs.toggle({label: "Grilla", value: false});
const showGrid = Generators.input(gridInput);
const landmarksInput = Inputs.toggle({label: "Landmarks", value: false});
const showLandmarks = Generators.input(landmarksInput);
const eigenInput = Inputs.toggle({label: "Eigendentadura", value: false});
const showEigen = Generators.input(eigenInput);
const dividersInput = Inputs.toggle({label: "Divisores", value: true});
const showDividers = Generators.input(dividersInput);
const curveInput = Inputs.toggle({label: "Curva maxilar", value: true});
const showCurve = Generators.input(curveInput);
const dentBboxInput = Inputs.toggle({label: "Bbox dentición", value: false});
const showDentBbox = Generators.input(dentBboxInput);

const mbUpperInput = Inputs.toggle({label: "Sup", value: false});
const showMbUpper = Generators.input(mbUpperInput);
const mbLowerInput = Inputs.toggle({label: "Inf", value: false});
const showMbLower = Generators.input(mbLowerInput);
const mbQ1Input = Inputs.toggle({label: "Q1", value: false});
const showMbQ1 = Generators.input(mbQ1Input);
const mbQ2Input = Inputs.toggle({label: "Q2", value: false});
const showMbQ2 = Generators.input(mbQ2Input);
const mbQ3Input = Inputs.toggle({label: "Q3", value: false});
const showMbQ3 = Generators.input(mbQ3Input);
const mbQ4Input = Inputs.toggle({label: "Q4", value: false});
const showMbQ4 = Generators.input(mbQ4Input);

const mcCrownInput = Inputs.toggle({label: "Coronas", value: false});
const showMcCrown = Generators.input(mcCrownInput);
const mcBridgeInput = Inputs.toggle({label: "Puentes", value: false});
const showMcBridge = Generators.input(mcBridgeInput);
const mcImplantInput = Inputs.toggle({label: "Implantes", value: false});
const showMcImplant = Generators.input(mcImplantInput);
const mcPostInput = Inputs.toggle({label: "Posts", value: false});
const showMcPost = Generators.input(mcPostInput);
const mcOrtoInput = Inputs.toggle({label: "Ortodoncia", value: false});
const showMcOrto = Generators.input(mcOrtoInput);
const mcGenericInput = Inputs.toggle({label: "Genérico", value: false});
const showMcGeneric = Generators.input(mcGenericInput);
```

```js
const ALL_FDI = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
                 48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

const selectedTeeth = Mutable([...ALL_FDI]);

function toggleSchematicTooth(fdi) {
  const current = selectedTeeth.value;
  const idx = current.indexOf(fdi);
  if (idx >= 0) {
    selectedTeeth.value = current.filter(f => f !== fdi);
  } else {
    selectedTeeth.value = [...current, fdi];
  }
}
function setTeethAll() { selectedTeeth.value = [...ALL_FDI]; }
function setTeethNone() { selectedTeeth.value = []; }
function setTeethUpper() { selectedTeeth.value = ALL_FDI.filter(f => f <= 28); }
function setTeethLower() { selectedTeeth.value = ALL_FDI.filter(f => f >= 31); }
```

<!-- Opciones de visualización: 3 secciones colapsables -->

<details open>
<summary style="cursor: pointer; font-size: 13px; color: #444; font-weight: 600;">Diente</summary>

```js
display(html`<div style="display: grid; grid-template-columns: repeat(3, auto); gap: 6px 16px; padding: 6px 0;">
  ${polygonInput}${bboxInput}${minbboxInput}
  ${centroidInput}${labelsInput}${gridInput}
</div>`);
```

```js
const selTeethSet = new Set(selectedTeeth);
const odonto = odontograma({
  selected: selTeethSet,
  fdiNombres: {},
  onToggle: toggleSchematicTooth,
  cellW: 36,
  cellH: 30,
  gap: 2,
});
display(html`<div style="display: flex; align-items: center; gap: 16px; padding: 4px 0;">
  ${odonto}
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <button onclick=${setTeethAll}
      style="padding: 3px 10px; font-size: 11px; cursor: pointer;">Todos</button>
    <button onclick=${setTeethNone}
      style="padding: 3px 10px; font-size: 11px; cursor: pointer;">Ninguno</button>
    <button onclick=${setTeethUpper}
      style="padding: 3px 10px; font-size: 11px; cursor: pointer;">Superiores</button>
    <button onclick=${setTeethLower}
      style="padding: 3px 10px; font-size: 11px; cursor: pointer;">Inferiores</button>
  </div>
</div>`);
```

</details>

<details>
<summary style="cursor: pointer; font-size: 13px; color: #444; font-weight: 600;">Referencia (dentadura)</summary>

```js
display(html`<div style="display: grid; grid-template-columns: repeat(3, auto); gap: 6px 16px; padding: 6px 0;">
  ${dividersInput}${curveInput}${dentBboxInput}
  ${landmarksInput}${eigenInput}
</div>
<div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 4px 0;">
  <span style="color:#888; font-size: 12px;">MinBBox regional:</span>
  ${mbUpperInput}${mbLowerInput}${mbQ1Input}${mbQ2Input}${mbQ3Input}${mbQ4Input}
</div>`);
```

</details>

<details>
<summary style="cursor: pointer; font-size: 13px; color: #444; font-weight: 600;">Entidades (metal / tratamientos)</summary>

```js
display(html`<div style="display: grid; grid-template-columns: repeat(3, auto); gap: 6px 16px; padding: 6px 0;">
  ${mcCrownInput}${mcBridgeInput}${mcImplantInput}
  ${mcPostInput}${mcOrtoInput}${mcGenericInput}
</div>`);
```

</details>

```js
const schematicContainer = document.createElement("div");

if (pantoGeom) {
  pantoSchematic(schematicContainer, pantoGeom, {
    showBbox,
    showMinbbox,
    showPolygon,
    showCentroids,
    showLabels,
    showGrid,
    showLandmarks,
    showDividers,
    showCurve,
    showDentitionBbox: showDentBbox,
    showMinbboxUpper: showMbUpper,
    showMinbboxLower: showMbLower,
    showMinbboxQ1: showMbQ1,
    showMinbboxQ2: showMbQ2,
    showMinbboxQ3: showMbQ3,
    showMinbboxQ4: showMbQ4,
    showMetalCrown: showMcCrown,
    showMetalBridge: showMcBridge,
    showMetalImplant: showMcImplant,
    showMetalPost: showMcPost,
    showMetalOrtodoncia: showMcOrto,
    showMetalGeneric: showMcGeneric,
    selectedTeeth: selectedTeeth.length === 32 ? null : selectedTeeth,
    showEigendentadura: showEigen,
    eigendentaduraStats: toothStatsData,
  });
} else {
  schematicContainer.innerHTML = `<p style="color:#999; font-style: italic;">Seleccioná un archivo para ver su esquema.</p>`;
}

display(schematicContainer);
```

<p style="font-size: 11px; color: #aaa; margin-top: 2px;">Scroll zoom · Drag pan · Doble-clic reset</p>
