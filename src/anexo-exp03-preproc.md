---
title: exp03 — CV con preprocesamiento + re-anchor
---

# exp03 — CV con preprocesamiento + re-anchor (n=469)

```js
import * as d3 from "d3";
```

```js
const metrics = await FileAttachment("data/anexo/exp03_metrics.json").json();
const splits  = await FileAttachment("data/anexo/splits.json").json();
```

[← exp02](./anexo-exp02-cv)  ·  [↑ Anexo](./anexo-experimentos)

## Pregunta de investigación

```js
display(htl.html`<p>Con el eval set ampliado a <strong>n=${splits.eval_set_v3.n_total} pantos</strong>
(train ${splits.eval_set_v3.n_train} / test ${splits.eval_set_v3.n_test}),
¿alguna combinación de preprocesamiento de imagen (CLAHE / top-hat /
unsharp masking) y re-anchor de priors a partir de anclas anatómicas
batirá al prior geométrico en L1/L2/L6/L7?</p>`);
```

## Hipótesis

- **H1**: las cifras de exp02 (n=5) se mantienen al escalar a n=469.
- **H2**: re-anchor con regresión Ridge multi-output mejora L1/L2/L6/L7.
- **H3**: preprocesamiento (CLAHE / top-hat / unsharp) mejora los
  detectores CV sobre crops normalizados.
- **H4**: H2+H3 conjuntas alcanzan median ≤ 3.5 %, max ≤ 6 % en L1/L2.

## Material y método

### Por qué n=469 (eval_set_v3)

exp02 reportó sobre solo 5 pantos curadas. Para distinguir mejoras
reales de **ruido de muestra chica**, se construye un eval set
amplio congelado, que pasa a ser el benchmark obligatorio para
cualquier detector futuro.

- **Filtros estrictos**: `total_landmarks==7` (GT completo), FDIs
  presentes en upper_post (17/18/27/28) **y** lower_ant (31/32/41/42)
  para que el prior pueda calcular sus anclas, sin marcas de baja
  calidad en `errores_datos.md`.
- **Split 70/30 estratificado por W·H** (tamaño de imagen): la idea
  es que el mix de resoluciones del test coincida con el del train
  y no haya leakage de tamaño.
- **Congelado**: los IDs quedan en `data/eval_set_v3/manifest.csv`;
  no se vuelven a tocar.

### Variantes de re-anchor

El prior geométrico de exp01 usa centroides FDI como anclas. La
idea aquí es **cambiar las anclas** por puntos potencialmente más
estables y reentrenar el offset estadístico.

- **Variante A** — anclas = mismos centroides FDI (17/18/27/28 para
  cóndilos/eminencias, 31/32/41/42 para mentón) pero recomputando
  el offset por *regresión Ridge multi-output* en lugar de promedio
  simple. La idea: capturar dependencias entre anclas.
- **Variante B** — anclas = **L3/L4/L5 detectados por F1 de exp02**
  (mandíbula). Hipótesis: predecir L1/L2/L6/L7 desde puntos
  anatómicos en la misma imagen es más robusto que extrapolar
  desde dientes que pueden faltar.

### Variantes de preprocesamiento

Tres técnicas estándar aplicadas al crop antes del detector CV:

- **CLAHE** (*Contrast Limited Adaptive Histogram Equalization*).
  Ecualiza el histograma localmente con un *clip limit* para no
  amplificar ruido. Realza contraste donde la panto está oscura.
- **Top-hat morfológico**. Resta de la imagen su apertura
  morfológica → resalta estructuras claras pequeñas sobre fondo
  oscuro. Útil para enfatizar bordes brillantes (eminencias).
- **Unsharp masking**. Resta una versión gaussiana borrosa para
  enfatizar bordes finos. Clásico de imagen médica.

Se evaluó cada técnica sola y todas las combinaciones (8 variantes
por landmark), eligiendo la mejor por mediana sobre el train split.

### Detectores

Los mismos de exp02 (sin cambios): `blob_log + Otsu` para L1/L2,
Otsu directo sobre crop normalizado para L6/L7. El cambio aquí es
el **input** (preprocesado) y la **anchura** (re-anchored), no el
detector mismo.

## Resultado sobre test (n=140)

La tabla muestra, por landmark, la mediana y el máximo de error del
prior, la **mejor variante CV encontrada** (sobre las 8 combinaciones
de preprocesamiento + 2 variantes de re-anchor) y el delta del
re-anchor versus el prior. La última columna resume el veredicto:
quién gana entre prior y CV.

```js
display(Inputs.table(metrics, {
  columns:["landmark","geom_median","geom_max","cv_best_median","reanchor_delta","winner"],
  header:{landmark:"LM", geom_median:"Geom med %", geom_max:"Geom max %", cv_best_median:"Mejor CV med %", reanchor_delta:"Δ re-anchor (pp)", winner:"Veredicto"},
  format:{geom_median:d=>d?.toFixed(2) ?? "–", geom_max:d=>d?.toFixed(2) ?? "–", cv_best_median:d=>d?.toFixed(2) ?? "–", reanchor_delta:d=>d!=null?(d>=0?"+":"")+d.toFixed(2):"–"},
  layout:"auto",
}));
```

