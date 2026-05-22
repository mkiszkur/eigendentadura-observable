---
title: exp01 — LLM visual vs prior geométrico
---

# exp01 — LLM visual vs prior geométrico

```js
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
import * as d3 from "d3";
```

```js
const metrics = await FileAttachment("data/anexo/exp01_metrics.json").json();
const splits  = await FileAttachment("data/anexo/splits.json").json();
const detail  = await FileAttachment("data/anexo/exp01_landmarks_detail.json").json();
```

[← Volver al anexo](./anexo-experimentos)

## Pregunta de investigación

¿Un LLM multimodal de propósito general (lectura visual, sin
entrenamiento específico en radiología dental) puede anotar los
**7 landmarks anatómicos** (L1–L7) sobre una pantomografía con
calidad comparable o superior a un prior geométrico simple basado
en los centroides FDI ya anotados?

## Hipótesis del plan

- **H1**: el LLM v1 (overview gridded) anota los 7 landmarks con
  `err_rel mediana ≤ 3 %` sobre Set B.
- **H2**: la iteración v2 (crops por landmark + regla del extremo +
  self-check) supera el piso anatómico que limita a v1.
- **H3**: con prompt cuidado, el LLM bate al prior geométrico al menos
  en los landmarks con bordes nítidos (L3/L4/L5).

---

## ¿Qué es el prior geométrico?

El **prior geométrico** es un predictor de landmarks que **no usa la imagen**:
infiere la posición de cada landmark a partir de la posición conocida de los
dientes anotados con notación FDI. La idea es que la anatomía craneal impone
relaciones espaciales estables entre dientes y landmarks:

1. **Dientes ancla superiores** (molares 17, 18, 27, 28): se calcula su
   centroide promedio y se le suma un *offset estadístico* (media del dataset,
   normalizado por ancho de imagen) para predecir los **cóndilos** (L1, L2)
   y las **eminencias** (L6, L7).
2. **Dientes ancla inferiores** (incisivos 31, 32, 41, 42): su centroide
   promedio + offset predice el **mentón** (L3, L4, L5).
3. **Fallback**: si no hay dientes ancla, se usa la posición media normalizada
   por tamaño de imagen (prior absoluto, menos preciso).

El offset se calculó sobre **2.730 pantos** con landmarks GT completos. La métrica
de error usa la **distancia intercondilar** como denominador:

```
err_rel = ‖ p̂ − p_GT ‖ / d_intercondilar_GT
```

Esto normaliza por el tamaño del cráneo, haciendo los errores comparables
entre pacientes.

## Material y método

### Set B — 5 pantos curadas a mano

```js
display(htl.html`<p><strong>Set B</strong> es un mini-eval set armado al inicio del proyecto:
${splits.exp01_setB.n_pantos} pantomografías elegidas para cubrir
variedad de tamaños de cráneo y calidad de imagen, con GT humano de
los 7 landmarks revisado. Como cada panto aporta 7 mediciones,
resulta en ${splits.exp01_setB.n_landmarks_eval} comparaciones por
método. Es chico a propósito: el LLM v2 hace una llamada API por
landmark, y a USD ~0,01/llamada el costo escala rápido.</p>`);
```

### Prior geométrico

Predictor sin imagen descrito arriba. Es el **baseline obligatorio** —
todo método nuevo se compara contra él.

### LLM v1 — *overview gridded*

- Se renderiza la panto completa con una **grilla de coordenadas
  cada 25 píxeles** sobreimpresa (ayuda visual para que el LLM lea
  posiciones absolutas).
- Un único prompt al modelo (`claude-3.5-sonnet` vía API) pidiendo
  los 7 landmarks de una vez: *"devolvé las coordenadas (x, y) en
  píxeles para L1…L7, usando la grilla"*.
- Costo: 1 llamada por panto. Resultado: piso de error alto (mediana
  6,95 %), confunde landmarks contralaterales, falla en cóndilos.

### LLM v2 — *crops + self-check*

- **7 llamadas por panto**, una por landmark.
- Cada llamada recibe un **crop centrado en la predicción del prior**
  (radio ~120 px), con grilla 25 px sobreimpresa.
- El prompt incluye la **regla del extremo**: "L1 es el punto más
  superior y lateral del cóndilo izquierdo…" formalizando el
  criterio anatómico para cada landmark.
