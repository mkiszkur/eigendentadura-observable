---
title: Geometría Dental
---


# Geometría Dental

¿Dónde se ubica cada diente en la dentadura media? ¿Cuánto varía de individuo a individuo? Esta sección caracteriza la **eigendentadura** — la dentadura media de la población — y describe la distribución espacial y angular de las **${metadata.unique_pantos.toLocaleString("es-AR")} pantomografías** con landmarks condíleos.

<details>
<summary><strong>Universo de datos</strong> — ${metadata.total_teeth.toLocaleString()} dientes de ${metadata.unique_pantos.toLocaleString()} pantomografías <em>(clic para expandir)</em></summary>

Se incluyen todos los dientes permanentes (FDI 11–48) que cumplen simultáneamente:
1. Tienen el **número FDI anotado** por un revisor humano
2. Tienen **coordenadas landmark-normalized** disponibles (la pantomografía tiene landmarks condíleos completos)

No se restringe a dentaduras completas (32/32): cada diente aporta independientemente a la KDE de su pieza.
Coordenadas normalizadas por marco condíleo (origen = punto medio intercondíleo, escala = distancia intercondílea).

</details>

```js
import {odontograma} from "./components/odontograma.js";
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
import {kdePlot} from "./components/kde-plot.js";
import {boxplot2dPlot} from "./components/boxplot-2d.js";
import {rosePlot} from "./components/rose-plot.js";
import {radarAngularPlot} from "./components/radar-angular.js";
import {angleRose, angleRoseGrid} from "./components/angle-rose.js";
import * as d3 from "d3";
```

```js
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const kdeGrids = await FileAttachment("data/kde_grids.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
const boxplotStats = await FileAttachment("data/tooth_boxplot_stats.json").json();
const angleHistograms = await FileAttachment("data/tooth_angle_histograms.json").json();
```

```js
const selectedFdi = Mutable([...ALL_FDI]);

function toggleTooth(fdi) {
  const current = selectedFdi.value;
  const idx = current.indexOf(fdi);
  if (idx >= 0) {
    selectedFdi.value = current.filter(f => f !== fdi);
  } else {
    selectedFdi.value = [...current, fdi];
  }
}
function setSelection(fdis) { selectedFdi.value = fdis; }
```


## La eigendentadura

La **eigendentadura** es la dentadura "promedio" de la población: la posición media de cada pieza dental en coordenadas landmark-normalized. Funciona como el mapa de referencia sobre el que se interpretan todas las variaciones individuales y de subpoblaciones estudiadas en este dashboard. Cada punto es el centroide de los casos disponibles para esa pieza (entre ${d3.min(toothStats, d => d.n).toLocaleString("es-AR")} y ${d3.max(toothStats, d => d.n).toLocaleString("es-AR")} pantomografías según la pieza).

```js
{
  const QC = {1: "#4e79a7", 2: "#59a14f", 3: "#edc949", 4: "#e15759"};
  const byFdi = Object.fromEntries(toothStats.map(t => [t.fdi, t]));
  const upperLine = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
    .filter(f => byFdi[f]).map(f => byFdi[f]);
  const lowerLine = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]
    .filter(f => byFdi[f]).map(f => byFdi[f]);

  display(Plot.plot({
    width: Math.min(width, 680),
    height: 260,
    marginTop: 24,
    marginBottom: 20,
    marginLeft: 10,
    marginRight: 10,
    x: {label: null, ticks: 0},
    y: {reverse: true, label: null, ticks: 0},
    marks: [
      Plot.line(upperLine, {x: "mean_x", y: "mean_y", stroke: "#ddd", strokeWidth: 2}),
      Plot.line(lowerLine, {x: "mean_x", y: "mean_y", stroke: "#ddd", strokeWidth: 2}),
      Plot.link(toothStats, {
        x1: d => d.mean_x - d.std_x, y1: "mean_y",
        x2: d => d.mean_x + d.std_x, y2: "mean_y",
        stroke: d => QC[d.quadrant], strokeWidth: 5, strokeOpacity: 0.18,
      }),
      Plot.dot(toothStats, {
        x: "mean_x", y: "mean_y",
        fill: d => QC[d.quadrant], r: 5, stroke: "white", strokeWidth: 1,
      }),
      Plot.text(toothStats, {
        x: "mean_x", y: "mean_y",
        text: d => String(d.fdi), fontSize: 8, dy: -10,
        fill: d => QC[d.quadrant], fontWeight: "600",
      }),
    ]
  }));
}
```

<small>Unidades intercondíleas (distancia cóndilo–cóndilo = 1.0). Colores por cuadrante FDI: <span style="color:#4e79a7">■</span> Q1 · <span style="color:#59a14f">■</span> Q2 · <span style="color:#edc949">■</span> Q3 · <span style="color:#e15759">■</span> Q4. Barras tenues = dispersión ±1σ en X.</small>

