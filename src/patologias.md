---
title: Patologías — Análisis epidemiológico
---

# Patologías — Análisis epidemiológico

Distribución, co-ocurrencia y multimorbilidad de hallazgos clínicos en las
**${ds.universe_prevalencia.toLocaleString("es-AR")} pantomografías** con al menos un diente
permanente anotado (FDI 11–48). No se requieren landmarks condíleos — este universo es
más amplio que el de la eigendentadura (${ds.universe_kde.toLocaleString("es-AR")} pantos).

```js
import {upsetPlot} from "./components/upset-plot.js";
import {fdiPathologyHeatmap, prevalenceByToothType} from "./components/pathology-heatmap.js";
import {prevalenceOdontogram, prevalenceLegend} from "./components/prevalence-odontogram.js";
import * as d3 from "d3";
```

```js
const ds = await FileAttachment("data/dataset_stats.json").json();
const prevalenceData = await FileAttachment("data/prevalence_by_tooth.json").json();
```

```js
const PATHOLOGY_GROUPS = [
  {label: "Caries",                  paths: ["Caries", "Caries incipiente", "Caries moderada", "Caries avanzada"]},
  {label: "Restauraciones y prótesis", paths: ["Restauración", "Corona sobre implante", "Poste/Implante", "Implante dental", "Pilar de puente"]},
  {label: "Tratamientos",            paths: ["Tratamiento de conducto"]},
  {label: "Otras patologías",        paths: ["Restos radiculares", "Pieza retenida", "Radiolucidez", "Neoplasia", "Agenesia"]},
];

const DEFAULT_PATHS = new Set(["Restauración", "Tratamiento de conducto", "Caries", "Caries avanzada", "Pieza retenida", "Radiolucidez"]);

const cariesInput     = Inputs.checkbox(PATHOLOGY_GROUPS[0].paths, {label: PATHOLOGY_GROUPS[0].label,   value: PATHOLOGY_GROUPS[0].paths.filter(p => DEFAULT_PATHS.has(p))});
const restaurInput    = Inputs.checkbox(PATHOLOGY_GROUPS[1].paths, {label: PATHOLOGY_GROUPS[1].label, value: PATHOLOGY_GROUPS[1].paths.filter(p => DEFAULT_PATHS.has(p))});
const tratamInput     = Inputs.checkbox(PATHOLOGY_GROUPS[2].paths, {label: PATHOLOGY_GROUPS[2].label,  value: PATHOLOGY_GROUPS[2].paths.filter(p => DEFAULT_PATHS.has(p))});
const otrasInput      = Inputs.checkbox(PATHOLOGY_GROUPS[3].paths, {label: PATHOLOGY_GROUPS[3].label,   value: PATHOLOGY_GROUPS[3].paths.filter(p => DEFAULT_PATHS.has(p))});
```

```js
const cariesSel  = Generators.input(cariesInput);
const restaurSel = Generators.input(restaurInput);
const tratamSel  = Generators.input(tratamInput);
const otrasSel   = Generators.input(otrasInput);
const selectedPaths = [...cariesSel, ...restaurSel, ...tratamSel, ...otrasSel];
```

## Prevalencia por tipo de diente

¿Qué patologías concentran cada tipo de pieza? Se usan **flags de diente** (presencia de la patología en esa pieza específica), no flags de dentadura.

<details>
<summary>Cómo leer este gráfico</summary>

Barras horizontales agrupadas por patología. Dentro de cada grupo, una barra por tipo de pieza (Incisivo, Canino, Premolar, Molar).

- **Eje X** — prevalencia: fracción de piezas *de ese tipo* con la patología. El denominador varía por tipo, ya que no todas las piezas están en todas las dentaduras.
- **Color** — cada color corresponde a un tipo de pieza (ver leyenda).
- **Filtro "Patologías a mostrar"** — controla qué patologías se incluyen en este gráfico y en el heatmap de abajo.

</details>

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Filtros</summary>

```js
display(html`<div style="display:flex; gap:20px; flex-wrap:wrap; padding:4px 0 8px;">
  <div>${cariesInput}</div>
  <div>${restaurInput}</div>
  <div>${tratamInput}</div>
  <div>${otrasInput}</div>