- **Self-check obligatorio**: el LLM tiene que devolver, además de
  las coordenadas, una bandera `unsure: true/false` y una razón. La
  v2 fue auto-flageada en 4/5 pantos como problemática.

### Métrica

Error relativo: err_rel = ‖ p̂ − p_GT ‖ / d_intercondilar_GT
(ver índice).

## Resultado principal

```js
display(htl.html`<p>Las tres cifras de abajo son la <strong>mediana del error relativo</strong> sobre
${splits.exp01_setB.n_landmarks_eval} mediciones (5 pantos × 7
landmarks). Verde = prior geométrico (baseline). Rojo = LLM v1.
Naranja = LLM v2.</p>`);
```

```js
{
  const COLORS = {"Prior geométrico":"#54a24b","LLM v1 (overview)":"#e15759","LLM v2 (crops + self-check)":"#f58518"};
  display(kpiGrid(metrics.map(m => ({
    label: m.method,
    value: `${m.median.toFixed(2)} %`,
    sub: `mediana err_rel · n=${m.n} · max ${m.max.toFixed(2)} %`,
    color: COLORS[m.method] ?? "#888",
    source: "exp01 Uso A",
    tooltip: "Error relativo mediano de predicción de landmarks sobre eval_set_v3 (5 pantos × 7 landmarks)"
  })), {minWidth: "260px"}));
}
```

```js
{
  const rows = metrics;
  const width = 640;
  const margin = {top: 20, right: 18, bottom: 38, left: 110};
  const x = d3.scaleLinear().domain([0, d3.max(rows, r => r.max) * 1.1]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(rows.map(r => r.method)).range([margin.top, margin.top + rows.length * 60]).paddingInner(0.35);

  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${margin.top + rows.length * 60 + margin.bottom}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");
  svg.append("g").attr("transform", `translate(0,${margin.top + rows.length * 60})`).call(d3.axisBottom(x).tickFormat(d => d + " %"));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
  for (const r of rows) {
    const color = {"Prior geométrico":"#54a24b","LLM v1 (overview)":"#e15759","LLM v2 (crops + self-check)":"#f58518"}[r.method] ?? "#888";
    svg.append("rect").attr("x", x(r.median)).attr("y", y(r.method) + y.bandwidth()*0.25).attr("width", x(r.max)-x(r.median)).attr("height", y.bandwidth()*0.5).attr("fill", color).attr("opacity", 0.18);
    svg.append("line").attr("x1", x(r.median)).attr("x2", x(r.median)).attr("y1", y(r.method)).attr("y2", y(r.method) + y.bandwidth()).attr("stroke", color).attr("stroke-width", 3);
    svg.append("line").attr("x1", x(r.p75)).attr("x2", x(r.p75)).attr("y1", y(r.method) + y.bandwidth()*0.2).attr("y2", y(r.method) + y.bandwidth()*0.8).attr("stroke", color).attr("stroke-width", 1.5).attr("stroke-dasharray","3,2");
    svg.append("text").attr("x", x(r.median) + 6).attr("y", y(r.method) + y.bandwidth()*0.5 - 4).attr("font-size", 11).attr("fill", color).text(`med ${r.median.toFixed(2)}%`);
    svg.append("text").attr("x", x(r.max) - 6).attr("y", y(r.method) + y.bandwidth()*0.5 + 12).attr("font-size", 10).attr("fill","#666").attr("text-anchor","end").text(`max ${r.max.toFixed(2)}%`);
  }
  svg.append("text").attr("x", margin.left).attr("y", 12).attr("font-size",11).attr("fill","#888").text("Distribución del error: barra clara = rango median→max; línea sólida = mediana; punteado = p75");
  display(svg.node());
}
```

**Cómo leer este gráfico**: cada fila es un método. La barra clara
va de la **mediana** al **máximo** del error; cuanto más corta y más
a la izquierda, mejor. La línea sólida marca la mediana (50 % de los
landmarks por debajo) y la punteada el p75 (75 % por debajo). Un
método "bueno" tiene la barra entera por debajo del **3 %** (umbral
operativo). Solo el prior geométrico cumple con esa cota en mediana
— y por margen estrecho.

---

## Landmarks reales vs predichos por el prior geométrico

Seleccioná una pantomografía del Set B para ver la posición real (GT, en verde)
vs la predicha por el prior geométrico (rojo). Las **líneas punteadas** conectan
cada predicción con su GT; la longitud es el error.

