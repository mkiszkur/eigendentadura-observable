---
title: Dataset — Universo de Datos
---

# Dataset — Universo de datos

Descripción del proceso de filtrado y la composición del universo de análisis.

```js
import {funnelChart, teethDistChart} from "./components/funnel-chart.js";
import {zoomableChart} from "./components/zoomable-chart.js";
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
import * as d3 from "d3";
```

```js
const ds = await FileAttachment("data/dataset_stats.json").json();
```

## Embudo de filtrado

```js
display(htl.html`<p>A partir de las ${ds.funnel[0].n.toLocaleString("es-AR")} pantomografías digitalizadas,
se aplican sucesivos criterios de inclusión para obtener el universo de cada análisis.</p>`);
```

```js
display(funnelChart(ds.funnel, {width: Math.min(width, 700)}));
```

```js
display(kpiGrid([
  {
    label: "Universo prevalencias",
    value: ds.universe_prevalencia.toLocaleString("es-AR"),
    sub: "pantomografías con FDI permanente",
    color: "#2171b5",
    source: "stage_02_pantos_processed.py",
    tooltip: "Universo epidemiológico para análisis de prevalencias"
  },
  {
    label: "Universo eigendentadura / KDE",
    value: ds.universe_kde.toLocaleString("es-AR"),
    sub: "pantomografías con landmarks condíleos",
    color: "#08306b",
    source: "stage_02_pantos_processed.py",
    tooltip: "Universo geométrico con 7 landmarks condíleos completos (L1-L7)"
  }
], {minWidth: "220px"}));
```

<details style="margin-top: 1rem;">
<summary><strong>Criterios de inclusión y exclusión</strong></summary>

```js
display(htl.html`<p><strong>Universo de prevalencias</strong> (${ds.universe_prevalencia.toLocaleString("es-AR")} pantomografías): Se incluyen todos los dientes permanentes (FDI 11–48) con número FDI anotado por un revisor humano. No se requiere dentadura completa ni landmarks.</p>

<p><strong>Universo eigendentadura / KDE</strong> (${ds.universe_kde.toLocaleString("es-AR")} pantomografías): Se añade el requisito de <strong>landmarks condíleos completos</strong> (puntos derecho e izquierdo), necesarios para la normalización de coordenadas. El origen se sitúa en el punto medio intercondíleo y la escala se define por la distancia intercondílea.</p>`);
```

Se excluyen de ambos universos:
- Dientes deciduos (FDI 51–85)
- Dientes sin número FDI anotado
- Pantomografías sin ninguna anotación

</details>

## Distribución de dientes anotados por pantomografía

<details open style="margin: 1rem 0; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0.8rem;">
<summary style="cursor: pointer; font-weight: 600; font-size: 0.95rem; color: #333; user-select: none;">
🎚️ Controles de visualización
</summary>

```js
const rawMax = d3.max(ds.teeth_dist, d => d.count);
const yCapInput = Inputs.range([20, rawMax], {
  label: "Máximo en Y",
  step: 10,
  value: rawMax,
});
const yCap = Generators.input(yCapInput);

// Capturar valores iniciales para reset
const initialYCap = rawMax;

function resetFilters() {
  yCapInput.value = initialYCap;
  yCapInput.dispatchEvent(new Event("input", {bubbles: true}));
}

display(html`<div style="margin-top: 0.8rem;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
    ${yCapInput}
    <span style="font-size:11px;color:#aaa;">Bajá para ver las barras pequeñas</span>
  </div>
  <button onclick=${resetFilters} style="margin-top:0.8rem;padding:0.4rem 0.8rem;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:0.85rem;">
    🔄 Restablecer
  </button>
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

</details>

<div style="border-left: 4px solid #4c78a8; background: #f0f4ff; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">

```js
display(htl.html`<strong>Composición del universo</strong> — El dataset parte de <strong>${ds.funnel[0].n.toLocaleString("es-AR")} pantomografías</strong>, de las cuales ${ds.funnel[2].n.toLocaleString("es-AR")} tienen al menos un diente permanente anotado (universo epidemiológico) y ${ds.funnel[3].n.toLocaleString("es-AR")} cuentan además con landmarks condíleos completos (universo geométrico). Esta distinción define qué preguntas puede responder cada análisis: prevalencia de patologías usa el universo más amplio; eigendentadura, z-scores y morfometría requieren el universo geométrico.`);
```

</div>

## Composición por cuadrante, maxilar y tipo de diente

Para cada valor de N° de dientes anotados por pantomografía, las barras muestran cuántos de esos dientes provienen de cada grupo. En dentaduras completas (32 piezas) la distribución es uniforme; a medida que bajan las piezas se puede ver en qué grupo se concentran las ausencias.

<details open style="margin: 1rem 0; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0.8rem;">
<summary style="cursor: pointer; font-weight: 600; font-size: 0.95rem; color: #333; user-select: none;">
🎚️ Controles de desglose
</summary>

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

// Capturar valor inicial para reset
const initialGroupSel = "quadrant";

function resetGrouping() {
  groupSelInput.value = initialGroupSel;
  groupSelInput.dispatchEvent(new Event("input", {bubbles: true}));
}

display(html`<div style="margin-top: 0.8rem;">
  ${groupSelInput}
  <button onclick=${resetGrouping} style="margin-top:0.8rem;padding:0.4rem 0.8rem;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:0.85rem;">
    🔄 Restablecer
  </button>
</div>`);
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

</details>

