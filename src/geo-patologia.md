---
title: Geometría × Patología
---

# ¿La posición atípica predice patología?

> **Contexto**: En las páginas previas caracterizamos la [geometría dental](/geometria-dental) y el [perfil epidemiológico](/patologias) por separado. Ahora cruzamos ambas dimensiones: ¿las dentaduras geométricamente atípicas tienen mayor carga patológica? **Hallazgo P4** (negativo).

```js
const geoPath = await FileAttachment("data/geo_patologia.json").json();
import * as d3 from "d3";
import {openPantoModal} from "./components/panto-modal.js";
const toothStatsGeo = await FileAttachment("data/tooth_stats.json").json();
const pantosRawGeo = await FileAttachment("data/pantos_browser.json").json();
const pantosMapGeo = new Map(pantosRawGeo.pantos.map(p => [p.archivo, p]));
```

```js
display(htl.html`<p>Cruce de la atipicidad geométrica individual (z-scores de posición y ángulo) con la carga patológica registrada en la pantomografía. Universo: <strong>${geoPath.meta.n_records.toLocaleString("es-AR")} pantomografías</strong> con landmarks condíleos y ≥ 8 dientes anotados.</p>`);
```

```js
const PATHO_LABELS = {
  has_restauracion: "Restauración",
  has_caries: "Caries",
  has_endodoncia: "Endodoncia",
  has_retenido: "Retenido",
  has_radiolucidez: "Radiolucencia",
  has_raiz_remanente: "Raíz remanente",
};
const PATHO_COLORS = {
  has_restauracion: "#4e79a7",
  has_caries: "#e15759",
  has_endodoncia: "#59a14f",
  has_retenido: "#f28e2b",
  has_radiolucidez: "#b07aa1",
  has_raiz_remanente: "#76b7b2",
};
const clickedGeo = Mutable(null);
function setClickedGeo(d) { clickedGeo.value = d; }
function clearClickedGeo() { clickedGeo.value = null; }
```

```js
// ── Datos filtrados para navegación en modal ─────────────────────────────
const visGeoPath = geoPath.records.filter(d => {
  const p99x = d3.quantile(geoPath.records.map(dd => dd.z_pos).sort(d3.ascending), 0.99);
  const p99y = d3.quantile(geoPath.records.map(dd => dd.z_ang).sort(d3.ascending), 0.99);
  return d.z_pos <= p99x && d.z_ang <= p99y;
});

const allItemsGeo = visGeoPath.map(d => {
  const pb = pantosMapGeo.get(d.id) ?? null;
  const pathoBadges = Object.entries(PATHO_LABELS)
    .filter(([k]) => d[k])
    .map(([k, label]) => ({label, value: "✓", color: PATHO_COLORS[k]}));
  return {
    id: d.id,
    pantoMeta: pb,
    toothStats: toothStatsGeo,
    zScores: {z_mean: d.z_mean, z_pos: d.z_pos, z_ang: d.z_ang},
    iqrThreshold: null,
    iqrExtreme: null,
    extraBadges: pathoBadges,
    rankInfo: null,
  };
});
```

```js
{
  const d = clickedGeo;
  if (d != null) {
    const pb = pantosMapGeo.get(d.id) ?? null;
    const pathoBadges = Object.entries(PATHO_LABELS)
      .filter(([k]) => d[k])
      .map(([k, label]) => ({label, value: "✓", color: PATHO_COLORS[k]}));
    const currentIndex = allItemsGeo.findIndex(item => item.id === d.id);
    openPantoModal({
      id: d.id, pantoMeta: pb, toothStats: toothStatsGeo,
      zScores: {z_mean: d.z_mean, z_pos: d.z_pos, z_ang: d.z_ang},
      extraBadges: pathoBadges, onClose: clearClickedGeo, invalidation,
      allItems: allItemsGeo,
      currentIndex: currentIndex >= 0 ? currentIndex : null,
    });
  }
}
```

<details>
<summary>Sobre la metodología</summary>

- **Atipicidad posicional (z_pos)** — promedio de $\sqrt{z_x^2 + z_y^2}$ por diente: cuántas desvíos estándar se aleja la posición de cada centroide del promedio poblacional.
- **Atipicidad angular (z_ang)** — promedio de $|z_{ángulo}|$ por diente.
- **Patologías consideradas**: Restauración, Caries, Endodoncia, Retenido, Radiolucencia, Raíz remanente. Los flags son a nivel pantomografía (conteo de dientes afectados), no por diente individual.
- El análisis es **observacional y exploratorio**: correlación no implica causalidad. La dirección de causalidad (¿la atipicidad favorece la patología, o la patología altera la geometría?) no puede determinarse con datos de corte transversal.

