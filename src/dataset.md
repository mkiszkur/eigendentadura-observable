---
title: Dataset — Universo de Datos
---

# Dataset — Universo de datos

Descripción del proceso de filtrado y la composición del universo de análisis.

```js
import {funnelChart, teethDistChart} from "./components/funnel-chart.js";
import {zoomableChart} from "./components/zoomable-chart.js";
import * as d3 from "d3";
```

```js
const ds = await FileAttachment("data/dataset_stats.json").json();
```

## Embudo de filtrado

A partir de las ${ds.funnel[0].n.toLocaleString("es-AR")} pantomografías digitalizadas,
se aplican sucesivos criterios de inclusión para obtener el universo de cada análisis.

```js
display(funnelChart(ds.funnel, {width: Math.min(width, 700)}));
```

<div style="margin-top: 1rem; display: flex; gap: 2rem; flex-wrap: wrap;">
<div style="background: #e8f0fb; border-left: 4px solid #2171b5; padding: 0.8rem 1.2rem; border-radius: 4px; min-width: 220px;">
  <div style="font-size: 0.75rem; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Universo prevalencias</div>
  <div style="font-size: 2rem; font-weight: bold; color: #2171b5;">${ds.universe_prevalencia.toLocaleString("es-AR")}</div>
  <div style="font-size: 0.8rem; color: #555;">pantomografías con FDI permanente</div>
</div>
<div style="background: #e3eaf5; border-left: 4px solid #08306b; padding: 0.8rem 1.2rem; border-radius: 4px; min-width: 220px;">
  <div style="font-size: 0.75rem; color: #555; text-transform: uppercase; letter-spacing: 0.05em;">Universo eigendentadura / KDE</div>
  <div style="font-size: 2rem; font-weight: bold; color: #08306b;">${ds.universe_kde.toLocaleString("es-AR")}</div>
  <div style="font-size: 0.8rem; color: #555;">pantomografías con landmarks condíleos</div>
</div>
</div>

<details style="margin-top: 1rem;">
<summary><strong>Criterios de inclusión y exclusión</strong></summary>

**Universo de prevalencias** (${ds.universe_prevalencia.toLocaleString("es-AR")} pantomografías): Se incluyen todos los dientes permanentes (FDI 11–48) con número FDI anotado por un revisor humano. No se requiere dentadura completa ni landmarks.

**Universo eigendentadura / KDE** (${ds.universe_kde.toLocaleString("es-AR")} pantomografías): Se añade el requisito de **landmarks condíleos completos** (puntos derecho e izquierdo), necesarios para la normalización de coordenadas. El origen se sitúa en el punto medio intercondíleo y la escala se define por la distancia intercondílea.

Se excluyen de ambos universos:
- Dientes deciduos (FDI 51–85)
- Dientes sin número FDI anotado
- Pantomografías sin ninguna anotación

</details>

## Distribución de dientes anotados por pantomografía

```js
const rawMax = d3.max(ds.teeth_dist, d => d.count);
const yCapInput = Inputs.range([20, rawMax], {
  label: "Máximo en Y",
  step: 10,
  value: rawMax,
});
const yCap = Generators.input(yCapInput);
display(html`<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
  ${yCapInput}
  <span style="font-size:11px;color:#aaa;">Bajá para ver las barras pequeñas</span>
</div>`);
```

```js
display(zoomableChart(teethDistChart(ds.teeth_dist, {width: Math.min(width, 680), maxY: yCap})));
```

```js
{
  const pct32 = ds.teeth_dist.find(d => d.n_teeth === 32);
  const total = d3.sum(ds.teeth_dist, d => d.count);
  const median = d3.median(ds.pantos, d => d.n);
  display(html`<p style="font-size:0.875rem; color:#555; margin-top:0.5rem;">
    <strong>${pct32 ? ((pct32.count / total * 100).toFixed(1)) : "—"}%</strong> de las pantomografías
    tienen los 32 dientes permanentes anotados.
    Mediana: <strong>${median}</strong> dientes por paciente.
  </p>`);
}
```

<div style="border-left: 4px solid #4c78a8; background: #f0f4ff; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Composición del universo</strong> — El dataset parte de <strong>${ds.funnel[0].n.toLocaleString("es-AR")} pantomografías</strong>, de las cuales ${ds.funnel[2].n.toLocaleString("es-AR")} tienen al menos un diente permanente anotado (universo epidemiológico) y ${ds.funnel[3].n.toLocaleString("es-AR")} cuentan además con landmarks condíleos completos (universo geométrico). Esta distinción define qué preguntas puede responder cada análisis: prevalencia de patologías usa el universo más amplio; eigendentadura, z-scores y morfometría requieren el universo geométrico.
</div>

## Composición por cuadrante, maxilar y tipo de diente

Para cada valor de N° de dientes anotados por pantomografía, las barras muestran cuántos de esos dientes provienen de cada grupo. En dentaduras completas (32 piezas) la distribución es uniforme; a medida que bajan las piezas se puede ver en qué grupo se concentran las ausencias.

```js
const groupSelInput = Inputs.select(
  new Map([
    ["Cuadrante", "quadrant"],
    ["Maxilar", "jaw"],
    ["Tipo de diente", "type"],
  ]),
  { label: "Desglosar por" }
);
const groupSel = Generators.input(groupSelInput);
display(groupSelInput);
```

```js
{
  const source = groupSel === "quadrant" ? ds.teeth_by_quadrant
    : groupSel === "jaw"      ? ds.teeth_by_jaw
    : ds.teeth_by_type;

  const COLOR = groupSel === "quadrant"
    ? { domain: ["Q1","Q2","Q3","Q4"], range: ["#4c78a8","#72b7b2","#f28e2b","#e45756"] }
    : groupSel === "jaw"
    ? { domain: ["Superior","Mandíbula"], range: ["#4c78a8","#e45756"] }
    : { domain: ["Anterior","Molar","Premolar"], range: ["#7b52ab","#e15759","#54a24b"] };

  const long = source.flatMap(row =>
    COLOR.domain.map(g => ({ n_teeth: row.n_teeth, group: g, value: row[g] ?? 0 }))
  );

  display(Plot.plot({
    width: Math.min(width, 680),
    height: 240,
    marginBottom: 42,
    marginTop: 10,
    x: {
      label: "N° de dientes por pantomografía",
      tickSpacing: 18,
    },
    y: {
      label: "Media de dientes",
      grid: true,
    },
    color: { ...COLOR, legend: true },
    marks: [
      Plot.barY(long, Plot.stackY({
        x: "n_teeth",
        y: "value",
        fill: "group",
        order: COLOR.domain,
        tip: true,
      })),
    ],
  }));
}
```

