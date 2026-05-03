---
title: Morfometría clínica
---

# Morfometría clínica

Métricas clínicas derivadas de la geometría dental de **${metadata.unique_pantos.toLocaleString("es-AR")} pantomografías** con landmarks condíleos: **forma de arcada**, **overbite / overjet**, **índice de Bolton** y **simetría bilateral**.

```js
import {teethSelector, ALL_FDI} from "./components/teeth-selector.js";
import {archForm, computeArchMetrics} from "./components/arch-form.js";
import {occlusionHistograms, occlusionScatter} from "./components/occlusion.js";
import {boltonHistograms} from "./components/bolton.js";
import {symmetryOverlay, symmetryBoxplot, mirrorFdi} from "./components/symmetry-plot.js";
import {quadrantOverlay} from "./components/quadrant-overlay.js";
import * as d3 from "d3";
```

```js
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
const symmetryData = await FileAttachment("data/symmetry_pairs.json").json();
const occlusionData = await FileAttachment("data/occlusion.json").json();
const boltonData = await FileAttachment("data/bolton.json").json();
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

<details>
<summary style="cursor: pointer; font-size: 13px; color: #666;">Filtro de dientes (resaltado en gráficos)</summary>

```js
display(teethSelector({selected: selectedFdi, onToggle: toggleTooth, onSetSelection: setSelection, fdiNombres: {}}));
```

</details>


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
- **Diagrama de dispersión** — cada punto es una dentadura. La cruz negra marca la mediana poblacional; puntos alejados tienen oclusiones atípicas.

Por basarse en centroides 2D, estos valores son útiles para comparar dentaduras *dentro del dataset*, pero no equivalen a las medidas clínicas estándar.

</details>

```js
display(occlusionHistograms({occlusionData, width: Math.min(width, 1000)}));
```

## Diagrama poblacional (overjet vs overbite)

Cada punto es una dentadura. La cruz negra marca la mediana poblacional; dentaduras alejadas del centro tienen oclusiones atípicas.

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X** — overjet: separación horizontal entre centroides de incisivos superiores e inferiores. Valores más altos = mayor resalte anterior.
- **Eje Y** — overbite: separación vertical entre centroides de incisivos superiores e inferiores. Valores positivos = superiores por encima de inferiores.
- **Cruz negra** — mediana de ambas métricas en la población.
- **Líneas punteadas** — medianas en cada eje por separado; dividen el espacio en 4 cuadrantes de oclusión.
- Ambos ejes están en unidades landmark-normalized (escala intercondílea = 1.0), no en milímetros clínicos.

</details>

```js
display(occlusionScatter({
  occlusionData,
  width: Math.min(width, 720),
  height: 460,
}));
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

<details>
<summary>Cómo leer este gráfico</summary>

Para cada par homólogo (ej. 16↔26) se analizan solo las dentaduras que tienen ambos dientes presentes, midiendo la asimetría **por dentadura** (análisis pareado).

- **Boxplots** — la caja muestra el IQR (Q1–Q3) de la distancia de asimetría por dentadura; los bigotes llegan a P5–P95. El `n` sobre la caja es la cantidad de dentaduras con el par completo.
- **Overlay** — los puntos azules son el diente del lado izquierdo en su posición mediana pareada; los naranjas son el homólogo derecho **reflejado** contra el plano sagital. Si ambos coinciden, la población es perfectamente simétrica para ese par.
- **Largo y color de la línea** entre puntos del overlay — magnitud de la asimetría mediana del par.

Los 3 pares con mayor asimetría se etiquetan en el overlay.

</details>

```js
display(symmetryBoxplot({
  symmetryData,
  selectedFdi: selectedFdi,
  width: Math.min(width, 980),
  height: 360,
}));
```

```js
display(html`<p style="color:#555; font-size:13px;">
  Cada caja muestra el IQR (Q1–Q3) y la mediana de la <strong>distancia de
  asimetría por dentadura</strong>. Los bigotes se extienden a los percentiles
  5% y 95%. <code>n</code> arriba de cada caja es la cantidad de dentaduras
  con ambos dientes del par presentes.
</p>`);
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

<div style="border-left: 4px solid #72b7b2; background: #f7fdfd; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La arcada de esta población es predominantemente <strong>cuadrada</strong> (ratio profundidad/ancho intermolar < 0.70 en ambas arcadas) — primer cálculo de este tipo para esta cohorte. Los índices de Bolton medianos se mantienen dentro del rango normativo, con variabilidad individual considerable. La asimetría bilateral es baja a nivel poblacional; los pares anteriores (13↔23) presentan la mayor desviación respecto al plano sagital.
</div>