</details>

## Scatter: atipicidad posicional vs. angular

Cada punto es una pantomografía. El color indica el número de **tipos de patología** presentes simultáneamente. Clic en un punto para ver el detalle.

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X (z_pos)** — atipicidad posicional: desvío promedio de los centroides dentales respecto al promedio poblacional, en desvíos estándar. Valores altos = dientes muy desplazados de su posición típica.
- **Eje Y (z_ang)** — atipicidad angular: desvío medio del ángulo de cada diente respecto al ángulo poblacional medio.
- **Color** — gradiente de amarillo a rojo: cuántos de los 6 tipos de patología agregados tiene esa dentadura simultáneamente (0 = ninguno, 6 = todos). Los 6 tipos son: Restauración, Caries, Endodoncia, Pieza retenida, Radiolucencia y Raíz remanente. Hay 21 dentaduras con los 6 tipos a la vez.
- **Nota**: este conteo difiere del indicador de multimorbilidad en la página Patologías, que usa 14 flags más granulares (ej. Caries incipiente / moderada / avanzada como tipos separados) y por eso llega a un máximo de 4.
- **Ausencia de gradiente visible** — si la nube de puntos no muestra gradiente de color claro, indica que los pacientes con más patologías no se concentran en ningún cuadrante particular.
- Los ejes están recortados al percentil 99 para excluir valores extremos; los puntos fuera del corte representan < 1 % de la muestra.

</details>

```js
{
  const records = geoPath.records;
  const nMax = d3.max(records, d => d.n_pathologies);
  const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, nMax]);

  const p99x = d3.quantile(records.map(d => d.z_pos).sort(d3.ascending), 0.99);
  const p99y = d3.quantile(records.map(d => d.z_ang).sort(d3.ascending), 0.99);
  const vis = records.filter(d => d.z_pos <= p99x && d.z_ang <= p99y);

  const W = Math.min(width, 700), H = 380;
  const margin = {top: 20, right: 30, bottom: 50, left: 55};
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const xS0 = d3.scaleLinear().domain([0, p99x]).range([0, iW]);
  const yS0 = d3.scaleLinear().domain([0, p99y]).range([iH, 0]);

  const svg = d3.create("svg").attr("viewBox", [0, 0, W, H]).attr("width", W).attr("height", H)
    .style("font-family", "var(--sans-serif, system-ui)").style("cursor", "default");

  const defs = svg.append("defs");
  defs.append("clipPath").attr("id", "gp-clip")
    .append("rect").attr("width", iW).attr("height", iH);

  const gOuter = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const gAxes = gOuter.append("g");
  const g = gOuter.append("g").attr("clip-path", "url(#gp-clip)");

  function drawAxes(xS, yS) {
    gAxes.selectAll("*").remove();
    gAxes.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(xS).ticks(6))
      .append("text").attr("x", iW/2).attr("y", 38).attr("fill","#555").attr("text-anchor","middle").attr("font-size",12)
      .text("Atipicidad posicional — z_pos");
    gAxes.append("g").call(d3.axisLeft(yS).ticks(5))
      .append("text").attr("transform","rotate(-90)").attr("x", -iH/2).attr("y",-42).attr("fill","#555").attr("text-anchor","middle").attr("font-size",12)
      .text("Atipicidad angular — z_ang");
  }

  function drawPoints(xS, yS) {
    g.selectAll("circle").data(vis).join("circle")
      .attr("cx", d => xS(d.z_pos))
      .attr("cy", d => yS(d.z_ang))
      .attr("r", 2.8)
      .attr("fill", d => colorScale(d.n_pathologies))
      .attr("opacity", 0.5)
      .attr("stroke", "none")
      .style("cursor", "pointer")
      .on("mouseover", function() { d3.select(this).attr("r", 4.5).attr("opacity", 1); })
      .on("mouseout", function() { d3.select(this).attr("r", 2.8).attr("opacity", 0.5); })
      .on("click", (event, d) => { setClickedGeo(d); event.stopPropagation(); })
      .append("title").text(d => `z_pos=${d.z_pos.toFixed(3)}  z_ang=${d.z_ang.toFixed(3)}\nN° patologías: ${d.n_pathologies}`);
  }

  drawAxes(xS0, yS0);
  drawPoints(xS0, yS0);

  const zoom = d3.zoom().scaleExtent([0.5, 20]).on("zoom", (event) => {
    const t = event.transform;
    const xS = t.rescaleX(xS0);
    const yS = t.rescaleY(yS0);
    drawAxes(xS, yS);
    drawPoints(xS, yS);
  });
  svg.call(zoom);
  svg.on("dblclick.zoom", () => { svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity); });

  // legend
  const legendW = 140, legendH = 12;
  const lgX = W - margin.right - legendW - 4;
  const lgY = margin.top + 4;
  const lgDefs = svg.append("defs");
  const grad = lgDefs.append("linearGradient").attr("id","gp-grad").attr("x1","0%").attr("x2","100%");
  d3.range(0, nMax + 1).forEach((v, i, arr) => {
    grad.append("stop").attr("offset", `${(i / (arr.length - 1)) * 100}%`).attr("stop-color", colorScale(v));
  });
  const lgG = svg.append("g").attr("transform", `translate(${lgX},${lgY})`);
  lgG.append("rect").attr("width", legendW).attr("height", legendH).attr("rx", 2)
    .style("fill", "url(#gp-grad)");
  lgG.append("text").attr("x", 0).attr("y", legendH + 11).attr("font-size", 9).attr("fill", "#666").text("0");
  lgG.append("text").attr("x", legendW/2).attr("y", legendH + 11).attr("font-size", 9).attr("fill", "#666").attr("text-anchor","middle").text("N° tipos patología");
  lgG.append("text").attr("x", legendW).attr("y", legendH + 11).attr("font-size", 9).attr("fill", "#666").attr("text-anchor","end").text(nMax);

  display(svg.node());
}
```