Los **círculos grises** son los centroides de los dientes con FDI anotado; los
resaltados en azul son los **dientes ancla** (17, 18, 27, 28 para cóndilos;
31, 32, 41, 42 para mentón) que el prior usa como referencia.

```js
const selectedPanto = view(Inputs.select(detail, {
  format: d => `${d.panto_id}  — med ${d.median_err_rel}% · max ${d.max_err_rel}% · ${d.n_teeth} dientes`,
  label: "Pantomografía"
}));
```

```js
{
  const p = selectedPanto;
  const W = p.W, H = p.H;
  const aspect = H / W;
  const svgW = 800;
  const svgH = svgW * aspect;
  const sx = svgW / W, sy = svgH / H;

  const ANCHOR_SET = new Set([17,18,27,28,31,32,41,42]);

  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${svgW} ${svgH}`)
    .attr("style", "max-width:100%;height:auto;font:11px sans-serif;background:#f8f8f8;border:1px solid #ddd;border-radius:6px;");

  // Image area outline
  svg.append("rect").attr("width", svgW).attr("height", svgH).attr("fill", "#f0f0f0").attr("stroke", "#ccc");

  // Teeth centroids
  for (const t of p.teeth) {
    const isAnchor = ANCHOR_SET.has(t.fdi);
    svg.append("circle")
      .attr("cx", t.x * sx).attr("cy", t.y * sy)
      .attr("r", isAnchor ? 5 : 3)
      .attr("fill", isAnchor ? "#4c78a8" : "#bbb")
      .attr("opacity", isAnchor ? 0.8 : 0.4);
    if (isAnchor) {
      svg.append("text")
        .attr("x", t.x * sx).attr("y", t.y * sy - 7)
        .attr("text-anchor", "middle").attr("font-size", 8).attr("fill", "#4c78a8")
        .text(t.fdi);
    }
  }

  for (const lm of p.landmarks) {
    if (!lm.gt_x || !lm.pred_x) continue;
    // Error line: pred → GT
    svg.append("line")
      .attr("x1", lm.pred_x * sx).attr("y1", lm.pred_y * sy)
      .attr("x2", lm.gt_x * sx).attr("y2", lm.gt_y * sy)
      .attr("stroke", "#e15759").attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,2").attr("opacity", 0.6);

    // Predicted (red ×)
    const px = lm.pred_x * sx, py = lm.pred_y * sy;
    svg.append("line").attr("x1", px-5).attr("y1", py-5).attr("x2", px+5).attr("y2", py+5).attr("stroke", "#e15759").attr("stroke-width", 2.5);
    svg.append("line").attr("x1", px-5).attr("y1", py+5).attr("x2", px+5).attr("y2", py-5).attr("stroke", "#e15759").attr("stroke-width", 2.5);

    // GT (green circle)
    svg.append("circle")
      .attr("cx", lm.gt_x * sx).attr("cy", lm.gt_y * sy)
      .attr("r", 7).attr("fill", "none").attr("stroke", "#54a24b").attr("stroke-width", 2.5);

    // Label
    const labelX = lm.gt_x * sx + 10, labelY = lm.gt_y * sy - 2;
    svg.append("text")
      .attr("x", labelX).attr("y", labelY)
      .attr("font-size", 10).attr("font-weight", 600).attr("fill", "#333")
      .text(`${lm.label.toUpperCase()} (${lm.err_rel}%)`);
  }

  // Legend
  const lg = svg.append("g").attr("transform", `translate(12, ${svgH - 60})`);
  lg.append("rect").attr("width", 230).attr("height", 55).attr("fill", "white").attr("opacity", 0.85).attr("rx", 4);
  lg.append("circle").attr("cx", 14).attr("cy", 12).attr("r", 5).attr("fill", "none").attr("stroke", "#54a24b").attr("stroke-width", 2);
  lg.append("text").attr("x", 24).attr("y", 16).attr("font-size", 10).text("GT (ground truth humano)");
  lg.append("line").attr("x1", 9).attr("y1", 28).attr("x2", 19).attr("y2", 38).attr("stroke", "#e15759").attr("stroke-width", 2.5);
  lg.append("line").attr("x1", 9).attr("y1", 38).attr("x2", 19).attr("y2", 28).attr("stroke", "#e15759").attr("stroke-width", 2.5);
  lg.append("text").attr("x", 24).attr("y", 36).attr("font-size", 10).text("Predicción del prior geométrico");
  lg.append("circle").attr("cx", 14).attr("cy", 50).attr("r", 4).attr("fill", "#4c78a8").attr("opacity", 0.8);
  lg.append("text").attr("x", 24).attr("y", 54).attr("font-size", 10).text("Diente ancla FDI (usado por el prior)");

  display(svg.node());
}
```

### Detalle por landmark de esta panto

```js
{
  const p = selectedPanto;
  const tableRows = p.landmarks.filter(lm => lm.gt_x && lm.pred_x);
  display(Inputs.table(tableRows.map(lm => ({
    Landmark: lm.label.toUpperCase(),
    "GT (x, y)": `(${lm.gt_x}, ${lm.gt_y})`,
    "Pred (x, y)": `(${lm.pred_x}, ${lm.pred_y})`,
    "Error (px)": lm.err_px,
    "Error rel (%)": lm.err_rel,
    "Ancla": lm.source
  }))));
}
```

### Resumen por panto: mejores y peores predicciones

```js
{
  const width = 700, barH = 28, margin = {top: 30, right: 80, bottom: 30, left: 150};
  const sorted = [...detail].sort((a,b) => a.median_err_rel - b.median_err_rel);
  const height = margin.top + sorted.length * barH + margin.bottom;

  const x = d3.scaleLinear().domain([0, d3.max(sorted, d => d.max_err_rel) * 1.1]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(sorted.map(d => d.panto_id)).range([margin.top, height - margin.bottom]).paddingInner(0.25);

  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d => d + "%"));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => d.slice(0,12) + "…"));

  for (const p of sorted) {
    const color = p.median_err_rel <= 2 ? "#54a24b" : p.median_err_rel <= 3.5 ? "#f58518" : "#e15759";
    // Range bar
    svg.append("rect")
      .attr("x", x(p.median_err_rel)).attr("y", y(p.panto_id) + y.bandwidth()*0.15)
      .attr("width", x(p.max_err_rel) - x(p.median_err_rel)).attr("height", y.bandwidth()*0.7)
      .attr("fill", color).attr("opacity", 0.2);
    // Median mark
    svg.append("line")
      .attr("x1", x(p.median_err_rel)).attr("x2", x(p.median_err_rel))
      .attr("y1", y(p.panto_id)).attr("y2", y(p.panto_id) + y.bandwidth())
      .attr("stroke", color).attr("stroke-width", 3);
    // Labels
    svg.append("text").attr("x", x(p.max_err_rel) + 4).attr("y", y(p.panto_id) + y.bandwidth()*0.65)
      .attr("font-size", 9).attr("fill", "#666").text(`${p.n_teeth}d`);
  }
  svg.append("text").attr("x", margin.left).attr("y", 18).attr("font-size", 11).attr("fill", "#888")
    .text("Error por panto: barra = rango mediana→max; color = calidad (verde ≤2%, naranja ≤3.5%, rojo >3.5%)");

  display(svg.node());
}
```

---

## Dependencia del FDI y limitaciones del prior

El prior geométrico tiene una **dependencia fuerte** sobre la anotación
FDI de los dientes: necesita saber *qué diente es cada shape* para
elegir las anclas correctas. Sin FDI, cae a un prior basado solo en
la posición media normalizada por tamaño de imagen, mucho menos preciso.

**En el dataset completo (5.114 pantos)**:

- **2.781 pantos (54,4 %)** tienen anotación FDI en al menos un diente
  (de ellos, **853 — 16,7 %** tienen FDI completo en los 32 dientes).
- De las pantos con FDI, **2.706 (52,9 %)** también tienen los 7
  landmarks GT anotados (el set sobre el cual se calibró el prior
  y donde es aplicable de forma plena).
- Las **2.333 pantos (45,6 %) sin FDI** quedan fuera del alcance del
  prior basado en anclas FDI → necesitan un fallback distinto
  (centroide normalizado por imagen, o un detector basado en píxeles).
- De las 2.749 pantos con landmarks completos, **43** no tienen FDI
  → para esas, el prior pierde sus anclas y debe caer al fallback.

```js
{
  const data = [
    {label: "Con FDI + landmarks", value: 2706, color: "#54a24b"},
    {label: "Solo landmarks (sin FDI)", value: 43, color: "#f58518"},
    {label: "Solo FDI (sin landmarks)", value: 75, color: "#4c78a8"},
    {label: "Sin FDI ni landmarks", value: 2290, color: "#e15759"},
  ];
  const total = 5114;
  const width = 600, barH = 32, margin = {top: 10, right: 80, bottom: 30, left: 200};
  const height = margin.top + data.length * barH + margin.bottom;

  const x = d3.scaleLinear().domain([0, total]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(data.map(d => d.label)).range([margin.top, height - margin.bottom]).paddingInner(0.3);

  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  for (const d of data) {
    svg.append("rect").attr("x", x(0)).attr("y", y(d.label)).attr("width", x(d.value) - x(0)).attr("height", y.bandwidth()).attr("fill", d.color).attr("opacity", 0.7);
    svg.append("text").attr("x", x(d.value) + 4).attr("y", y(d.label) + y.bandwidth()*0.65).attr("font-size", 10).attr("fill", "#333")
      .text(`${d.value} (${(d.value/total*100).toFixed(1)}%)`);
  }
  display(svg.node());
}
```

**Esto implica que**:

- El prior geométrico, tal como fue evaluado en este experimento, es
  **aplicable al ≈53 % del dataset** (las pantos con FDI + landmarks
  GT, 2.706 / 5.114). Cubre la mitad del corpus, pero queda fuera del
  alcance para las ~2.300 pantos sin FDI.
- Para esas pantos sin FDI (que incluyen prácticamente todas las que
  tampoco tienen landmarks) se necesita un método que trabaje
  directamente sobre la imagen — motivación directa del **exp02**
  (modelos de CV) y **exp04** (red neuronal especializada).
- El buen rendimiento del prior (mediana 2,8 %) es genuino pero
  opera sobre un subconjunto privilegiado: pantos con anotación
  completa de FDI, que son las más cuidadosamente anotadas del dataset.

---

## Veredicto

| Hipótesis | Resultado |
|---|---|
| **H1** — LLM v1 mediana ≤ 3 % | **Falsa** (6,95 %, más del doble del objetivo) |
| **H2** — v2 supera el piso de v1 | **Parcial** (3,81 % vs 6,95 % — sí mejora pero no alcanza al prior) |
| **H3** — LLM bate al prior en algún landmark | **Falsa** (prior 2,80 % > LLM v2 3,81 %) |

**Conclusión**: el LLM como anotador visual *a ojo* tiene un piso de
precisión que no se cierra con prompt engineering. Lee píxeles por
inspección, no por procesamiento, y falla sistemáticamente en
extremos sutiles (cóndilos L1/L2/L6, mentón L5). La cota de v2
**triplica** la del prior en el peor caso.

## Lecciones que se transfieren

1. **El prior geométrico es difícil de batir** cuando hay info
   tabular limpia disponible (centroides FDI). Cualquier método nuevo
   tiene que demostrarlo explícitamente — punto de partida del exp02.
2. **Pero solo aplica a ~53 % del dataset** — las ~2.300 pantos sin
   FDI quedan fuera del alcance del prior basado en anclas, lo cual
   motiva buscar métodos basados en imagen (exp02, exp04).
3. **El generador de crops con grilla 25 px** y etiquetas absolutas
   se reutilizó luego en exp02 (visualización de debug) y exp04
   (augmentation racional).
4. **Self-check honesto**: el LLM con prompt v2 auto-flageó 4/5 pantos
   como problemáticos. La calibración de la incertidumbre funciona;
   lo que falla es la precisión de la lectura.
5. **Posible error de dataset detectado**: un panto reportado con
   FOV recortado que en GT tiene L3/L4/L5 — anotado para revisión
   manual en `docs/dataset/errores_datos.md`.

## Artefactos

- Plan: [`docs/experimentos/01_landmarks_ia/00_plan.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/01_landmarks_ia/00_plan.md)
- Cierre: [`99_cierre.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/01_landmarks_ia/99_cierre.md)
- Métricas: `metrics_set_B.csv`, `metrics_set_B_llm.csv`, `metrics_set_B_llm_v2_batch.csv`
- Código: `utils/exp01_landmarks/` (predictor + crop generator + scoring)
- Anotaciones por panto: `docs/experimentos/01_landmarks_ia/anotacion_v2/panto_NN_*.md`

[← Volver al anexo](./anexo-experimentos)  ·  [exp02 →](./anexo-exp02-cv)