---

**Selección de piezas** — el odontograma controla todos los gráficos de esta página. Por defecto se muestran las 32 piezas permanentes; hacé clic para incluir o excluir dientes.

```js
display(teethSelector({
  selected: selectedFdi,
  onToggle: toggleTooth,
  onSetSelection: setSelection,
  fdiNombres: metadata.fdi_nombres,
}));
```

---

## Mapa de densidad (KDE)

Un **KDE 2D** (_Kernel Density Estimation_) estima la densidad de probabilidad de la posición de cada diente a partir de las coordenadas de todas las pantomografías: las zonas de mayor densidad indican dónde se concentra la mayoría de los centroides dentales de la población. Seleccioná una o más piezas en el odontograma para ver su distribución espacial.

<details>
<summary>Cómo leer este gráfico</summary>

- **Contornos KDE** — isodensidades: cada capa corresponde a un nivel de densidad de probabilidad. Las zonas más oscuras/saturadas concentran más centroides dentales.
- **Elipses ±1σ / ±2σ** — contorno gaussiano equivalente: la elipse sólida abarca ~68 % de los casos y la punteada ~95 %.
- **Puntos grises** — eigendentadura: posición media de cada diente en la población.
- **Modo de visualización** — KDE equidistante (capas uniformes de densidad), Regiones HDR al 25/50/95 %, Solo elipses (±1σ/±2σ), o KDE + elipses combinado.
- **Contornos** — en modo KDE: equidistantes (muchas capas), 1σ·2σ (2 isolíneas estadísticas), o 1σ·2σ·3σ.
- **Densidad mínima** — recorta el "halo" tenue alrededor del núcleo; aplica solo al modo equidistante.
- **γ (gamma)** — contraste: γ > 1 resalta los picos de densidad; aplica solo al modo equidistante.

Scroll para zoom, drag para mover, doble-clic para resetear.

</details>

