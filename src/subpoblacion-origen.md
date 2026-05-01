---
title: Subpoblación — Origen clínico
---

# Subpoblación — Origen clínico

Comparación de la dentadura media entre los **dos centros clínicos** del dataset.
Cada centro aporta su propia nube de centroides por pieza dental; la comparación
responde si hay diferencias sistemáticas en la geometría dental entre poblaciones.

<details>
<summary><strong>Universo de datos</strong> <em>(clic para expandir)</em></summary>

```js
const totalPantos = kdeOrigen.groups["Centro A"].n_pantos + kdeOrigen.groups["Centro B"].n_pantos;
display(html`
<p>El centro clínico se obtiene del prefijo del nombre de archivo. Disponible en
<strong>${totalPantos.toLocaleString()}</strong> pantomografías con landmarks completos
(de un total de ${metadata.unique_pantos.toLocaleString()} con landmarks).</p>
<ul>
  <li><strong>Centro A</strong>: ${kdeOrigen.groups["Centro A"].n_pantos.toLocaleString()} pantomografías</li>
  <li><strong>Centro B</strong>: ${kdeOrigen.groups["Centro B"].n_pantos.toLocaleString()} pantomografías</li>
</ul>
<p>Cada diente aporta independientemente: no se requiere dentadura completa (32/32).
Coordenadas normalizadas por marco condíleo
(origen = punto medio intercondíleo, escala = distancia intercondílea).</p>
`);
```

</details>

```js
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
import {subpopKdePlot} from "./components/subpop-kde-plot.js";
import {subpopDiffHeatmap} from "./components/subpop-diff-heatmap.js";
import {subpopRosePlot} from "./components/subpop-rose-plot.js";
import {subpopArchForm} from "./components/subpop-arch-form.js";
import * as d3 from "d3";
```

```js
const toothStats   = await FileAttachment("data/tooth_stats.json").json();
const subpopStats  = await FileAttachment("data/tooth_stats_subpop.json").json();
const kdeOrigen    = await FileAttachment("data/kde_grids_origen.json").json();
const metadata     = await FileAttachment("data/metadata.json").json();
```

```js
const AXIS = "origin";
const groupNames = ["Centro A", "Centro B"];
const colorMap = {"Centro A": "#4e79a7", "Centro B": "#e15759"};
const labelMap = {"Centro A": "Centro A", "Centro B": "Centro B"};

const axisData = subpopStats.filter(d => d.axis === AXIS);
```

```js
const selectedFdi = Mutable([11]);
function toggleTooth(fdi) {
  const cur = selectedFdi.value;
  selectedFdi.value = cur.includes(fdi) ? cur.filter(f => f !== fdi) : [...cur, fdi];
}
function setSelection(fs) { selectedFdi.value = fs; }
```

## Mapa KDE comparativo

Mismo formato que la página poblacional pero con dos capas de contornos:
**${labelMap["Centro A"]}** (azul) y **${labelMap["Centro B"]}** (rojo). El gris de fondo
son los centroides de la eigendentadura completa (contexto).

<details open>
<summary style="cursor: pointer; font-size: 13px; color: #444; font-weight: 600;">Odontograma</summary>

Hacé clic en los dientes para seleccionar/deseleccionar.

```js
display(teethSelector({
  selected: selectedFdi,
  onToggle: toggleTooth,
  onSetSelection: setSelection,
  fdiNombres: metadata.fdi_nombres,
}));
```

</details>

```js
const modeInput = Inputs.radio(["overlay", "split"], {
  value: "overlay",
  label: "Disposición",
  format: m => m === "overlay" ? "Superpuesto" : "Lado a lado",
});
const mode = Generators.input(modeInput);

const ellipsesInput = Inputs.toggle({label: "Mostrar elipses 1σ analíticas", value: false});
const showEllipses = Generators.input(ellipsesInput);

const showPopInput = Inputs.toggle({label: "Centroides población completa", value: true});
const showPop = Generators.input(showPopInput);
const showG0Input = Inputs.toggle({label: `Centroides ${labelMap["Centro A"]}`, value: true});
const showG0 = Generators.input(showG0Input);
const showG1Input = Inputs.toggle({label: `Centroides ${labelMap["Centro B"]}`, value: true});
const showG1 = Generators.input(showG1Input);

const bottomOpacityInput = Inputs.range([0.05, 1], {value: 0.6, step: 0.05, label: "Opacidad capa inferior"});
const bottomOpacity = Generators.input(bottomOpacityInput);
const topOpacityInput = Inputs.range([0.05, 1], {value: 0.4, step: 0.05, label: "Opacidad capa superior"});
const topOpacity = Generators.input(topOpacityInput);
```

```js
display(html`<div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; padding:6px 0 12px;">
  ${modeInput}${ellipsesInput}${bottomOpacityInput}${topOpacityInput}
  <span style="display:flex; gap:12px; align-items:center; padding-left:8px; border-left:1px solid #ddd;">
    ${showPopInput}${showG0Input}${showG1Input}
  </span>
</div>`);
```

```js
const plot = subpopKdePlot({
  selectedFdi,
  kdeData: kdeOrigen,
  toothStats,
  subpopStats: axisData,
  mode,
  colorMap,
  labelMap,
  showEllipses,
  width: Math.min(width, 980),
  height: 560,
});
display(plot);
```

