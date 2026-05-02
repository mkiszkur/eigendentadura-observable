---
title: Subpoblación — Sexo biológico
---


# Subpoblación — Sexo biológico

Comparación de la dentadura media entre **Male** y **Female** (sexo biológico
inferido por OCR sobre el nombre del paciente, cuando es visible en la imagen).
La comparación responde si existe **dimorfismo sexual** detectable en la
posición/orientación de las piezas dentales sobre la pantomografía.

<details>
<summary><strong>Universo de datos</strong> <em>(clic para expandir)</em></summary>

```js
const totalPantos = kdeGenero.groups.male.n_pantos + kdeGenero.groups.female.n_pantos;
display(html`
<p>Sexo biológico inferido a partir del nombre del paciente extraído por OCR
sobre la imagen radiográfica. Disponible solo en <strong>${totalPantos}</strong>
pantomografías (~${(100 * totalPantos / metadata.unique_pantos).toFixed(0)} %
del total con landmarks).</p>
<ul>
  <li><strong>Male</strong>: ${kdeGenero.groups.male.n_pantos} pantomografías</li>
  <li><strong>Female</strong>: ${kdeGenero.groups.female.n_pantos} pantomografías</li>
</ul>
<p style="color:#a06; font-size:12px;"><strong>⚠ Tamaño muestral chico:</strong>
con ~${kdeGenero.groups.male.n_pantos} pantos por grupo, los KDE de molares
posteriores (n por pieza < 80) pueden ser ruidosos. Interpretar diferencias
con precaución.</p>
<p>Coordenadas normalizadas por marco condíleo
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
import {subpopViolinPlot} from "./components/subpop-violin-plot.js";
import * as d3 from "d3";
```

```js
const toothStats        = await FileAttachment("data/tooth_stats.json").json();
const subpopStats       = await FileAttachment("data/tooth_stats_subpop.json").json();
const kdeGenero         = await FileAttachment("data/kde_grids_genero.json").json();
const kdeDiffGenero     = await FileAttachment("data/kde_diff_genero.json").json();
const bagplotGenero     = await FileAttachment("data/bagplot_outliers_genero.json").json();
const violinGenero      = await FileAttachment("data/violin_grids_genero.json").json();
const metadata          = await FileAttachment("data/metadata.json").json();
```

```js
const AXIS = "sex";
const groupNames = ["male", "female"];
const colorMap = {male: "#4e79a7", female: "#e15759"};
const labelMap = {male: "Male", female: "Female"};

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
**${labelMap.male}** (azul) y **${labelMap.female}** (rojo). El gris de fondo
son los centroides de la eigendentadura completa (contexto).

<details open>
<summary>Cómo leer este gráfico</summary>

El gráfico muestra la **distribución de posición** de cada pieza dental en la pantomografía, separada por grupo (azul vs rojo). Cada contorno o elipse representa dónde se ubican los dientes de los pacientes de ese grupo.

**Disposición**
- *Superpuesto*: ambos grupos en el mismo diagrama — permite ver si las distribuciones se solapan o están separadas.
- *Lado a lado*: cada grupo en su propio diagrama — facilita comparar la forma de cada distribución.

**Visualización**
- *KDE (contornos)*: líneas de concentración, como las curvas de nivel de un mapa topográfico. Las zonas con líneas más juntas indican donde se ubica la mayoría de los pacientes.
- *HDR (25 %, 50 %, 95 %)*: tres niveles de concentración. La región interior más oscura contiene el **25 %** de los casos más centrales (el núcleo típico), la región intermedia el **50 %**, y la línea exterior delimita el **95 %** de los casos. Es la visualización más directa para comparar grupos.
- *Solo elipses σ*: una elipse que resume la dispersión posicional. La elipse interior (rellena) contiene los casos más centrales; la exterior (punteada), casi todos los casos.
- *KDE + elipses*: contornos KDE combinados con elipses.
- *Diferencia A−B*: mapa de color que muestra dónde difieren las distribuciones de posición entre los dos grupos. **Rojo** indica que el primer grupo tiene mayor densidad en esa zona; **azul**, que la tiene el segundo. Blanco = sin diferencia aparente. Cuanto más saturado el color, más pronunciada la diferencia. Los puntos grises (eigendentadura) y los centroides de cada grupo siguen visibles como contexto.
- *Bagplot*: análogo bivariado del boxplot. La elipse interior (**bag**, ~50 % de los casos) equivale a la caja; la exterior (**loop**, fence = 3 × bag) al bigote. Los **×** son outliers — puntos fuera del loop. El círculo relleno es la mediana (centroide).

