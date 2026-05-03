---
title: Geometría × Patología
---

# ¿La posición atípica predice patología?

Cruce de la atipicidad geométrica individual (z-scores de posición y ángulo) con la carga patológica registrada en la pantomografía. Universo: **${geoPath.meta.n_records.toLocaleString("es-AR")} pantomografías** con landmarks condíleos y ≥ 8 dientes anotados.

```js
const geoPath = await FileAttachment("data/geo_patologia.json").json();
import * as d3 from "d3";
```

<details>
<summary>Sobre la metodología</summary>

- **Atipicidad posicional (z_pos)** — promedio de $\sqrt{z_x^2 + z_y^2}$ por diente: cuántas desvíos estándar se aleja la posición de cada centroide del promedio poblacional.
- **Atipicidad angular (z_ang)** — promedio de $|z_{ángulo}|$ por diente.
- **Patologías consideradas**: Restauración, Caries, Endodoncia, Retenido, Radiolucidez, Raíz remanente. Los flags son a nivel pantomografía (conteo de dientes afectados), no por diente individual.
- El análisis es **observacional y exploratorio**: correlación no implica causalidad. La dirección de causalidad (¿la atipicidad favorece la patología, o la patología altera la geometría?) no puede determinarse con datos de corte transversal.

</details>

## Scatter: atipicidad posicional vs. angular

Cada punto es una pantomografía. El color indica el número de **tipos de patología** presentes simultáneamente.

<details>
<summary>Cómo leer este gráfico</summary>

- **Eje X (z_pos)** — atipicidad posicional: desvío promedio de los centroides dentales respecto al promedio poblacional, en desvíos estándar. Valores altos = dientes muy desplazados de su posición típica.
- **Eje Y (z_ang)** — atipicidad angular: desvío medio del ángulo de cada diente respecto al ángulo poblacional medio.
- **Color** — gradiente de amarillo a rojo: cuántos tipos de patología distintos tiene esa dentadura (0 = sin patología registrada, valores mayores = más tipos simultáneos).
- **Ausencia de gradiente visible** — si la nube de puntos no muestra gradiente de color claro, indica que los pacientes con más patologías no se concentran en ningún cuadrante particular.
- Los ejes están recortados al percentil 99 para excluir valores extremos; los puntos fuera del corte representan < 1 % de la muestra.

</details>

```js
{
  const nMax = d3.max(geoPath.records, d => d.n_pathologies);
  display(Plot.plot({
    width: Math.min(width, 700),
    height: 380,
    color: {
      scheme: "YlOrRd",
      domain: [0, nMax],
      legend: true,
      label: "N° tipos de patología",
    },
    x: {label: "Atipicidad posicional — z_pos", domain: [0, d3.quantile(geoPath.records.map(d=>d.z_pos).sort(d3.ascending), 0.99)]},
    y: {label: "Atipicidad angular — z_ang", domain: [0, d3.quantile(geoPath.records.map(d=>d.z_ang).sort(d3.ascending), 0.99)]},
    marks: [
      Plot.dot(geoPath.records, {
        x: "z_pos", y: "z_ang",
        fill: "n_pathologies",
        r: 2.5,
        fillOpacity: 0.45,
        clip: true,
      }),
    ],
  }));
}
```

<small>Eje recortado en el percentil 99 para excluir outliers extremos. Los puntos recortados representan &lt; 1% de la muestra.</small>

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
      Plot.ruleY([d3.mean(geoPath.records, d => d.z_mean)], {stroke: "#aaa", strokeDasharray: "5,3", strokeOpacity: 0.8}),
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
    y: {label: null},
    color: {domain: ["Con patología", "Sin patología"], range: ["#e15759", "#4e79a7"], legend: true},
    marks: [
      Plot.ruleX([globalMean], {stroke: "#ccc", strokeDasharray: "5,3"}),
      Plot.link(rows, {y: "label", x1: "without", x2: "with", stroke: "#e0e0e0", strokeWidth: 1.5}),
      Plot.dot(rows, {y: "label", x: "without", fill: () => "Sin patología", r: 6, tip: true, title: d => `Sin ${d.label}\nn=${geoPath.meta.n_records - d.n_with}\nmediana z_mean=${d.without.toFixed(3)}`}),
      Plot.dot(rows, {y: "label", x: "with", fill: () => "Con patología", r: 6, tip: true, title: d => `Con ${d.label}\nn=${d.n_with}\nmediana z_mean=${d.with.toFixed(3)}`}),
      Plot.text(rows, {y: "label", x: d => (d.with + d.without) / 2, text: d => (d.delta >= 0 ? "+" : "") + d.delta.toFixed(3), dy: -10, fontSize: 9, fill: "#999"}),
    ],
  }));
}
```

<small>Cada fila muestra la mediana de z_mean para el grupo **con** (rojo) y **sin** (azul) esa patología. La diferencia (Δ) se anota en el centro del conector. Línea punteada = media global.</small>

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