```js
const minThresholdInput = Inputs.number({value: 0.05, step: 0.01, min: 0, max: 0.99, label: "Densidad mínima visible"});
const minThreshold = Generators.input(minThresholdInput);
const gammaInput = Inputs.range([0.3, 3], {value: 1, step: 0.1, label: "γ (contraste capas)"});
const gamma = Generators.input(gammaInput);
const displayModeInput = Inputs.select(
  ["kde_std", "kde", "elipses", "hdr"],
  {label: "Modo", value: "kde_std",
   format: d => ({"kde_std": "KDE estándar", kde: "KDE (contornos)", elipses: "Solo elipses σ", hdr: "Regiones HDR (25/50/95%)"})[d]}
);
const displayMode = Generators.input(displayModeInput);
const contoursModeInput = Inputs.select(
  ["equi", "sigma12", "sigma123"],
  {label: "Niveles KDE", value: "equi",
   format: d => ({equi: "Equidistantes", sigma12: "1σ · 2σ", sigma123: "1σ · 2σ · 3σ"})[d]}
);
const contoursMode = Generators.input(contoursModeInput);
const showCentroidsInput = Inputs.toggle({label: "Centroides", value: true});
const showCentroids = Generators.input(showCentroidsInput);
```

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
display(html`<div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap; padding:6px 0 4px;">
  ${displayModeInput}${displayMode === "kde" ? contoursModeInput : ""}${showCentroidsInput}
</div>
${displayMode === "kde_std" ? html`<div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap; padding:2px 0 6px;">
  ${minThresholdInput}${gammaInput}
</div>` : ""}`);
```

</details>

```js
const plot = kdePlot({
  selectedFdi: selectedFdi,
  kdeGrids: kdeGrids,
  toothStats: toothStats,
  width: 800,
  height: 550,
  gamma: gamma,
  minThreshold: minThreshold,
  displayMode: displayMode,
  contoursMode: contoursMode,
  showCentroids: showCentroids,
});
display(plot);
```

## Estadísticas de los dientes seleccionados

Los valores corresponden a las **coordenadas landmark-normalized** originales
(no z-scores): X e Y están en el rango aproximado [-1, 1] respecto al centro
del marco dentario, y el ángulo está en radianes.

<details>
<summary>Cómo leer esta tabla</summary>

Cada fila corresponde a un diente seleccionado en el odontograma.

- **μ X / μ Y** — posición media del centroide en coordenadas landmark-normalized (divididas por la distancia intercondílea). El origen es el punto medio intercondíleo.
- **σ X / σ Y** — desvío estándar de las posiciones individuales: mide cuánto varía la ubicación de ese diente entre pacientes.
- **μ ángulo** — ángulo medio del eje principal del diente en grados (0° = horizontal, 90° = vertical).
- **σ ángulo** — dispersión angular entre pacientes.

Valores más grandes de σ indican mayor variabilidad posicional o angular de esa pieza en la población.

</details>

```js
const selectedSet2 = new Set(selectedFdi);
const selectedStats = toothStats.filter(s => selectedSet2.has(s.fdi));
```

```js
if (selectedStats.length > 0) {
  const nMin = d3.min(selectedStats, s => s.n);
  const nMax = d3.max(selectedStats, s => s.n);
  display(html`<p style="color:#555; font-size:13px;">
    Mostrando <strong>${selectedStats.length}</strong> pieza(s).
    Muestras por pieza: entre <strong>${nMin.toLocaleString()}</strong> y <strong>${nMax.toLocaleString()}</strong> dientes.
  </p>`);
}
```

```js
display(Inputs.table(selectedStats, {
  columns: ["fdi", "n", "mean_x", "mean_y", "std_x", "std_y", "mean_angle", "std_angle"],
  header: {
    fdi: "FDI",
    n: "N",
    mean_x: "μ X",
    mean_y: "μ Y",
    std_x: "σ X",
    std_y: "σ Y",
    mean_angle: "μ ángulo",
    std_angle: "σ ángulo",
  },
  format: {
    mean_x: d3.format(".4f"),
    mean_y: d3.format(".4f"),
    std_x: d3.format(".4f"),
    std_y: d3.format(".4f"),
    mean_angle: d3.format(".1f"),
    std_angle: d3.format(".1f"),
  },
}));
```

## Boxplots 2D — Dispersión posicional

Cada rectángulo representa el rango intercuartílico (IQR) de un diente en X e Y.
Los bigotes se extienden a 1.5×IQR. El punto central es la mediana.
Los dientes seleccionados en el odontograma se resaltan.

<details>
<summary>Cómo leer este gráfico</summary>

Cada diente se muestra como una caja 2D en su posición anatómica media.

- **Rectángulo central** — rango intercuartílico (Q1–Q3) en ambas coordenadas X e Y simultáneamente. Un rectángulo grande indica alta variabilidad posicional.
- **Bigotes** — se extienden a 1.5 × IQR en cada dimensión.
- **Punto central** — mediana 2D.
- **Arcos angulares** (opcional) — distribución del ángulo del eje principal del diente; el radio es la frecuencia.

Colores por cuadrante: azul = Q1 (sup. der.), verde = Q2 (sup. izq.), amarillo = Q3 (inf. izq.), rojo = Q4 (inf. der.).

</details>

```js
const showAngleArcsInput = Inputs.toggle({label: "Mostrar dispersión angular", value: false});
const showAngleArcs = Generators.input(showAngleArcsInput);
```

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
display(showAngleArcsInput);
```

</details>

```js
display(boxplot2dPlot({
  boxplotStats,
  selectedFdi: selectedFdi,
  showAngleArcs,
  width: width,
  height: 550,
}));
```

```js
const selectedBoxplotStats = boxplotStats.filter(s => new Set(selectedFdi).has(s.fdi));
```

```js
if (selectedBoxplotStats.length > 0) {
  display(html`<p style="color:#555; font-size:13px;">
    Mostrando <strong>${selectedBoxplotStats.length}</strong> pieza(s).
  </p>`);
}
```

```js
display(Inputs.table(selectedBoxplotStats, {
  columns: ["fdi", "n", "wlo_x", "q1_x", "med_x", "q3_x", "whi_x", "wlo_y", "q1_y", "med_y", "q3_y", "whi_y"],
  header: {
    fdi: "FDI",
    n: "N",
    wlo_x: "Wlo X",
    q1_x: "Q1 X",
    med_x: "Med X",
    q3_x: "Q3 X",
    whi_x: "Whi X",
    wlo_y: "Wlo Y",
    q1_y: "Q1 Y",
    med_y: "Med Y",
    q3_y: "Q3 Y",
    whi_y: "Whi Y",
  },
  format: {
    med_x: d3.format(".4f"),
    q1_x: d3.format(".4f"),
    q3_x: d3.format(".4f"),
    wlo_x: d3.format(".4f"),
    whi_x: d3.format(".4f"),
    med_y: d3.format(".4f"),
    q1_y: d3.format(".4f"),
    q3_y: d3.format(".4f"),
    wlo_y: d3.format(".4f"),
    whi_y: d3.format(".4f"),
  },
}));
```

## Distribución angular por diente

**Mapa global** — Cada diente aparece en su posición anatómica media con una mini-rosa polar: los pétalos son la frecuencia de ángulos en bins de 5°, la línea radial indica la media. Los dientes seleccionados se resaltan. **Hacé click en un diente** para ver su distribución angular ampliada en detalle.