</div>`);
```

</details>

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Opciones de visualización</summary>

```js
const splitArchInput = Inputs.toggle({label: "Separar por arcada (Superior / Inferior)", value: false});
const splitArch = Generators.input(splitArchInput);
display(splitArchInput);
```

</details>

```js
display(prevalenceByToothType(prevalenceData, selectedPaths, {width: Math.min(width, splitArch ? 860 : 720), splitByArch: splitArch}));
```

## Heatmap FDI × patología

Prevalencia (%) por pieza dental y tipo de hallazgo. Cada celda = % de pacientes
con esa patología en ese diente específico.

<details>
<summary>Cómo leer este gráfico</summary>

Grilla donde cada fila es un diente (código FDI) y cada columna una patología seleccionada en el filtro.

- **Color más oscuro** — mayor prevalencia para esa combinación diente/patología.
- **Número en la celda** — porcentaje de prevalencia (solo visible si supera el 5 % y hay espacio).
- **Color del FDI** — indica el cuadrante: <span style="color:#4e79a7">■</span> Q1 · <span style="color:#59a14f">■</span> Q2 · <span style="color:#edc949">■</span> Q3 · <span style="color:#e15759">■</span> Q4.
- **Línea punteada horizontal** — separa arcada superior (11–28) de arcada inferior (31–48).

Pasá el cursor sobre una celda para ver el valor exacto y el denominador.

</details>

```js
display(fdiPathologyHeatmap(prevalenceData, {
  width: Math.min(width, 760),
  selectedPathologies: selectedPaths,
}));
```

## Prevalencia de patologías por diente

¿Qué dientes concentran cada patología? Se usan **flags de diente** (nivel FDI, no dentadura). El denominador es la cantidad de dientes de ese tipo presentes en la muestra.

<details>
<summary>Cómo leer este gráfico</summary>

El odontograma muestra los 32 dientes organizados por cuadrante. Cada celda se colorea según la prevalencia de la patología seleccionada.

- **Color más saturado** — mayor porcentaje de dentaduras con ese diente afectado.
- **Número pequeño** — fracción *casos / dientes presentes*: el denominador varía por pieza ya que no todas están en todas las dentaduras.
- **Escala** — se reajusta por patología para resaltar el patrón espacial; no compares intensidades entre patologías distintas.
- **Ranking inferior** — lista los FDI de mayor a menor prevalencia para la patología activa.

</details>

<details>
<summary style="cursor:pointer; font-size:13px; color:#444; font-weight:600;">Filtros</summary>

```js
const pathologyInput = Inputs.select(prevalenceData.pathologies, {
  label: "Patología",
  value: "Restauración",
});
const pathology = Generators.input(pathologyInput);
display(pathologyInput);
```

</details>

```js
display(prevalenceLegend({prevalenceData, pathology, width: 360}));
display(prevalenceOdontogram({
  prevalenceData,
  pathology,
  selectedFdi: [],
  width: Math.min(width, 1400),
  cellW: 62,
  cellH: 78,
}));
display(html`<div style="color:#666;font-size:11px;margin-top:6px">
  n = ${prevalenceData.n_dentitions} dentaduras. El número chico en cada
  celda indica <em>dientes con la patología / dientes presentes en la muestra</em>.
</div>`);
```

## Ranking por prevalencia (patología activa)

```js
const rankRows = [...prevalenceData.teeth]
  .map(t => ({
    FDI: t.fdi,
    "Dientes presentes": t.n_present,
    "Con patología": t[pathology].count,
    "Prevalencia": t[pathology].prevalence,
  }))
  .sort((a, b) => b["Prevalencia"] - a["Prevalencia"]);
display(Inputs.table(rankRows, {
  format: {
    "Prevalencia": d => `${(d * 100).toFixed(2)}%`,
  },
  rows: 10,
}));
```

## Co-ocurrencias — UpSet plot

¿Qué combinaciones de patologías se presentan juntas en la misma dentadura?

<details>
<summary>Cómo leer este gráfico</summary>