**Niveles de contorno** *(visible cuando Visualización = KDE o KDE + elipses)*
- *Equiespaciados*: muchas líneas a igual distancia de densidad — muestra la forma completa de la distribución.
- *1σ, 2σ*: dos líneas que delimitan aproximadamente el **39 %** y el **86 %** de los casos.
- *1σ, 2σ, 3σ*: tres líneas (39 %, 86 %, 99 % de los casos).

*Si los contornos de un grupo están completamente separados de los del otro, hay una diferencia sistemática de posición entre los grupos.*

<details>
<summary style="cursor: pointer; font-size: 12px; color: #888;">Nota técnica</summary>

- **KDE**: densidad kernel gaussiana bivariada, ancho de banda por regla de Silverman, calculada sobre coordenadas normalizadas por marco condíleo.
- **Elipses de covarianza**: elipses 1σ/2σ construidas sobre la matriz de covarianza empírica. Asumen distribución gaussiana bivariada.
- **Niveles σ**: umbrales HDR equivalentes a las regiones σ de una gaussiana 2D: 1σ ↔ 39.3 %, 2σ ↔ 86.5 %, 3σ ↔ 98.9 % (cuantiles de χ²(2)).
- **HDR (25 %, 50 %, 95 %)**: umbrales de densidad calculados como el mínimo valor de densidad tal que la región suprayacente contiene exactamente ese porcentaje de la masa total del KDE. No asume gaussianidad.
- **Mapa de diferencia A−B**: diferencia de densidades normalizada (KDE_A/Σ_A − KDE_B/Σ_B) evaluada en grilla compartida por pieza (media ± 4σ del pool de ambos grupos). La normalización por suma permite comparar grupos de distinto tamaño muestral. Precalculado en pipeline stage 13. Paleta RdBu: rojo = grupo A domina, azul = grupo B domina.
- **Bagplot**: aproximación gaussiana (distancia de Mahalanobis equivalente al halfspace depth para distribuciones simétricas). Bag = cuantil χ²(2) al 50 % → r ≈ 1.18 unidades Mahalanobis. Fence = 3 × bag → r ≈ 3.53. Outliers pre-calculados en stage 13.
- **Limitación**: el test KS sobre distancias de Mahalanobis² (notebook 080) muestra que la mayoría de las distribuciones por pieza NO son gaussianas estrictamente (p < 0.01). Los niveles σ son una aproximación; las elipses describen la dispersión pero no definen regiones de probabilidad exactas.

</details>
</details>

<details open>
<summary>Odontograma</summary>

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
const modeInput = Inputs.select(["overlay", "split"], {
  value: "overlay",
  label: "Disposición",
  format: m => m === "overlay" ? "Superpuesto" : "Lado a lado",
});
const mode = Generators.input(modeInput);

const displayModeInput = Inputs.select(["kde_std", "kde", "elipses", "hdr", "diff", "bagplot"], {
  value: "kde_std",
  label: "Visualización",
  format: m => ({"kde_std": "KDE estándar", kde: "KDE (contornos)", elipses: "Solo elipses σ",
                 hdr: "Regiones HDR (25/50/95%)", diff: "Diferencia A−B", bagplot: "Bagplot"})[m],
});
const displayMode = Generators.input(displayModeInput);

const showPopInput = Inputs.toggle({label: "Población completa", value: true});
const showPop = Generators.input(showPopInput);
const showG0Input = Inputs.toggle({label: labelMap[groupNames[0]], value: true});
const showG0 = Generators.input(showG0Input);
const showG1Input = Inputs.toggle({label: labelMap[groupNames[1]], value: true});
const showG1 = Generators.input(showG1Input);

const bottomOpacityInput = Inputs.range([0.05, 1], {value: 0.6, step: 0.05, label: `Opacidad ${labelMap[groupNames[0]]}`});
bottomOpacityInput.querySelector("input[type=range]").style.display = "none";
const bottomOpacity = Generators.input(bottomOpacityInput);
const topOpacityInput = Inputs.range([0.05, 1], {value: 0.4, step: 0.05, label: `Opacidad ${labelMap[groupNames[1]]}`});
topOpacityInput.querySelector("input[type=range]").style.display = "none";
const topOpacity = Generators.input(topOpacityInput);

