---
title: Explorador Normalizado
---

# Explorador Normalizado por Landmarks

Visualización de pantomografías en el **espacio normalizado** por landmarks condíleos.
Todas las pantos comparten el mismo sistema de coordenadas (origen = midpoint intercondíleo, eje X = intercondíleo, escala = distancia intercondílea), permitiendo **comparación directa**.

Seleccioná una o dos pantos para superponer.

```js
import {pantoNormalized} from "./components/panto-normalized.js";
import {pantoTable, cleanArchivo} from "./components/panto-table.js";
import {miniOdontograma} from "./components/mini-odontograma.js";
import {odontograma} from "./components/odontograma.js";
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
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
  ${fdiInput}${metalFilterInput}${cariesFilterInput}${sinFdiInput}
</div>`);
```

</details>

```js
// Only show pantos with landmarks (required for normalization)
const pantos = allPantos.filter(p => {
  if (!p.lm_completo) return false;
  if (searchTerm && !cleanArchivo(p.archivo).toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (catFilter !== "Todas" && p.categoria !== catFilter) return false;
  if (dentFilter !== "Todas" && p.denticion !== dentFilter) return false;
  if (flagFilter !== "Ninguna" && !(p.flags && p.flags[flagFilter] > 0)) return false;
  if (fdiFilter && !p.fdi_completo) return false;
  if (metalRequired && !(p.flags && p.flags["Metal"] > 0)) return false;
  if (cariesRequired && !(p.flags && p.flags["Caries"] > 0)) return false;
  if (sinFdiFilter && p.con_fdi > 0) return false;
  return true;
});
```

```js
display(html`<div style="font-size: 12px; color: #888; padding: 4px 0;">
  ${pantos.length} pantos con landmarks (de ${allPantos.length} totales)
</div>`);
```

<!-- ═══════ SELECCIÓN DUAL ═══════ -->

## Selección de Pantos

```js
const PAGE_SIZE = 12;
const pageState = Mutable(0);
function goToPage(p) { pageState.value = p; }
```

```js
const selectedA = Mutable(pantos.length > 0 ? pantos[0].archivo : null);
const selectedB = Mutable(null);

function selectPantoA(archivo) { selectedA.value = archivo; }
function selectPantoB(archivo) {
  selectedB.value = selectedB.value === archivo ? null : archivo;
}
```

```js
display(pantoTable({
  pantos,
  page: pageState,
  pageSize: PAGE_SIZE,
  selectedA: selectedA,
  selectedB: selectedB,
  onSelectA: selectPantoA,
  onSelectB: selectPantoB,
  onPage: goToPage,
}));
```

```js
const pantoA = pantos.find(p => p.archivo === selectedA);
const pantoB = selectedB ? pantos.find(p => p.archivo === selectedB) : null;
```

```js
if (pantoA || pantoB) {
  const parts = [];
  if (pantoA) parts.push(html`<span style="color: #4e79a7; font-weight: bold;">A: ${cleanArchivo(pantoA.archivo)}</span>
    <span style="color: #888;"> (${pantoA.dientes} dientes, Cat ${pantoA.categoria})</span>`);
  if (pantoB) parts.push(html`<span style="color: #e15759; font-weight: bold;"> B: ${cleanArchivo(pantoB.archivo)}</span>
    <span style="color: #888;"> (${pantoB.dientes} dientes, Cat ${pantoB.categoria})</span>`);
  display(html`<div style="font-size: 12px; padding: 6px 0; border-top: 1px solid #eee; margin-top: 4px;">
    ${parts}
  </div>`);
}
```

<!-- ═══════ OPCIONES ═══════ -->

```js
const polygonInput = Inputs.toggle({label: "Contorno", value: true});
const showPolygon = Generators.input(polygonInput);
const centroidInput = Inputs.toggle({label: "Centroides", value: false});
const showCentroids = Generators.input(centroidInput);
const labelsInput = Inputs.toggle({label: "Etiquetas FDI", value: true});
const showLabels = Generators.input(labelsInput);
const eigenInput = Inputs.toggle({label: "Eigendentadura", value: true});
const showEigen = Generators.input(eigenInput);
```

```js
display(html`<div style="display: flex; gap: 16px; padding: 4px 0;">
  ${polygonInput}${centroidInput}${labelsInput}${eigenInput}
</div>`);
```

<!-- ═══════ FILTRO DE DIENTES ═══════ -->

```js
const selectedTeeth = Mutable([...ALL_FDI]);

function toggleSchematicTooth(fdi) {
  const cur = selectedTeeth.value;
  const idx = cur.indexOf(fdi);
  selectedTeeth.value = idx >= 0 ? cur.filter(f => f !== fdi) : [...cur, fdi];
}
function setSchematicSelection(fdis) { selectedTeeth.value = fdis; }
```

<details>
<summary style="cursor: pointer; font-size: 13px; color: #444; font-weight: 600;">Filtro de dientes</summary>

```js
display(teethSelector({
  selected: selectedTeeth,
  onToggle: toggleSchematicTooth,
  onSetSelection: setSchematicSelection,
  fdiNombres: {},
}));
```

</details>

<!-- ═══════ VISUALIZACIÓN ═══════ -->

## Vista Normalizada

```js
const geomA = selectedA
  ? await fetch(`./_file/data/pantos_geometry/${selectedA.replace('.json', '')}.json`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
  : null;
```

```js
const geomB = selectedB
  ? await fetch(`./_file/data/pantos_geometry/${selectedB.replace('.json', '')}.json`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
  : null;
```

```js
const schematicContainer = document.createElement("div");

pantoNormalized(schematicContainer, geomA, geomB, {
  showPolygon,
  showCentroids,
  showLabels,
  showEigendentadura: showEigen,
  eigendentaduraStats: toothStatsData,
  selectedTeeth: selectedTeeth.length === 32 ? null : selectedTeeth,
  label1: selectedA ? `A: ${selectedA.slice(0, 10)}…` : "—",
  label2: selectedB ? `B: ${selectedB.slice(0, 10)}…` : "—",
});

display(schematicContainer);
```

<div class="note" style="font-size: 12px; color: #888; margin-top: 8px;">

**Espacio normalizado:** Origen = punto medio intercondíleo. Eje X = eje intercondíleo (cóndilo izq → der). Escala: 1.0 = distancia intercondílea.
Los ejes grises marcan el origen. Las elipses grises representan la eigendentadura (media ± 1σ poblacional).
</div>
