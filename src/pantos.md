---
title: Explorador de Pantomografías
---

# Explorador de Pantomografías

Navegá y filtrá las ${pantos.length.toLocaleString()} pantomografías del dataset.
Seleccioná una fila para ver el detalle con el odontograma de piezas presentes.

```js
import {miniOdontograma} from "./components/mini-odontograma.js";
import * as d3 from "d3";
```

```js
const browserData = await FileAttachment("data/pantos_browser.json").json();
const meta = browserData.metadata;
const allPantos = browserData.pantos;
```

## Filtros

```js
const searchInput = Inputs.text({placeholder: "Buscar por nombre de archivo…", width: "100%"});
const searchTerm = Generators.input(searchInput);
display(searchInput);
```

```js
const catInput = Inputs.select(
  ["Todas", ...meta.categorias],
  {value: "Todas", label: "Categoría"}
);
const catFilter = Generators.input(catInput);

const dentInput = Inputs.select(
  ["Todas", ...meta.denticiones],
  {value: "Todas", label: "Dentición"}
);
const dentFilter = Generators.input(dentInput);

const flagInput = Inputs.select(
  ["Ninguna", ...meta.flag_names],
  {value: "Ninguna", label: "Con patología"}
);
const flagFilter = Generators.input(flagInput);

const fdiInput = Inputs.toggle({label: "Solo FDI completo (32 piezas)", value: false});
const fdiFilter = Generators.input(fdiInput);

const lmInput = Inputs.toggle({label: "Solo con landmarks completos", value: false});
const lmFilter = Generators.input(lmInput);
```

```js
display(html`<div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: end;">
  ${catInput}${dentInput}${flagInput}${fdiInput}${lmInput}
</div>`);
```

```js
// Aplicar filtros
const pantos = allPantos.filter(p => {
  if (searchTerm && !p.archivo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (catFilter !== "Todas" && p.categoria !== catFilter) return false;
  if (dentFilter !== "Todas" && p.denticion !== dentFilter) return false;
  if (flagFilter !== "Ninguna" && !(p.flags && p.flags[flagFilter] > 0)) return false;
  if (fdiFilter && !p.fdi_completo) return false;
  if (lmFilter && !p.lm_completo) return false;
  return true;
});
```

<div class="note">
Mostrando <strong>${pantos.length.toLocaleString()}</strong> de ${allPantos.length.toLocaleString()} pantomografías.
</div>

## Tabla

```js
const tableColumns = {
  archivo: {header: "Archivo", width: 200},
  dientes: {header: "Dientes", width: 70},
  con_fdi: {header: "Con FDI", width: 70},
  categoria: {header: "Cat.", width: 50},
  denticion: {header: "Dentición", width: 160},
  flagsSummary: {header: "Patologías", width: 200},
  q1: {header: "Q1", width: 40},
  q2: {header: "Q2", width: 40},
  q3: {header: "Q3", width: 40},
  q4: {header: "Q4", width: 40},
};

// Preparar datos para la tabla con un resumen de flags
const tableData = pantos.map(p => ({
  ...p,
  flagsSummary: Object.entries(p.flags || {}).map(([k, v]) => `${k}(${v})`).join(", ") || "—",
}));

const tableInput = Inputs.table(tableData, {
  columns: Object.keys(tableColumns),
  header: Object.fromEntries(Object.entries(tableColumns).map(([k, v]) => [k, v.header])),
  width: Object.fromEntries(Object.entries(tableColumns).map(([k, v]) => [k, v.width])),
  sort: "dientes",
  reverse: true,
  rows: 20,
  multiple: false,
  required: false,
});
const selectedRow = Generators.input(tableInput);
display(tableInput);
```

## Detalle

```js
const sel = selectedRow;
```