<details>
<summary>Cómo leer este gráfico</summary>

Cada diente aparece en su posición anatómica media con una **mini-rosa polar** superpuesta.

- **Pétalos** — frecuencia de ángulos en bins de 5°. Pétalos más largos = más casos con ese ángulo.
- **Línea radial** — ángulo medio de la pieza en la población.
- **0° / 90°** — horizontal / vertical en el sistema de coordenadas landmark-normalized.

**Hacé clic en cualquier diente** para ver su rosa polar ampliada con el rango ±1σ y la grilla radial en counts.

Los dientes seleccionados en el odontograma aparecen resaltados.

</details>

```js
const rotateToMeanInput = Inputs.toggle({label: "Alinear media al eje vertical", value: true});
const rotateToMean = Generators.input(rotateToMeanInput);
```

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
display(rotateToMeanInput);
```

</details>

```js
// Modal imperativo: lo insertamos/removemos directamente del body.
const showAngleModal = (fdi) => {
  // Cerrar cualquier modal previo
  document.querySelectorAll("[data-angle-modal]").forEach(el => el.remove());
  const record = angleHistograms.find(r => r.fdi === fdi);
  if (!record) return;

  const overlay = document.createElement("div");
  overlay.dataset.angleModal = "1";
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,.45)",
    zIndex: "1000", display: "flex", alignItems: "center", justifyContent: "center",
  });
  const close = () => overlay.remove();

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    background: "white", borderRadius: "8px", padding: "18px 22px",
    boxShadow: "0 8px 28px rgba(0,0,0,.25)", maxWidth: "520px",
    fontFamily: "var(--sans-serif, system-ui, sans-serif)",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"});
  const title = document.createElement("strong");
  title.style.fontSize = "15px";
  title.textContent = `Distribución angular — FDI ${fdi}`;
  const btn = document.createElement("button");
  btn.textContent = "✕ Cerrar";
  Object.assign(btn.style, {border: "none", background: "#eee", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "13px"});
  btn.addEventListener("click", close);
  header.append(title, btn);

  const hint = document.createElement("div");
  Object.assign(hint.style, {color: "#666", fontSize: "11px", marginBottom: "10px"});
  hint.textContent = rotateToMean
    ? "Media rotada al eje vertical. Línea negra = media. Arco externo = ±1 σ."
    : "Inclinación real del diente. 90° = vertical canónico. Línea negra = media.";

  panel.append(header, hint, angleRose({record, size: 380, rotateToMean}));
  overlay.append(panel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.body.append(overlay);
};
```

```js
display(rosePlot({
  angleHistograms,
  toothStats,
  selectedFdi: selectedFdi,
  onToothClick: showAngleModal,
  width: width,
  height: 600,
  rotateToMean,
}));
```

## Radar — Dispersión angular por diente

Los 32 dientes dispuestos en orden anatómico alrededor del centro. El radio de cada punto representa la **dispersión angular** de esa pieza en la población.

<details>
<summary>Cómo leer este gráfico</summary>

Los 32 dientes (o los presentes en la muestra) se disponen en orden anatómico alrededor del centro.

- **Radio** — magnitud de la dispersión angular de cada pieza entre pacientes. Cuanto más alejado del centro, mayor es la variabilidad de orientación de ese diente.
- **Métrica seleccionable** — IQR (rango intercuartílico Q3−Q1), desvío estándar, o rango de bigotes. El IQR es más robusto a valores extremos.

Las piezas con mayor radio son las que presentan mayor variabilidad en su eje de orientación entre distintos individuos de la muestra.

</details>

```js
const radarMetricInput = Inputs.select(
  ["iqr", "std", "whisker_range"],
  {label: "Métrica", format: d => d === "iqr" ? "IQR (Q3−Q1)" : d === "std" ? "Desviación estándar" : "Rango whisker (whi−wlo)", value: "iqr"}
);
const radarMetric = Generators.input(radarMetricInput);
```

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
display(radarMetricInput);
```

</details>

```js
display(radarAngularPlot({
  boxplotStats,
  toothStats,
  selectedFdi: selectedFdi,
  metric: radarMetric,
  width: Math.min(width, 650),
  height: Math.min(width, 650),
}));
```

<div style="border-left: 4px solid #7b52ab; background: #f9f7ff; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La variabilidad posicional y angular de los dientes en esta población es <strong>continua</strong>: no emergen subtipos ni fenotipos geométricos discretos. La eigendentadura describe un centro de gravedad estable, con alta simetría bilateral (distancia mediana entre pares homólogos ≈ 0.02 unidades normalizadas). Las piezas posteriores muestran mayor dispersión posicional que las anteriores. Ver análisis de <a href="./tipicidad">dentaduras típicas y atípicas →</a>
</div>
