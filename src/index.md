---
title: Eigendentadura — KDE Poblacional
---

# Eigendentadura — KDE por pieza dental

Seleccioná uno o más dientes en el odontograma para ver su **Kernel Density Estimation 2D**
(mapa de calor) sobre las coordenadas landmark-normalized.

La eigendentadura (centroides medios de la población) se muestra como contexto.

```js
import {odontograma} from "./components/odontograma.js";
import {kdePlot} from "./components/kde-plot.js";
import * as d3 from "d3";
```

```js
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const kdeGrids = await FileAttachment("data/kde_grids.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
```

```js
// Reactive state: array of selected FDI numbers
const selectedFdi = Mutable([11]);

function toggleTooth(fdi) {
  const current = selectedFdi.value;
  const idx = current.indexOf(fdi);
  if (idx >= 0) {
    selectedFdi.value = current.filter(f => f !== fdi);
  } else {
    selectedFdi.value = [...current, fdi];
  }
}
```

## Odontograma

Hacé clic en los dientes para seleccionar/deseleccionar. Los dientes seleccionados se muestran con color.

```js
const selectedSet = new Set(selectedFdi);
const odonto = odontograma({
  selected: selectedSet,
  fdiNombres: metadata.fdi_nombres,
  onToggle: toggleTooth,
});
display(odonto);
```

## Mapa de densidad (KDE)

```js
const plot = kdePlot({
  selectedFdi: selectedFdi,
  kdeGrids: kdeGrids,
  toothStats: toothStats,
  width: 800,
  height: 550,
});
display(plot);
```

### Estadísticas de los dientes seleccionados

```js
const selectedSet2 = new Set(selectedFdi);
const selectedStats = toothStats.filter(s => selectedSet2.has(s.fdi));
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

---

<div class="note">

**Datos**: ${metadata.total_teeth.toLocaleString()} dientes permanentes de ${metadata.unique_pantos.toLocaleString()} pantomografías.
Coordenadas: landmark-normalized (marco condíleo). Grilla KDE: ${metadata.grid_size}×${metadata.grid_size}.

</div>