- **Barras verticales** (arriba) — cuántos pacientes tienen exactamente esa intersección de patologías.
- **Puntos conectados** (centro) — qué patologías forman cada intersección. Punto relleno = incluida; punto vacío = ausente.
- **Barras horizontales** (izquierda) — total de pacientes con esa patología en al menos un diente.
- **Intersecciones inclusivas** — un paciente con caries + restauración aparece en todas las intersecciones que incluyan cualquier subconjunto de esas patologías.
- Se muestran las 20 intersecciones más frecuentes.

</details>

```js
display(upsetPlot(ds.upset, {width: Math.min(width, 780), maxIntersections: 20}));
```

## Multimorbilidad

Cuántos tipos distintos de patología presenta cada paciente en su dentadura.

<details>
<summary>Cómo leer este gráfico</summary>

Distribución del número de *tipos* distintos de patología por dentadura (no el número de dientes afectados, sino la variedad de hallazgos).

- **Eje X** — cantidad de tipos de patología distintos (0 = ningún hallazgo documentado).
- **Eje Y** — cantidad de pacientes con ese número de tipos.
- **Porcentaje** — fracción del total de la muestra sobre cada barra.

Un paciente con caries en 5 dientes, 2 restauraciones y 1 endodoncia se cuenta como 3 tipos distintos.

</details>

```js
{
  const data = ds.multimorbidity;
  const total = d3.sum(data, d => d.count);
  const W = Math.min(width, 500);
  const M = {top: 20, right: 20, bottom: 50, left: 55};
  const innerW = W - M.left - M.right;
  const innerH = 160;

  const xScale = d3.scaleBand().domain(data.map(d => d.n_patologias)).range([0, innerW]).padding(0.2);
  const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([innerH, 0]).nice();
  const COLOR = ["#d0e4f2","#6baed6","#2171b5","#08519c","#08306b","#041a33"];

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, W, innerH + M.top + M.bottom])
    .attr("width", "100%")
    .style("font-family","var(--sans-serif,system-ui)");
  const g = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);

  g.append("g").attr("transform",`translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickFormat(d => `${d} pat.`))
    .call(ax => ax.select(".domain").attr("stroke","#ccc"))
    .call(ax => ax.selectAll(".tick line").remove());
  g.append("g").call(d3.axisLeft(yScale).ticks(5))
    .call(ax => ax.select(".domain").remove())
    .call(ax => ax.selectAll(".tick line").attr("stroke","#eee").attr("x2",innerW));

  g.append("text").attr("transform","rotate(-90)").attr("x",-innerH/2).attr("y",-42)
    .attr("text-anchor","middle").attr("font-size",10).attr("fill","#666").text("Pacientes");
  g.append("text").attr("x",innerW/2).attr("y",innerH+40)
    .attr("text-anchor","middle").attr("font-size",10).attr("fill","#666")
    .text("Nº de tipos de patología distintos en la dentadura");

  data.forEach((d, i) => {
    const bh = innerH - yScale(d.count);
    g.append("rect")
      .attr("x", xScale(d.n_patologias)).attr("y", yScale(d.count))
      .attr("width", xScale.bandwidth()).attr("height", bh)
      .attr("fill", COLOR[Math.min(i, COLOR.length-1)]).attr("rx", 3);
    g.append("text")
      .attr("x", xScale(d.n_patologias) + xScale.bandwidth()/2)
      .attr("y", yScale(d.count) - 4)
      .attr("text-anchor","middle").attr("font-size",9).attr("fill","#555")
      .text(`${(d.count/total*100).toFixed(1)}%`);
  });

  display(svg.node());
}
```

<div style="border-left: 4px solid #e45756; background: #fff7f7; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — La patología más prevalente es la <strong>restauración</strong>, concentrada en primeros y segundos molares (36, 46, 37, 47), consistente con el mayor esfuerzo masticatorio de esas piezas y con la epidemiología dental argentina y latinoamericana (Petersen et al., 2005; OPS, 2022). La <strong>retención dentaria</strong> afecta casi exclusivamente a los terceros molares (18, 28, 38, 48), en línea con la literatura clínica mundial. La mayoría de las dentaduras presentan <strong>0 ó 1 tipo de patología simultánea</strong>; una fracción pequeña pero clínicamente relevante concentra múltiples hallazgos (alta multimorbilidad).
</div>