<small>Eje recortado en el percentil 99 para excluir outliers extremos. Los puntos recortados representan &lt; 1% de la muestra. Scroll/pinch para hacer zoom; doble clic para resetear. · El color cuenta <strong>6 flags agregados</strong> (Restauración, Caries, Endodoncia, Pieza retenida, Radiolucencia, Raíz remanente); el máximo posible es 6 y hay 21 dentaduras con los 6 a la vez. Esto difiere del gráfico de Multimorbilidad (pág. Patologías), que usa 14 flags más granulares y llega a un máximo de 4.</small>

## z_mean medio por carga patológica

¿Tienen más atipicidad geométrica los individuos con más tipos de patología simultáneos?

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X** — número de tipos de patología distintos presentes simultáneamente en la dentadura.
- **Eje Y (z_mean)** — atipicidad geométrica media: promedio de z_pos y z_ang por diente. Valores más altos = dentadura más alejada del patrón típico.
- **Barra vertical** — rango intercuartílico (Q1–Q3) del grupo; refleja la dispersión dentro de cada grupo de carga patológica.
- **Punto central** — mediana del grupo.
- **Línea punteada** — media global de la población; sirve de referencia para comparar entre grupos.
- **n** sobre cada barra — cantidad de dentaduras en ese grupo.

Si los grupos con más patologías tuvieran mayor z_mean, aparecerían sistemáticamente por encima de la línea punteada.

</details>

```js
{
  const byN = geoPath.by_n_pathologies;
  display(Plot.plot({
    width: Math.min(width, 520),
    height: 300,
    marginBottom: 50,
    x: {label: "N° tipos de patología presentes", tickFormat: "d"},
    y: {label: "z_mean mediano (±IQR)", domain: [1.1, 1.9]},
    marks: [
      Plot.ruleX(byN, {x: "n_pathologies", y1: "q1", y2: "q3", stroke: "#4c78a8", strokeWidth: 8, strokeOpacity: 0.25}),
      Plot.dot(byN, {x: "n_pathologies", y: "median", fill: "#4c78a8", r: 5, stroke: "white", strokeWidth: 1}),
      Plot.text(byN, {x: "n_pathologies", y: "q3", text: d => `n=${d.n.toLocaleString("es-AR")}`, dy: -8, fontSize: 9, fill: "#888"}),
      Plot.ruleY([d3.mean(geoPath.records, d => d.z_mean)], {stroke: "#888", strokeDasharray: "6,3", strokeWidth: 1.5, strokeOpacity: 0.9}),
    ],
  }));
}
```

<small>Barra vertical = rango intercuartil (Q1–Q3). Punto = mediana. Línea punteada = media global.</small>

## Diferencia de z_mean: con vs. sin cada patología

¿Qué patologías están más asociadas a posiciones atípicas?

<details>
<summary>Cómo leer este gráfico</summary>

Gráfico de mancuernas (_dumbbell chart_): cada fila es una patología y compara dos grupos.

- **Punto rojo** — mediana de z_mean de los pacientes **con** esa patología en algún diente.
- **Punto azul** — mediana de z_mean de los pacientes **sin** esa patología.
- **Línea conectora** — une los dos puntos del mismo par; su largo es la diferencia Δ entre grupos.
- **Δ anotado** — diferencia de medianas: positivo (+) indica que los pacientes con esa patología son, en promedio, más atípicos geométricamente.
- **Línea punteada vertical** — media global de z_mean en la población.
- Las filas están ordenadas por Δ de mayor a menor: las patologías con mayor asociación geométrica aparecen arriba.
- Una diferencia < 0.10 es clínicamente pequeña dado que z_mean tiene mediana ≈ 1.5 en esta cohorte.

