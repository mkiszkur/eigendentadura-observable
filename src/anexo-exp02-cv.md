---
title: exp02 — Landmarks por CV híbrida
---

# exp02 — Landmarks por CV híbrida (blob_log + Otsu)

```js
import * as d3 from "d3";
```

```js
const metrics = await FileAttachment("data/anexo/exp02_metrics.json").json();
```

[← exp01](./anexo-exp01-llm)  ·  [↑ Anexo](./anexo-experimentos)

## Pregunta de investigación

¿Detectores clásicos de visión por computador (segmentación + extracción
de extremo) pueden superar al prior geométrico para los 7 landmarks,
landmark por landmark?

## Hipótesis

- **H1**: CV puro supera Geom para los 7 landmarks.
- **H2**: la mayoría (≥4/7) se resuelve sin necesidad de un LLM
  adjudicador.
- **H3**: CV + LLM como adjudicador supera definitivamente al
  baseline geométrico.

## Material y método

### Por qué CV clásica

exp01 cerró negativo (LLM pierde contra el prior). El paso lógico es
probar si **detectores tradicionales de visión por computador**
—diseñados a mano usando propiedades de la imagen (gradientes,
umbrales, formas locales)— alcanzan al prior. Son rápidos,
deterministas y no requieren entrenamiento.

### Set B

Las mismas 5 pantos curadas a mano de exp01 (n=35 mediciones).
Reusarlas permite comparar directo contra LLM y prior, pero arrastra
la limitación de muestra chica que después rompe exp03.

### F1 — mandíbula (L3, L4, L5)

**L3/L4/L5** son tres puntos sobre el borde inferior de la mandíbula
(los dos laterales y el medio). La mandíbula es el objeto más
brillante y homogéneo en una pantomografía (hueso denso bien
contrastado contra fondo oscuro).

**Pipeline F1**:

1. **Segmentación por threshold adaptativo**: binariza la imagen
   ajustando el umbral localmente, separando hueso de tejido blando.
2. **Mayor componente conectada** de la mitad inferior del frame:
   se queda con la silueta de la mandíbula.
3. **Extracción de mínimos locales** del contorno inferior →
   candidatos a L3 y L4 (los dos puntos más bajos a izquierda y
   derecha del centro) y L5 (el mínimo central).

Este pipeline funciona bien porque la mandíbula tiene **bordes
nítidos y forma estable** entre pacientes.

### F2 — cóndilos y eminencias (L1, L2, L6, L7)

**Cóndilos** (L1/L2) son las cabezas redondeadas del extremo superior
de la mandíbula; **eminencias articulares** (L6/L7) son los relieves
de la base del cráneo que reciben a los cóndilos. Son estructuras
mucho más sutiles que la mandíbula: bordes difusos, contraste local
bajo, y el FOV de la panto los recorta con frecuencia.

**Pipeline F2**:

1. **`blob_log` (Laplacian-of-Gaussian)**: detector clásico de
   "manchas" — busca regiones aproximadamente circulares con
   contraste local. Se aplica sobre un crop alrededor del prior
   geométrico para evitar falsos positivos en otras zonas.
2. **Otsu local** en ventana estrecha: refina la silueta del blob
   detectado por LoG.
3. **Extracción de extremo**:
   - Cóndilos (L1/L2): se queda con el punto **más lateral en X**
     dentro del blob.
   - Eminencias (L6/L7): se queda con el `argmax(y)` (punto más
     superior).

### Criterio operativo

- **Mediana** del error relativo ≤ 3 % por landmark.
- **Máximo** ≤ 5 % por landmark.

Un detector "supera" al prior cuando bate **ambas** cotas y mejora
en mediana.

## Resultado por landmark

**Cómo leer el gráfico**: una fila por landmark (L1…L7). Para cada
uno hay dos barras superpuestas mostrando la **mediana del error
relativo**: arriba en azul el detector CV elegido (F1 o F2), abajo
en gris el prior geométrico de exp01. Cuanto más corta la barra,
mejor; **objetivo: por debajo del 3 %** (línea punteada vertical).
El azul intenso indica los landmarks donde CV gana al prior; el
azul claro, donde pierde.

