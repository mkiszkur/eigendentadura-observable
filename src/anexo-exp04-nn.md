---
title: exp04 — Detector aprendido (SmallUNet)
---

# exp04 — Detector aprendido por heatmap regression

```js
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
import * as d3 from "d3";
```

```js
const holdout  = await FileAttachment("data/anexo/exp04_holdout.json").json();
const ablation = await FileAttachment("data/anexo/exp04_ablation.json").json();
```

[← exp03](./anexo-exp03-preproc)  ·  [↑ Anexo](./anexo-experimentos)

## Pregunta de investigación

Una vez **descartados** los métodos clásicos (exp02/03), ¿una red
neuronal pequeña entrenada sobre el subset de pantos con landmarks
completos supera al prior geométrico para los 7 landmarks, con
mejora reproducible sobre el holdout congelado?

## Hipótesis

- **H1**: NN supera al prior en **mediana** en los 7 landmarks.
- **H2**: NN mejora también el **máximo** (cola dura), no solo la
  mediana.
- **H3**: el detector **generaliza** al universo del corpus
  (verificación delegada a exp05).

## Configuración

### Por qué *heatmap regression* y no regresión directa de (x, y)

Una red neuronal podría intentar predecir directamente las
coordenadas (x, y) de cada landmark. En la práctica, esto entrena
mal porque:

1. La pérdida L2 sobre coordenadas no captura bien la noción de
   "casi acertaste".
2. No produce un **score de confianza** natural por predicción.

La alternativa estándar en localización anatómica es **regresión de
heatmaps**: la red produce, por cada landmark, un canal de salida
del tamaño de la imagen donde un *pico* gaussiano marca dónde cree
que está el landmark. La coordenada se extrae buscando el máximo
del heatmap. Esto:

- Convierte el problema en uno de segmentación denso, mucho más
  estable.
- Provee un **score de confianza** = altura del pico, que después
  se usa en exp05 (columna `conf_min`) para filtrar OOD.
- Permite *soft-argmax* (ver abajo): un argmax diferenciable y
  sub-píxel.

### Arquitectura SmallUNet

U-Net miniatura diseñada a propósito para que entrenara rápido en
CPU/GPU modesta y no se sobreajustara con ~2.5k pantos:

- **Encoder**: 4 bloques de downsampling (convolución 3×3 + ReLU +
  max-pool), base_ch=16 → 32 → 64 → 128.
- **Bottleneck**: 1 bloque de 128 canales.
- **Decoder**: 3 bloques de upsampling con *skip connections* del
  encoder.
- **Cabeza**: convolución 1×1 a 7 canales de salida (un heatmap por
  landmark).
- **Total**: ~1.3 M parámetros (vs 31 M de una U-Net clásica).

### Soft-argmax β=10

Para extraer la coordenada de cada heatmap se usa **soft-argmax**:
en lugar de `argmax` discreto, se calcula

```
x̂ = Σᵢⱼ softmax(β·H)ᵢⱼ · j
ŷ = Σᵢⱼ softmax(β·H)ᵢⱼ · i
```

sobre una ventana 7×7 alrededor del pico. Con β=10, la
distribución softmax queda concentrada pero no degenerada. Ventajas:
**precisión sub-píxel** y diferenciabilidad para futuros refiners.

### TTA (*test-time augmentation*) — descartado

Se evaluó hacer también un *forward pass* sobre la imagen volteada
horizontalmente y promediar las predicciones. Resultado en la
ablación: degrada los `max`. La red aprendió **asimetrías
genuinas** del cohorte (posicionamiento del paciente, lateralidad)
y el flip introduce ruido sistemático.

### Hiperparámetros y splits

| Aspecto | Decisión |
|---|---|
| Arquitectura | SmallUNet (~1.3 M params, base_ch=16) |
| Input | Grayscale 768×384 (downscale bilineal del original) |
| Output | 7 heatmaps gaussianos 384×192 |
| Loss | MSE pixel-wise sobre heatmaps |
| Optimizador | AdamW lr=5e-4, cosine schedule, 50 epochs, early-stop ep 49 |
| Train / val | 2330 / 258 pantos (seed=20260516, GT con `landmarks_complete=True` post-correcciones) |
| Holdout | 140 pantos (eval_set_v3 test, 100 % `T_completa`) |
| Extracción coords | soft-argmax(β=10, ventana 7×7) |
| TTA | Deshabilitado |
| ckpt adoptado | `data/models/exp04/checkpoint_best_v2.pt` (GT limpio con swaps L1↔L2 / L6↔L7 corregidos) |

### v2 vs v1

El ckpt adoptado (**v2**) reentrenó sobre el mismo split con el GT
corregido: ~80 pantos tenían L1/L2 o L6/L7 **swapeados** en el JSON
original (par izquierdo/derecho intercambiado). La corrección se
aplica en memoria al leer vía `lib.json_corrections`, sin reescribir
los JSONs. v2 mejora ~0.10 pp por landmark y elimina ruido
sistemático en los percentiles altos.