</details>

```js
{
  const rows = geoPath.summary_by_pathology
    .filter(s => s.z_mean.with.n > 0 && s.z_mean.without.n > 0)
    .map(s => ({
      label: s.label,
      with: s.z_mean.with.median,
      without: s.z_mean.without.median,
      delta: s.z_mean.with.median - s.z_mean.without.median,
      n_with: s.z_mean.with.n,
    }))
    .sort((a, b) => b.delta - a.delta);

  const globalMean = d3.mean(geoPath.records, d => d.z_mean);
  const xDomain = [
    d3.min(rows, d => Math.min(d.with, d.without)) - 0.02,
    d3.max(rows, d => Math.max(d.with, d.without)) + 0.02,
  ];

  display(Plot.plot({
    width: Math.min(width, 620),
    height: 260,
    marginLeft: 150,
    x: {label: "z_mean mediano", domain: xDomain},
    y: {label: null, domain: rows.map(d => d.label).reverse()},
    color: {domain: ["Con patología", "Sin patología"], range: ["#e15759", "#4e79a7"], legend: true},
    marks: [
      Plot.ruleX([globalMean], {stroke: "#888", strokeDasharray: "6,3", strokeWidth: 1.5}),
      Plot.link(rows, {y: "label", x1: "without", x2: "with", stroke: "#e0e0e0", strokeWidth: 1.5}),
      Plot.dot(rows, {y: "label", x: "without", fill: () => "Sin patología", r: 6, tip: true, title: d => `Sin ${d.label}\nn=${geoPath.meta.n_records - d.n_with}\nmediana z_mean=${d.without.toFixed(3)}`}),
      Plot.dot(rows, {y: "label", x: "with", fill: () => "Con patología", r: 6, tip: true, title: d => `Con ${d.label}\nn=${d.n_with}\nmediana z_mean=${d.with.toFixed(3)}`}),
      Plot.text(rows, {y: "label", x: d => (d.with + d.without) / 2, text: d => (d.delta >= 0 ? "+" : "") + d.delta.toFixed(3), dy: -10, fontSize: 9, fill: "#999"}),
    ],
  }));
}
```

<small>Cada fila muestra la mediana de z_mean para el grupo **con** (rojo) y **sin** (azul) esa patología. La diferencia (Δ) se anota en el centro del conector. Línea punteada = media global. Filas ordenadas de mayor a menor Δ.</small>

## Tabla de referencia

```js
{
  const tRows = geoPath.summary_by_pathology
    .map(s => ({
      Patología: s.label,
      "N (con)": s.z_mean.with.n,
      "N (sin)": s.z_mean.without.n,
      "z_mean con": s.z_mean.with.median,
      "z_mean sin": s.z_mean.without.median,
      "Δ mediana": s.z_mean.with.median - s.z_mean.without.median,
      "z_pos con": s.z_pos.with.median,
      "z_pos sin": s.z_pos.without.median,
      "z_ang con": s.z_ang.with.median,
      "z_ang sin": s.z_ang.without.median,
    }))
    .sort((a, b) => Math.abs(b["Δ mediana"]) - Math.abs(a["Δ mediana"]));

  display(Inputs.table(tRows, {
    format: {
      "z_mean con": d3.format(".3f"),
      "z_mean sin": d3.format(".3f"),
      "Δ mediana": d3.format("+.3f"),
      "z_pos con": d3.format(".3f"),
      "z_pos sin": d3.format(".3f"),
      "z_ang con": d3.format(".3f"),
      "z_ang sin": d3.format(".3f"),
    },
  }));
}
```

<div style="border-left: 4px solid #76b7b2; background: #f7fdfd; padding: 0.8rem 1rem; margin: 2rem 0 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.9rem; line-height: 1.6;">
<strong>Hallazgo principal</strong> — <strong>No se detecta una asociación clínicamente relevante</strong> entre la atipicidad geométrica individual (posición/ángulo) y la carga patológica en esta cohorte: las diferencias de z_mean mediano entre grupos con y sin cada patología son &lt; 0.10 unidades (menos del 7% del valor mediano global). La excepción más marcada es <strong>Raíz remanente</strong> (Δ = +0.07): individuos con raíces residuales presentan mayor atipicidad posicional, probablemente porque la ausencia del diente completo altera la distribución espacial del arco. La variabilidad geométrica dental en esta población es esencialmente independiente de la presencia de patologías observadas en pantomografía.
</div>