```js
{
  const data = metrics.filter(m => ["L1","L2","L6","L7"].includes(m.landmark));
  const width = 600, height = 260;
  const margin = {top: 28, right: 18, bottom: 38, left: 50};
  const x = d3.scaleBand().domain(data.map(d => d.landmark)).range([margin.left, width-margin.right]).padding(0.35);
  const y = d3.scaleLinear().domain([0, 6]).range([height-margin.bottom, margin.top]);
  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");
  svg.append("text").attr("x", margin.left).attr("y", 14).attr("font-size",11).attr("fill","#666").text("Mediana err_rel test split — Geom (verde) vs mejor CV (rojo)");
  svg.append("g").attr("transform", `translate(0,${height-margin.bottom})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => d+" %"));
  for (const d of data) {
    const bx = x(d.landmark);
    const w = x.bandwidth() / 2;
    svg.append("rect").attr("x", bx).attr("y", y(d.geom_median)).attr("width", w).attr("height", height-margin.bottom-y(d.geom_median)).attr("fill","#54a24b").attr("opacity",0.7);
    svg.append("rect").attr("x", bx+w).attr("y", y(d.cv_best_median)).attr("width", w).attr("height", height-margin.bottom-y(d.cv_best_median)).attr("fill","#e15759").attr("opacity",0.7);
    svg.append("text").attr("x", bx + w/2).attr("y", y(d.geom_median)-3).attr("text-anchor","middle").attr("font-size",10).text(d.geom_median.toFixed(2));
    svg.append("text").attr("x", bx + w + w/2).attr("y", y(d.cv_best_median)-3).attr("text-anchor","middle").attr("font-size",10).text(d.cv_best_median.toFixed(2));
  }
  display(svg.node());
}
```

**Cómo leer**: barras agrupadas por landmark (L1, L2, L6, L7 — los
4 que exp02 no había podido cerrar). En verde la mediana de error
del prior geométrico; en rojo la mejor variante CV. **El prior gana
en los 4 landmarks**: la barra verde es más corta. La inversión
respecto a exp02 (donde L6/L7 estaban a favor de CV) es la pieza
central del veredicto.

## Veredicto

| Hipótesis | Resultado |
|---|---|
| **H1** — cifras de exp02 escalan a n=469 | **Falsa parcial** · L3/L4/L5 sí; L6/L7 se invierten (artefacto de n=5) |
| **H2** — re-anchor mejora L1/L2/L6/L7 | **Falsa** · Var A marginal (no generaliza); Var B empeora |
| **H3** — preprocesamiento mejora CV | **Parcial** · mejora L1/L2 (no alcanza Geom), empeora L6/L7 |
| **H4** — H2+H3 alcanza target | **Falsa** · mediana sí (Geom solo ya lo cumple), max no |

**Hallazgo metodológico**: CLAHE ayuda a detectores basados en *forma*
(LoG/blob, que necesitan contraste local marcado) y sabotea a
detectores basados en *umbral* (Otsu, que se desplaza con la
ecualización). El preprocesamiento óptimo es **detector-específico**,
no global — lo que en términos prácticos significa diseñar un
detector nuevo por landmark.

## Por qué la inversión L6/L7 es importante

En exp02 (n=5) el detector CV para L6/L7 reportaba median 1.49 % vs
Geom 4.45 %. En exp03 (n=469) la relación se **invierte**: CV 4.65 %
vs Geom 3.47 %. Esto es un **caso de libro de overfitting al set
de validación**: la cifra de exp02 era un artefacto de muestra chica
con outliers favorables, no una mejora real.

> **Lección operativa**: ningún detector se adopta sin reporte sobre
> el eval set congelado (n=469) o equivalente.

## Conclusión metodológica

El prior geométrico simple ya está **cerca del óptimo data-driven**
en este pipeline clásico para L1/L2/L6/L7. No vale la pena seguir
puliendo detectores CV. **Hay que cambiar de método** → exp04
(detector aprendido por heatmap regression).

## Artefactos

- Plan: [`docs/experimentos/03_landmarks_preproc/00_plan.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/03_landmarks_preproc/00_plan.md)
- Cierre: [`99_cierre.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/03_landmarks_preproc/99_cierre.md)
- Eval set: `data/eval_set_v3/{manifest.csv, gt_landmarks.csv, build_summary.json}`
- Código: `utils/exp03_preproc/{build_eval_set, run_f2_baseline, run_f3*, preproc, run_f4_preproc}.py`
- Métricas: `metrics_{f2_baseline_v3, f3_reanchor, f3b_reanchor_lms, f4_preproc}.csv`

[← exp02](./anexo-exp02-cv)  ·  [↑ Anexo](./anexo-experimentos)  ·  [exp04 →](./anexo-exp04-nn)