```js
// Aplicar opacidades vía CSS sin redibujar (preserva zoom).
plot.style.setProperty("--layer-0-opacity", bottomOpacity);
plot.style.setProperty("--layer-1-opacity", topOpacity);
plot.style.setProperty("--show-centroids-pop", showPop ? "inline" : "none");
plot.style.setProperty("--show-centroids-0",   showG0  ? "inline" : "none");
plot.style.setProperty("--show-centroids-1",   showG1  ? "inline" : "none");
```

```js
display(html`<div style="display:flex; gap:20px; align-items:center; margin: 4px 0 12px 0;">
  ${groupNames.map(g => html`<span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="${colorMap[g]}" opacity="0.5" stroke="${colorMap[g]}" stroke-width="1"/></svg>
    <span style="font-size:13px;">${labelMap[g]} (n=${kdeOrigen.groups[g].n_pantos})</span>
  </span>`)}
  <span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><circle cx="7" cy="7" r="4" fill="#bbb" stroke="#888" stroke-width="0.5"/></svg>
    <span style="font-size:13px;">Eigendentadura (contexto)</span>
  </span>
  <span style="font-size:12px; color:#999;">Densidad normalizada por diente · contornos cada 0.05</span>
</div>`);
```

## Estadísticas de los dientes seleccionados

```js
const selSet = new Set(selectedFdi);
const selRows = [];
for (const fdi of selectedFdi) {
  for (const g of groupNames) {
    const d = axisData.find(r => r.fdi === fdi && r.group === g);
    if (!d) continue;
    selRows.push({
      fdi: d.fdi, grupo: labelMap[g], n: d.n,
      cx_mean: d.cx_mean, cy_mean: d.cy_mean,
      cx_std: d.cx_std, cy_std: d.cy_std,
      angle_mean: d.angle_mean, angle_std: d.angle_std,
    });
  }
}
```

```js
if (selRows.length === 0) {
  display(html`<p style="color:#999; font-size:13px;">Seleccioná un diente para ver estadísticas.</p>`);
} else {
  display(Inputs.table(selRows, {
    columns: ["fdi", "grupo", "n", "cx_mean", "cy_mean", "cx_std", "cy_std", "angle_mean", "angle_std"],
    header: {fdi: "FDI", grupo: "Grupo", n: "N", cx_mean: "μ X", cy_mean: "μ Y",
             cx_std: "σ X", cy_std: "σ Y", angle_mean: "μ ángulo", angle_std: "σ ángulo"},
    format: {
      cx_mean: d3.format(".4f"), cy_mean: d3.format(".4f"),
      cx_std:  d3.format(".4f"), cy_std:  d3.format(".4f"),
      angle_mean: d3.format(".1f"), angle_std: d3.format(".1f"),
    },
  }));
}
```

## Diferencia por diente (heatmap)

Magnitud de la diferencia entre **${labelMap["Centro A"]}** y **${labelMap["Centro B"]}** para cada
diente y feature, expresada en **desviaciones estándar pooled**. Azul oscuro indica que
${labelMap["Centro B"]} tiene valores mayores; rojo oscuro que ${labelMap["Centro A"]} los tiene mayores.

```js
display(subpopDiffHeatmap({axisData, groupNames, labelMap, width}));
```

## Distribución angular comparativa

Para cada diente, la **flecha** apunta a la desviación del ángulo medio del grupo
respecto al ángulo medio poblacional (12h = sin diferencia). El **sector relleno**
representa ±1&sigma; del grupo. Eje angular amplificado (±30° reales → ±150° visuales).

```js
display(subpopRosePlot({
  toothStats,
  subpopStats: axisData,
  groupNames,
  colorMap,
  labelMap,
  selectedFdi,
  width: Math.min(width, 980),
  height: 580,
}));
```

## Forma de arcada comparativa

Dos arcadas (maxilar y mandibular) por subpoblación, construidas con el centroide
medio del grupo en cada pieza. Punteado gris = arcada de la población completa para
referencia. Las letras entre paréntesis indican la clasificación maxilar/mandibular
(O=Ovalada, T=Triangular, C=Cuadrada).

```js
const arch = subpopArchForm({
  subpopStats: axisData,
  groupNames,
  colorMap,
  labelMap,
  toothStats,
  showPopulation: true,
  width: Math.min(width, 900),
  height: 520,
});
display(arch.node);
```

```js
const archRows = [];
for (const g of groupNames) {
  const m = arch.metrics[g] || {};
  for (const arc of ["maxilar", "mandibular"]) {
    const r = m[arc];
    if (!r) continue;
    archRows.push({
      grupo: labelMap[g] || g,
      arcada: arc,
      intercanino: r.intercanine,
      intermolar: r.intermolar,
      profundidad: r.depth,
      ratio: r.ratio,
      tipo: r.shape,
    });
  }
}
display(Inputs.table(archRows, {
  columns: ["grupo", "arcada", "intercanino", "intermolar", "profundidad", "ratio", "tipo"],
  header: {grupo: "Grupo", arcada: "Arcada", intercanino: "Intercanino", intermolar: "Intermolar",
           profundidad: "Profundidad", ratio: "Ratio", tipo: "Tipo"},
  format: {
    intercanino: d3.format(".4f"), intermolar: d3.format(".4f"),
    profundidad: d3.format(".4f"), ratio: d3.format(".3f"),
  },
}));
```