```js
if (sel) {
  const flagEntries = Object.entries(sel.flags || {});
  display(html`
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: start;">
      <div>
        <h3 style="margin-top:0">${sel.archivo}</h3>
        <table style="font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">Dientes</td><td><strong>${sel.dientes}</strong> (con FDI: ${sel.con_fdi}, sin FDI: ${sel.sin_fdi})</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">Categoría</td><td><strong>${sel.categoria}</strong>${sel.score != null ? ` (score: ${sel.score})` : ""}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">Dentición</td><td>${sel.denticion}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">Cuadrantes</td><td>Q1: ${sel.q1} · Q2: ${sel.q2} · Q3: ${sel.q3} · Q4: ${sel.q4}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">FDI completo</td><td>${sel.fdi_completo ? "Sí" : "No"}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">Landmarks</td><td>${sel.lm_completo ? "Completos" : "Incompletos"}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">Imagen</td><td>${sel.img_w} × ${sel.img_h} px</td></tr>
          ${flagEntries.length > 0
            ? html`<tr><td style="padding: 2px 12px 2px 0; color: #666; vertical-align: top;">Patologías</td><td>${flagEntries.map(([k, v]) => html`<span style="display: inline-block; background: #f0f0f0; border-radius: 4px; padding: 1px 6px; margin: 1px 2px; font-size: 12px;">${k}: ${v}</span>`)}
            </td></tr>`
            : html`<tr><td style="padding: 2px 12px 2px 0; color: #666;">Patologías</td><td>Ninguna</td></tr>`
          }
        </table>
      </div>
      <div>
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">Piezas presentes (${sel.tooth_numbers.length}):</p>
        ${miniOdontograma({toothNumbers: sel.tooth_numbers, cellSize: 22, gap: 3})}
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">
          ${sel.tooth_numbers.sort((a, b) => a - b).join(", ")}
        </p>
      </div>
    </div>
  `);
} else {
  display(html`<p style="color: #999; font-style: italic;">Seleccioná una fila en la tabla para ver el detalle.</p>`);
}
```

## Distribuciones

```js
// Histograma de dientes por panto (del subset filtrado)
const binsDientes = d3.bin().domain([0, 55]).thresholds(20)(pantos.map(d => d.dientes));

display(Plot.plot({
  title: "Distribución de cantidad de dientes",
  subtitle: `${pantos.length} pantomografías filtradas`,
  x: {label: "Cantidad de dientes"},
  y: {label: "Frecuencia"},
  marks: [
    Plot.rectY(binsDientes, {x1: "x0", x2: "x1", y: "length", fill: "#4e79a7", tip: true}),
    Plot.ruleY([0]),
  ],
  width: 640,
  height: 300,
}));
```

```js
// Conteo por categoría
const catCounts = d3.rollups(pantos, v => v.length, d => d.categoria)
  .sort((a, b) => d3.ascending(a[0], b[0]))
  .map(([cat, count]) => ({categoria: cat, count}));

display(Plot.plot({
  title: "Pantomografías por categoría de calidad",
  x: {label: "Categoría"},
  y: {label: "Cantidad"},
  marks: [
    Plot.barY(catCounts, {x: "categoria", y: "count", fill: "categoria", tip: true}),
    Plot.ruleY([0]),
  ],
  color: {domain: ["A", "B", "C", "D", "E"], range: ["#2ca02c", "#98df8a", "#ffbb78", "#ff7f0e", "#d62728"]},
  width: 400,
  height: 300,
}));
```

```js
// Prevalencia de patologías en el subset filtrado
const flagTotals = {};
for (const p of pantos) {
  for (const [flag, count] of Object.entries(p.flags || {})) {
    flagTotals[flag] = (flagTotals[flag] || 0) + 1; // pantos que tienen esa flag, no suma de counts
  }
}
const flagData = Object.entries(flagTotals)
  .map(([flag, count]) => ({flag, count, pct: (100 * count / pantos.length).toFixed(1)}))
  .sort((a, b) => b.count - a.count);

display(Plot.plot({
  title: "Prevalencia de patologías (% de pantos con al menos un caso)",
  x: {label: "Patología"},
  y: {label: "Pantomografías", grid: true},
  marks: [
    Plot.barY(flagData, {x: "flag", y: "count", fill: "#e15759", tip: true, sort: {x: "-y"}}),
    Plot.text(flagData, {x: "flag", y: "count", text: d => `${d.pct}%`, dy: -8, fontSize: 10}),
    Plot.ruleY([0]),
  ],
  width: 700,
  height: 350,
  marginBottom: 80,
  x: {tickRotate: -45},
}));
```