```js
{
  const width = 720;
  const rowH = 36;
  const margin = {top: 30, right: 20, bottom: 30, left: 60};
  const x = d3.scaleLinear().domain([0, 12]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(metrics.map(r => r.landmark)).range([margin.top, margin.top + metrics.length * rowH]).paddingInner(0.25);
  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${margin.top + metrics.length * rowH + margin.bottom}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");
  svg.append("g").attr("transform", `translate(0,${margin.top + metrics.length * rowH})`).call(d3.axisBottom(x).tickFormat(d => d + " %"));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
  // Header
  svg.append("text").attr("x", margin.left).attr("y", 14).attr("font-size",11).attr("fill","#666").text("Mediana err_rel por método y landmark · CV (azul) vs Geom (gris)");
  svg.append("text").attr("x", margin.left).attr("y", 26).attr("font-size",10).attr("fill","#888").text("Umbral operativo: 3 % (línea punteada vertical)");
  // Threshold
  svg.append("line").attr("x1", x(3)).attr("x2", x(3)).attr("y1", margin.top).attr("y2", margin.top + metrics.length * rowH).attr("stroke","#aaa").attr("stroke-dasharray","3,2");

  for (const r of metrics) {
    const yb = y(r.landmark);
    const h = y.bandwidth() / 2.2;
    if (r.cv_median != null) {
      svg.append("rect").attr("x", margin.left).attr("y", yb).attr("width", x(r.cv_median) - margin.left).attr("height", h).attr("fill","#4c78a8").attr("opacity", r.cv_median <= r.geom_median ? 0.85 : 0.45);
      svg.append("text").attr("x", x(r.cv_median) + 4).attr("y", yb + h - 2).attr("font-size",10).attr("fill","#333").text(`CV ${r.cv_median.toFixed(2)}%`);
    }
    if (r.geom_median != null) {
      svg.append("rect").attr("x", margin.left).attr("y", yb + h + 2).attr("width", x(r.geom_median) - margin.left).attr("height", h).attr("fill","#888").attr("opacity", 0.55);
      svg.append("text").attr("x", x(r.geom_median) + 4).attr("y", yb + 2*h - 2).attr("font-size",10).attr("fill","#333").text(`Geom ${r.geom_median.toFixed(2)}%`);
    }
  }
  display(svg.node());
}
```

```js
display(Inputs.table(metrics, {
  columns: ["landmark","method","cv_median","cv_max","geom_median","geom_max","verdict"],
  header: {landmark:"LM", method:"Método elegido", cv_median:"CV med %", cv_max:"CV max %", geom_median:"Geom med %", geom_max:"Geom max %", verdict:"Veredicto"},
  format: {cv_median: d => d?.toFixed(2) ?? "–", cv_max: d => d?.toFixed(2) ?? "–", geom_median: d => d?.toFixed(2) ?? "–", geom_max: d => d?.toFixed(2) ?? "–"},
  layout:"auto",
}));
```

## Veredicto

| Hipótesis | Resultado |
|---|---|
| **H1** — CV supera Geom para los 7 LM | **Parcialmente cierta** · cierta para L3/L4/L5/L6/L7; **falsa** para L1/L2 |
| **H2** — ≥4/7 sin LLM | **Cierta** · 5/7 |
| **H3** — CV + LLM supera Geom | **No testeada** · F4 no ejecutado, queda diferido |

**Mediana agregada** del pipeline mixto: 1,79 % vs Geom 2,93 % vs
LLM v2 3,81 %. Pero el **max** sube a 10,92 % por un outlier (panto
LMCZyn) que requiere fallback no implementado.

## Limitaciones explícitas

- **n=5 pantos**: insuficiente para distinguir si LMCZyn es un
  outlier estadísticamente normal o representativo de una
  sub-población anómala (cráneo posicionado alto).
- **Sin noise floor inter-anotador**: no sabemos el techo alcanzable.
- **Sin fallback implementado**: el plan "CV→Geom cuando
  `dist(CV, prior) > umbral`" quedó descrito pero no evaluado.
- **L1/L2 sin solución**: `blob_log + Otsu` no separa el cóndilo
  lateral del fondo en zonas oscuras del FOV.

## Transferencia a exp03

Este experimento traslada **dos preguntas abiertas** al siguiente:

1. ¿CLAHE/top-hat/unsharp mejoran la detección de L1/L2 al
   homogeneizar contraste local del cóndilo?
2. ¿Re-anchorar L1/L2/L6/L7 a partir de anclas anatómicas mejores
   (L3/L4/L5 detectados por F1, o centroides FDI) cierra el gap?

Y mantiene un **benchmark fijo** (eval_set_v3, n=469) para que
cualquier mejora futura tenga que reportar lo mismo.

## Artefactos

- Plan: [`docs/experimentos/02_landmarks_cv_hybrid/00_plan.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/02_landmarks_cv_hybrid/00_plan.md)
- Cierre: [`99_cierre.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/02_landmarks_cv_hybrid/99_cierre.md)
- Código: `utils/exp02_landmarks/{segment.py, extract_extremum.py, run_f*.py}`
- Métricas: `metrics_f1_mandible.csv`, `metrics_f2_condyles.csv`
- Debug visual: `debug/<panto>/{f1_mandible.png, f2_l*.png}`

[← exp01](./anexo-exp01-llm)  ·  [↑ Anexo](./anexo-experimentos)  ·  [exp03 →](./anexo-exp03-preproc)