## Resultado sobre holdout (n=140)

Las cifras de abajo se calculan sobre **140 pantomografías nunca
vistas por la red** (split holdout, todas `T_completa`). El detector
NN se compara contra el prior geométrico — el mismo baseline que ya
había sobrevivido a exp01, exp02 y exp03.

```js
{
  const meds = holdout.map(d => d.nn_median);
  const minMed = d3.min(meds), maxMed = d3.max(meds);
  const meanDelta = d3.mean(holdout, d => d.delta_pp_median);
  const ratio = d3.mean(holdout, d => d.geom_median / d.nn_median);
  display(kpiGrid([
    {
      label: "Mediana NN — rango",
      value: `${minMed.toFixed(2)}–${maxMed.toFixed(2)} %`,
      sub: "por landmark (vs 1.6–3.6 % Geom)",
      color: "#4c78a8",
      source: "exp04 holdout (n=140)",
      tooltip: "Rango del error relativo mediano del detector NN v2 sobre holdout"
    },
    {
      label: "Mejora vs Geom",
      value: `${meanDelta.toFixed(2)} pp`,
      sub: "promedio de la mejora en mediana",
      color: "#54a24b",
      source: "exp04 holdout",
      tooltip: "Puntos porcentuales de mejora del NN sobre el prior geométrico"
    },
    {
      label: "Ratio Geom / NN",
      value: `${ratio.toFixed(1)}×`,
      sub: "el detector NN es así de mejor en mediana",
      color: "#7b52ab",
      source: "exp04 holdout",
      tooltip: "Factor de mejora del detector NN sobre el prior geométrico"
    },
    {
      label: "Tasa de fallo > 3 %",
      value: `${d3.mean(holdout, d => d.fail_rate_pct).toFixed(2)} %`,
      sub: "promedio entre los 7 landmarks",
      color: "#f58518",
      source: "exp04 holdout",
      tooltip: "Porcentaje de casos con error relativo > 3 % en cada landmark"
    }
  ], {minWidth: "220px"}));
}
```

```js
display(Inputs.table(holdout, {
  columns:["landmark","n","nn_median","nn_p75","nn_p95","nn_max","geom_median","geom_max","delta_pp_median","fail_rate_pct"],
  header:{landmark:"LM", n:"n", nn_median:"NN med %", nn_p75:"NN p75 %", nn_p95:"NN p95 %", nn_max:"NN max %", geom_median:"Geom med %", geom_max:"Geom max %", delta_pp_median:"Δ pp", fail_rate_pct:"% > 3 %"},
  format:{nn_median:d=>d.toFixed(2), nn_p75:d=>d.toFixed(2), nn_p95:d=>d.toFixed(2), nn_max:d=>d.toFixed(2), geom_median:d=>d.toFixed(2), geom_max:d=>d.toFixed(2), delta_pp_median:d=>(d>=0?"+":"")+d.toFixed(2), fail_rate_pct:d=>d.toFixed(1)},
  layout:"auto",
}));
```

```js
{
  const width = 720, height = 360;
  const margin = {top: 30, right: 18, bottom: 38, left: 50};
  const x = d3.scaleBand().domain(holdout.map(d => d.landmark)).range([margin.left, width-margin.right]).padding(0.25);
  const ymax = d3.max(holdout, d => Math.max(d.nn_p95, d.geom_median)) * 1.15;
  const y = d3.scaleLinear().domain([0, Math.max(ymax, 4)]).range([height-margin.bottom, margin.top]);
  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");
  svg.append("text").attr("x", margin.left).attr("y", 14).attr("font-size",11).attr("fill","#666").text("Distribución del error por landmark — NN (azul) vs Geom (verde)");
  svg.append("text").attr("x", margin.left).attr("y", 26).attr("font-size",10).attr("fill","#888").text("Cajas NN: p75/p95 con marca en mediana · Geom: solo mediana");
  svg.append("g").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => d.toFixed(1)+" %"));
  svg.append("line").attr("x1", margin.left).attr("x2", width-margin.right).attr("y1", y(3)).attr("y2", y(3)).attr("stroke","#aaa").attr("stroke-dasharray","3,2");
  svg.append("text").attr("x", width-margin.right).attr("y", y(3)-4).attr("text-anchor","end").attr("font-size",10).attr("fill","#999").text("umbral 3 %");
  for (const d of holdout) {
    const bx = x(d.landmark), bw = x.bandwidth();
    // NN box p75-p95
    svg.append("rect").attr("x", bx + 2).attr("y", y(d.nn_p95)).attr("width", bw*0.55).attr("height", y(d.nn_p75)-y(d.nn_p95)).attr("fill","#4c78a8").attr("opacity",0.35);
    // NN median tick
    svg.append("line").attr("x1", bx+2).attr("x2", bx + bw*0.55 + 2).attr("y1", y(d.nn_median)).attr("y2", y(d.nn_median)).attr("stroke","#4c78a8").attr("stroke-width",2.5);
    // Geom median tick (right half)
    svg.append("line").attr("x1", bx + bw*0.6).attr("x2", bx + bw).attr("y1", y(d.geom_median)).attr("y2", y(d.geom_median)).attr("stroke","#54a24b").attr("stroke-width",2.5);
    svg.append("text").attr("x", bx + bw*0.28).attr("y", y(d.nn_median)-3).attr("text-anchor","middle").attr("font-size",10).attr("fill","#4c78a8").text(d.nn_median.toFixed(2));
    svg.append("text").attr("x", bx + bw*0.8).attr("y", y(d.geom_median)-3).attr("text-anchor","middle").attr("font-size",10).attr("fill","#54a24b").text(d.geom_median.toFixed(2));
  }
  display(svg.node());
}
```