const contoursLevelInput = Inputs.select(["equi", "sigma12", "sigma123"], {
  value: "equi",
  label: "Niveles KDE",
  format: m => ({equi: "Equiespaciados", sigma12: "1σ, 2σ", sigma123: "1σ, 2σ, 3σ"})[m],
});
const contoursLevel = Generators.input(contoursLevelInput);
```

<details>
<summary>Opciones de visualización</summary>

```js
display(html`<div style="display:flex; gap:20px; align-items:flex-end; flex-wrap:wrap; padding:8px 0 8px;">
  ${modeInput}${displayModeInput}${displayMode === "kde" ? contoursLevelInput : ""}${displayMode !== "diff" && displayMode !== "bagplot" ? bottomOpacityInput : ""}${displayMode !== "diff" && displayMode !== "bagplot" ? topOpacityInput : ""}
</div>`);
```

</details>

<details>
<summary>Centroides</summary>

```js
display(html`<div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; padding:8px 0 8px;">
  ${showPopInput}${showG0Input}${showG1Input}
</div>`);
```

</details>

```js
const plot = subpopKdePlot({
  selectedFdi,
  kdeData: kdeGenero,
  toothStats,
  subpopStats: axisData,
  diffData: kdeDiffGenero,
  bagplotData: bagplotGenero,
  mode,
  colorMap,
  labelMap,
  displayMode,
  contoursMode: contoursLevel,
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
display(html`<div style="display:flex; gap:20px; align-items:center; margin: 4px 0 12px 0; flex-wrap:wrap;">
  ${displayMode !== "diff" ? groupNames.map(g => html`<span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="${colorMap[g]}" opacity="0.5" stroke="${colorMap[g]}" stroke-width="1"/></svg>
    <span style="font-size:13px;">${labelMap[g]} (n=${kdeGenero.groups[g].n_pantos})</span>
  </span>`) : ""}
  ${displayMode === "diff" ? html`<span style="display:flex; align-items:center; gap:8px;">
    <span style="font-size:12px; color:#555;">${labelMap[groupNames[0]]} domina</span>
    <svg width="90" height="14"><defs><linearGradient id="diffgrad-g" x1="0" x2="1"><stop offset="0%" stop-color="#b2182b"/><stop offset="50%" stop-color="#f7f7f7"/><stop offset="100%" stop-color="#2166ac"/></linearGradient></defs><rect x="0" y="1" width="90" height="12" fill="url(#diffgrad-g)" rx="2" stroke="#ccc" stroke-width="0.5"/></svg>
    <span style="font-size:12px; color:#555;">${labelMap[groupNames[1]]} domina</span>
  </span>` : ""}
  <span style="display:flex; align-items:center; gap:6px;">
    <svg width="14" height="14"><circle cx="7" cy="7" r="4" fill="#bbb" stroke="#888" stroke-width="0.5"/></svg>
    <span style="font-size:13px;">Eigendentadura (contexto)</span>
  </span>
  ${displayMode !== "diff" ? html`<span style="font-size:12px; color:#999;">Densidad normalizada por diente · contornos cada 0.05</span>` : ""}
</div>`);
```

## Estadísticas de los dientes seleccionados

<details>
<summary>Cómo leer esta tabla</summary>

Resumen numérico por diente (FDI) y grupo para los dientes seleccionados en el odontograma.

- **N**: cantidad de dientes en el dataset para ese FDI y grupo. No requiere dentadura completa.
- **μ X / μ Y**: posición media del centroide en coordenadas normalizadas por marco condíleo (origen = punto medio intercondíleo, escala = distancia intercondílea).
- **σ X / σ Y**: dispersión de la posición — cuán variable es la ubicación del diente entre pacientes del grupo.
- **μ ángulo / σ ángulo**: orientación media del diente (°) y su variabilidad dentro del grupo.

Un σ mayor indica que los pacientes del grupo son más heterogéneos en esa coordenada.

</details>

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

Magnitud de la diferencia entre **${labelMap.male}** y **${labelMap.female}** para cada
diente y feature, expresada en **desviaciones estándar pooled**. Azul oscuro indica que
${labelMap.female} tiene valores mayores; rojo oscuro que ${labelMap.male} los tiene mayores.

<details>
<summary>Cómo leer este gráfico</summary>

Cada celda muestra la diferencia entre grupos para ese diente y esa variable, expresada en **desviaciones estándar pooled** (effect size equivalente a Cohen's *d*).

- **Color rojo**: ${labelMap.male} tiene valores mayores en esa variable para ese diente.
- **Color azul**: ${labelMap.female} tiene valores mayores.
- **Blanco / color pálido**: diferencia pequeña o nula.

Guía de magnitud: |d| < 0.2 trivial · 0.2–0.5 pequeño · 0.5–0.8 moderado · > 0.8 grande.

Las variables son: posición media en X e Y (μX, μY), dispersión en X e Y (σX, σY) y ángulo medio.

</details>

```js
display(subpopDiffHeatmap({axisData, groupNames, labelMap, width}));
```

## Distribuciones marginales

Distribuciones de posición en X (eje mesio-distal) e Y (eje supero-inferior) para cada diente seleccionado.

<details>
<summary>Cómo leer este gráfico</summary>

Dos violines simétricos por celda, uno por grupo, para cada diente seleccionado.

- **Eje Y**: valores de posición en coordenadas normalizadas por marco condíleo. Es el único eje con escala numérica — úsalo para leer posiciones absolutas.
- **Caja (IQR)**: rectángulo Q1–Q3. Contiene el **50 % central** de los casos. Es el elemento principal para comparar grupos: si las cajas están a distinta altura, hay una diferencia de posición mediana.
- **Línea horizontal en la caja**: mediana del grupo.
- **Bigotes**: extensión hasta 1.5 × IQR desde la caja (rango típico esperado).
- **Silueta de fondo**: forma del KDE — muestra si la distribución es unimodal, asimétrica o bimodal. El ancho del contorno no tiene escala propia; sirve solo para ver la forma, no para medir.
- **N en la etiqueta**: total de dientes del grupo para ese FDI.
- **Columna izquierda**: distribución en X (eje mesio-distal). **Columna derecha**: distribución en Y (eje supero-inferior).

*Compará la altura de las cajas entre grupos para detectar diferencias de posición; compará el tamaño de las cajas para ver diferencias de dispersión.*

</details>

```js
display(subpopViolinPlot({
  selectedFdi,
  violinData: violinGenero,
  colorMap,
  labelMap,
  width: Math.min(width, 980),
}));
```

## Distribución angular comparativa

Para cada diente, la **flecha** apunta a la desviación del ángulo medio del grupo
respecto al ángulo medio poblacional (12h = sin diferencia). El **sector relleno**
representa ±1&sigma; del grupo. Eje angular amplificado (±30° reales → ±150° visuales).

<details>
<summary>Cómo leer este gráfico</summary>

Gráfico polar por diente seleccionado. Cada sector compara la orientación del grupo con la media poblacional.

- **Flecha**: apunta al ángulo medio del grupo, medido como desviación respecto a la población completa.
- **Sector relleno**: rango ±1σ del grupo.
- **12h (arriba)** = sin diferencia angular respecto a la población.
- El eje angular está **amplificado × 5** para legibilidad: ±30° reales se muestran como ±150° visuales.
- Una flecha hacia las 3h indica que el grupo tiene sus dientes más inclinados hacia la derecha que la media poblacional.

*Un sector amplio indica alta variabilidad de orientación. Flechas opuestas entre grupos indican diferencias sistemáticas de inclinación.*

</details>

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

<details>
<summary>Cómo leer este gráfico</summary>

Curvas continuas trazadas por interpolación de los centroides medios de cada grupo en cada pieza.

- **Arcada superior** (maxilar) y **arcada inferior** (mandibular) por separado.
- **Punteado gris**: arcada de la población completa, como referencia.
- **Letras entre paréntesis en la leyenda**: clasificación de forma de cada grupo — formato (Maxilar/Mandibular). O = Ovalada, T = Triangular, C = Cuadrada (según el ratio profundidad/anchura intermolar).
- **Tabla de métricas**: distancia intercanina (3–3), distancia intermolar (6–6), profundidad de arcada y ratio.

*Una curva más ancha o más estrecha que la referencia gris indica que ese grupo tiene una arcada sistemáticamente diferente en ese plano.*

</details>

```js
const archArcsInput = Inputs.checkbox(["Maxilar", "Mandibular"], {
  value: ["Maxilar", "Mandibular"],
  label: "Arcadas",
});
const archArcs = Generators.input(archArcsInput);
const archGroupsInput = Inputs.checkbox(
  groupNames.map(g => labelMap[g] || g),
  {value: groupNames.map(g => labelMap[g] || g), label: "Grupos"}
);
const archGroupsSel = Generators.input(archGroupsInput);
const showPopArchInput = Inputs.toggle({label: "Población completa", value: true});
const showPopArch = Generators.input(showPopArchInput);
const showArchLabelsInput = Inputs.toggle({label: "Etiquetas de métricas", value: true});
const showArchLabels = Generators.input(showArchLabelsInput);
const showMeasurePtsInput = Inputs.toggle({label: "Puntos de medición", value: false});
const showMeasurePts = Generators.input(showMeasurePtsInput);
```

<details>
<summary>Opciones de visualización</summary>

```js
display(html`<div style="display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; padding:8px 0 8px;">
  ${archArcsInput}${archGroupsInput}${showPopArchInput}${showArchLabelsInput}${showMeasurePtsInput}
</div>`);
```

</details>

```js
const arch = subpopArchForm({
  subpopStats: axisData,
  groupNames,
  colorMap,
  labelMap,
  toothStats,
  showPopulation: showPopArch,
  visibleGroups: groupNames.filter(g => archGroupsSel.includes(labelMap[g] || g)),
  showUpper: archArcs.includes("Maxilar"),
  showLower: archArcs.includes("Mandibular"),
  showLabels: showArchLabels,
  showMeasurePoints: showMeasurePts,
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