**Cómo leer el gráfico**: una columna por landmark (L1…L7). En cada
columna hay dos elementos:

- **Caja azul** (izquierda): rango entre **p75 y p95** del error NN.
  La línea horizontal azul marca la mediana. Cuanto más baja y
  estrecha, mejor.
- **Línea verde** (derecha): mediana del error del prior geométrico.

La línea punteada gris horizontal es el **umbral operativo (3 %)**.
La mediana NN está siempre por debajo, y muy por debajo de la línea
verde — confirma que el detector aprendido bate al prior en todos
los landmarks con margen amplio.

## Outliers OOD documentados

Sobre el holdout (n=140), un único panto — `3zRuwRiIHHvNQXXC65nA` —
domina los `max` de varios landmarks (L1=67 %, L2=97 %, L7=38 % en
v1; cifras similares en v2). El modelo colapsó 6 de las 7
predicciones cerca del borde inferior de la imagen. Inspección
visual confirma que es un caso **genuinamente OOD**: paciente joven
con desarrollo condilar incompleto y FOV verticalmente comprimido
respecto al training set.

**Decisión**: se documenta y se mantiene en el holdout. Reportar
siempre median + p95 + max conjuntamente. La columna `conf_min`
(min peak del heatmap por panto) lo identifica en runtime — ver
exp05.

## Ablación: TTA × extractor de coordenadas

```js
display(Inputs.table(ablation, {
  columns:["tta","coord","L1_median","L2_median","L6_median","L7_median","L1_max","L7_max"],
  header:{tta:"TTA", coord:"Extractor", L1_median:"L1 med", L2_median:"L2 med", L6_median:"L6 med", L7_median:"L7 med", L1_max:"L1 max", L7_max:"L7 max"},
  format:{L1_median:d=>d?.toFixed(2)+"%", L2_median:d=>d?.toFixed(2)+"%", L6_median:d=>d?.toFixed(2)+"%", L7_median:d=>d?.toFixed(2)+"%", L1_max:d=>d?.toFixed(1)+"%", L7_max:d=>d?.toFixed(1)+"%"},
  layout:"auto",
}));
```

**Conclusiones de la ablación**:

1. **soft-argmax > argmax** en mediana (0.05–0.10 pp en cóndilos),
   costo computacional cero. ✅ adoptado.
2. **TTA con flip horizontal degrada los `max`**: el modelo aprendió
   asimetrías izquierda/derecha intrínsecas a la cohorte
   (lateralidad anatómica, posición del paciente), así que el
   promedio flipeado introduce ruido sistemático. ❌ descartado.

## Veredicto

| Hipótesis | Resultado |
|---|---|
| **H1** — NN supera Geom en mediana en los 7 LM | **Cierta** · 3–13× mejor por landmark |
| **H2** — NN mejora también el max | **Parcial** · sin OOD sí; con OOD no |
| **H3** — generaliza al universo | **Delegada a exp05** |

## Decisión metodológica

1. **Adoptar el detector** como insumo del pipeline para
   normalización por landmarks cuando se requiera procesar pantos
   sin GT humano.
2. El prior Geom queda como **fallback documentado** para auditoría.
3. **Confianza por predicción** (peak del heatmap por landmark,
   agregada como `conf_min`) se persiste como columna del output
   para filtrar OOD en runtime — usado en exp05.
4. **No reentrenar**. Las dos mejoras evaluadas con potencial
   (refiner two-stage = exp06, ensemble = exp07) cerraron negativas;
   el modelo actual queda fijo.

## Artefactos

- Plan: [`docs/experimentos/04_landmarks_nn/00_plan.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/04_landmarks_nn/00_plan.md)
- Cierre: [`99_cierre.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/04_landmarks_nn/99_cierre.md)
- Auditoría v2 GT limpio: [`01_v2_clean_gt.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/04_landmarks_nn/01_v2_clean_gt.md)
- Checkpoint adoptado: `data/models/exp04/checkpoint_best_v2.pt`
- Métricas: 4 CSVs `metrics_holdout_v2_tta-{none,flip}_coord-{argmax,softargmax}.csv`

[← exp03](./anexo-exp03-preproc)  ·  [↑ Anexo](./anexo-experimentos)  ·  [exp05 →](./anexo-exp05-propagacion)
