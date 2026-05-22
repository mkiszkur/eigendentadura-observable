---
title: exp11 — Forma del diente como clasificador de tipo (Uso B)
---

# exp11 — Forma del diente como clasificador de tipo (Uso B)

```js
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
import * as d3 from "d3";
```

```js
const exp11  = await FileAttachment("data/anexo/exp11.json").json();
const splits = await FileAttachment("data/anexo/splits.json").json();
```

[← exp05](./anexo-exp05-propagacion)  ·  [↑ Anexo](./anexo-experimentos)

## Pregunta de investigación

¿Cuánta información sobre el **tipo de diente** (8 categorías:
I1, I2, C, P1, P2, M1, M2, M3) está contenida en la **forma cruda
del polígono**, sin usar landmarks, sin información de posición en
la imagen, sin saber a qué arcada pertenece?

Una respuesta cuantitativa permite:

- **Auditoría** del FDI anotado por el odontólogo: dientes cuya
  forma contradice fuertemente su etiqueta son candidatos a error
  sistemático (swaps izq/der, FDI mal asignado).
- **Prior multiplicativo independiente** para la imputación FDI
  por matching Hungarian del exp05 (Uso C): si la forma y la
  posición coinciden, sube la confianza; si disienten, se baja.
- **Cota de cuánta señal hay en el contorno** para futuras
  comparaciones con CNNs sobre crops (Tier 4, fuera del scope).

## Hipótesis y resultados

```js
{
  const rows = exp11.hypotheses;
  display(html`<table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:0.5rem 0 1rem;">
    <thead><tr style="background:#f7f7f7;border-bottom:2px solid #ddd;">
      <th style="padding:8px;text-align:left;">Hip.</th>
      <th style="padding:8px;text-align:left;">Enunciado</th>
      <th style="padding:8px;text-align:right;">Resultado</th>
      <th style="padding:8px;text-align:center;">Estado</th>
      <th style="padding:8px;text-align:left;">Nota</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => html`<tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-family:monospace;font-weight:700;color:${r.passed ? "#2c7a3f" : "#c0392b"};">${r.id}</td>
        <td style="padding:8px;">${r.original}</td>
        <td style="padding:8px;text-align:right;font-family:monospace;">${r.result_pct != null ? r.result_pct.toFixed(2) + " %" : "—"}</td>
        <td style="padding:8px;text-align:center;font-size:1.1rem;">${r.passed ? "✅" : "❌"}</td>
        <td style="padding:8px;color:#555;font-size:0.82rem;">${r.note}</td>
      </tr>`)}
    </tbody>
  </table>`);
}
```

**Lectura**. H1 *original* (≥85 % top-1 sobre 8 tipos) no se
cumple: el techo de la familia "bag of shape features + booster"
está en **79,95 %** (CatBoost v2). Pero el desglose revela que ese
gap no es algorítmico sino **morfológico**: P1 y P2, o M2 y M3, no
difieren significativamente en proyección 2D — los distingue la
**posición en el arco**, no el contorno. H1 se reformula a métricas
por grupo anatómico y top-2 (ambas cumplidas con holgura).

## Material y método

### Splits

```js
display(htl.html`<ul>
  <li><strong>train</strong> — ${exp11.splits.train_n.toLocaleString("es-AR")} dientes
  (todos los pantos del dataset menos val ∪ holdout).</li>
  <li><strong>val</strong> — ${exp11.splits.val_n.toLocaleString("es-AR")} dientes
  (257 pantos del split canónico exp05).</li>
  <li><strong>holdout</strong> — ${exp11.splits.holdout_n.toLocaleString("es-AR")} dientes
  (140 pantos, todos <code>T_completa</code>).</li>
</ul>`);
```

> A diferencia de exp04/exp05, el clasificador de forma **no usa
> landmarks**, así que el train no se restringe al corpus geométrico
> de fitting (2.348 pantos): se aprovecha todo el dataset menos los
> 397 pantos reservados para evaluación. Esto evita perder ~55 % de
> los datos sin justificación.

### Features (rotación-invariantes)

El clasificador trabaja sobre features **rotación-invariantes** del
polígono de cada diente. No conoce la posición del diente en la
imagen, ni a qué arcada (superior / inferior) pertenece, ni a qué
hemiarco (izquierdo / derecho). Es simétrico por construcción —
predice `tipo` ∈ {I1..M3}, no `FDI` completo.

Dos versiones del feature set:

- **v1 (25 features)** — descriptor de forma básico:
  - 8 valores de la **signatura radial simetrizada** (distancia
    centroide → borde, muestreada cada 45°, normalizada por el
    perímetro).
  - 7 **momentos de Hu** (log-signo) — invariantes clásicos a
    traslación, escala y rotación.
  - 5 magnitudes de **armónicos EFD** (Elliptic Fourier
    Descriptors, armónicos 2..6 normalizados por el primero).
  - 3 ratios del **minbbox** (aspect, extent, solidity).
  - 2 features de **tamaño relativo** a la diagonal de la panto
    (`bbox_diag_norm`, `log_perim_norm`).
- **v2 (43 features)** — extensión de v1:
  - EFD ampliado a armónicos 2..12 (vs 2..6 en v1).
  - **Curvatura** (estadísticas de κ(s) muestreada sobre el
    contorno).
  - **Cúspides** detectadas por máximos locales del radio.
  - **Defectos de convexidad** (área y profundidad).
  - **Compactness, roundness, excentricidad** de la elipse de
    inercia.
  - **Asimetría L/R post-PCA** (después de alinear el eje principal).

### Modelos comparados (Tier 1–3)

Tres frentes de mejora sobre el baseline LightGBM v1:

- **Tier 1 — Features**: v1 (25) → v2 (43).
- **Tier 2 — Algoritmo**: LightGBM vs XGBoost vs CatBoost.
- **Tier 3 — Combinaciones**: ensemble por promedio de probas,
  stacking con regresión logística meta, Optuna 30 trials sobre
  LightGBM v2.

Tier 4 (CNN sobre crops del minbbox) y Tier 5 (pseudo /
self-distillation OOF k-fold) se descartaron explícitamente
(justificación al final). Calibración isotónica one-vs-rest fitted
sobre val, idéntica al baseline.

## Tabla comparativa de modelos

```js
{
  const rows = exp11.models;
  display(Inputs.table(rows, {
    columns: ["label", "features", "val_top1", "hold_top1", "hold_top2", "hold_macro_f1", "hold_group", "train_seconds"],
    header: {
      label: "Modelo",
      features: "Feats",
      val_top1: "val top-1",
      hold_top1: "hold top-1",
      hold_top2: "hold top-2",
      hold_macro_f1: "hold macro-F1",
      hold_group: "hold group acc",
      train_seconds: "train (s)",
    },
    format: {
      val_top1:      d => (d*100).toFixed(2) + " %",
      hold_top1:     d => (d*100).toFixed(2) + " %",
      hold_top2:     d => (d*100).toFixed(2) + " %",
      hold_macro_f1: d => d.toFixed(3),
      hold_group:    d => (d*100).toFixed(2) + " %",
      train_seconds: d => d.toFixed(1),
    },
    layout: "auto",
  }));
}
```

**Lectura clave**:

- **Tier 1 (v1 → v2)**: +1,1 pp top-1 con el mismo LightGBM. EFD
  extendido + curvatura + forma agregada contribuyen, pero el
  rendimiento marginal por feature decrece rápido (44 features no
  rinden 1,8× lo que 25).
- **Tier 2 (algoritmo)**: **CatBoost > XGBoost > LightGBM** sobre
  el mismo set v2 (79,95 % vs 79,10 % vs 78,67 % holdout). El gap
  CatBoost − LGBM (~1,3 pp) excede al gap features v1 → v2 (~1,1 pp):
  **el algoritmo importa más que las features extras** en este régimen.
- **Tier 3 (ensembles / stacking)**: no superan al mejor individual
  (CatBoost solo: 79,95 % holdout; stacking sobre {lgbm+xgb+cb +
  Optuna}: 79,77 %). Indica que los tres modelos cometen **errores
  altamente correlacionados** — confusiones intra-grupo que ningún
  meta-modelo lineal puede romper.
- **Optuna (30 trials, ~35 min)** sobre LightGBM: +0,29 pp vs base
  (78,96 vs 78,67 %). ROI claramente negativo vs cambiar de
  algoritmo (CatBoost: 30 s y +1,3 pp). Confirma que **el techo de
  LightGBM en este feature set no es de hiperparámetros**.
- **`class_weight=balanced`**: no mueve la aguja (−0,06 pp). El
  desbalance es leve (5.840 vs 9.000 dientes para la clase más
  chica). Descartado.

## Modelo recomendado: CatBoost v2

```js
{
  const cb = exp11.catboost_holdout;
  display(kpiGrid([
    {
      label: "Top-1 (8 tipos)",
      value: (cb.acc_top1_8*100).toFixed(2) + " %",
      sub: `holdout n=${cb.n.toLocaleString("es-AR")}`,
      color: "#c0392b",
      source: "exp11 Uso B Tier 2",
      tooltip: "CatBoost v2 sobre 43 features de forma rotación-invariantes"
    },
    {
      label: "Top-2 (8 tipos)",
      value: "95,96 %",
      sub: "≥95 % ✓ — H1″ cumplida",
      color: "#54a24b",
      source: "exp11 Uso B Tier 2",
      tooltip: "Accuracy top-2 sobre holdout — cumple hipótesis H1″ reformulada"
    },
    {
      label: "Accuracy por grupo",
      value: (cb.acc_group_4*100).toFixed(2) + " %",
      sub: "4 grupos anatómicos · H1′ ✓",
      color: "#4c78a8",
      source: "exp11 Uso B Tier 2",
      tooltip: "Accuracy sobre 4 grupos anatómicos (incisivos, caninos, premolares, molares)"
    },
    {
      label: "Errores intra-grupo",
      value: cb.pct_intra_of_errors.toFixed(1) + " %",
      sub: `de ${cb.errors_total} errores totales`,
      color: "#7b52ab",
      source: "exp11 Uso B Tier 2",
      tooltip: "Porcentaje de errores que confunden piezas del mismo grupo anatómico"
    }
  ], {minWidth: "220px"}));
}
```

> El modelo persistido vive en
> [`data/exp11/model_catboost_v2.cbm`](https://github.com/mkurno/tesis/blob/main/data/exp11/model_catboost_v2.cbm)
> (no commiteado, 67 MB) y sus probas calibradas en
> [`preds_catboost_v2.npz`](https://github.com/mkurno/tesis/blob/main/data/exp11/preds_catboost_v2.npz).
> Se entrena en ~67 s sobre CPU con el harness
> `python -m utils.exp11_forma_dientes.evaluate_mejoras catboost_v2`.

## Asimetría granularidad: grupo casi perfecto vs tipo limitado

La señal de forma es excelente para **grupo anatómico** y mediocre
para **tipo dentro del grupo**:

```js
{
  const rows = exp11.catboost_holdout.per_group;
  display(Inputs.table(rows, {
    columns: ["grupo", "n", "precision", "recall", "f1", "errores_cross_group", "pct_cross_group"],
    header: {
      grupo: "Grupo",
      n: "n",
      precision: "Precision",
      recall: "Recall",
      f1: "F1",
      errores_cross_group: "Errores cruza-grupo",
      pct_cross_group: "% cruza-grupo",
    },
    format: {
      precision: d => d.toFixed(3),
      recall:    d => d.toFixed(3),
      f1:        d => d.toFixed(3),
      pct_cross_group: d => d.toFixed(2) + " %",
    },
    layout: "auto",
  }));
}
```

**Lecturas**:

- **El molar es prácticamente perfecto como grupo** (F1 0,99,
  1.665/1.680 dientes bien). Premolar e incisivo a ~0,93 / 0,92.
- **El canino es el peor grupo** (F1 0,83): morfológicamente actúa
  como **puente** entre I2 (vecino mesial) y P1 (vecino distal) —
  raíz larga, una cúspide. Es el único grupo con cross-group
  confusion notable (12,9 %).
- Si se eliminaran todas las confusiones intra-grupo se llegaría a
  **~94 % top-1 sobre 8 tipos** — el mismo nivel que la accuracy
  por grupo. El gap respecto a 100 % es **morfológico, no
  algorítmico**.

## Matriz de confusión 8 × 8 (CatBoost v2, holdout)

```js
{
  const cb = exp11.catboost_holdout;
  const CLS = cb.classes_8;
  const cm = cb.confusion_8;
  // Normalizar por fila (recall) para colorear; mostrar conteos.
  const rowSum = cm.map(row => row.reduce((a,b) => a+b, 0));
  const groupOf = {I1:"incisivo", I2:"incisivo", C:"canino", P1:"premolar", P2:"premolar", M1:"molar", M2:"molar", M3:"molar"};
  const width = 720, height = 360;
  const margin = {top: 36, right: 16, bottom: 70, left: 110};
  const cellW = (width - margin.left - margin.right) / 8;
  const cellH = (height - margin.top - margin.bottom) / 8;
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);
  const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("style","max-width:100%;height:auto;font:11px sans-serif;");

  svg.append("text").attr("x", margin.left).attr("y", 14).attr("font-size",12).attr("fill","#444").attr("font-weight","bold").text("Verdadero (filas) × Predicho (columnas) — CatBoost v2 holdout");
  svg.append("text").attr("x", margin.left).attr("y", 28).attr("font-size",10).attr("fill","#888").text("Color: fracción de la fila (recall). Diagonal = aciertos. Cifra = conteo.");

  // headers cols
  for (let j = 0; j < 8; j++) {
    const x = margin.left + j * cellW + cellW/2;
    svg.append("text").attr("x", x).attr("y", margin.top - 6).attr("text-anchor","middle").attr("font-weight","700").attr("fill","#333").text(CLS[j]);
  }
  // headers rows
  for (let i = 0; i < 8; i++) {
    const y = margin.top + i * cellH + cellH/2 + 3;
    svg.append("text").attr("x", margin.left - 6).attr("y", y).attr("text-anchor","end").attr("font-weight","700").attr("fill","#333").text(CLS[i] + " ");
    svg.append("text").attr("x", margin.left - 6).attr("y", y + 11).attr("text-anchor","end").attr("fill","#888").attr("font-size",9).text(`(n=${rowSum[i]})`);
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const v = cm[i][j];
      const frac = rowSum[i] ? v / rowSum[i] : 0;
      const x = margin.left + j * cellW;
      const y = margin.top + i * cellH;
      const same = groupOf[CLS[i]] === groupOf[CLS[j]];
      svg.append("rect")
        .attr("x", x+1).attr("y", y+1)
        .attr("width", cellW-2).attr("height", cellH-2)
        .attr("fill", v === 0 ? "#fafafa" : color(frac))
        .attr("stroke", i === j ? "#2c7a3f" : (same && i !== j ? "#aaa" : "#ddd"))
        .attr("stroke-width", i === j ? 2 : (same && i !== j ? 1 : 0.5));
      const textColor = frac > 0.5 ? "#fff" : (i === j ? "#2c7a3f" : "#222");
      if (v > 0) {
        svg.append("text").attr("x", x + cellW/2).attr("y", y + cellH/2 + 3)
          .attr("text-anchor","middle").attr("font-size",11)
          .attr("font-weight", i === j ? "700" : "400")
          .attr("fill", textColor).text(v);
      }
    }
  }
  // leyenda: bordes
  const lg = svg.append("g").attr("transform", `translate(${margin.left}, ${height - 50})`);
  const items = [
    {color:"#2c7a3f", w:2, label:"diagonal · aciertos"},
    {color:"#aaa",    w:1, label:"intra-grupo · misma macro-clase"},
    {color:"#ddd",    w:0.5, label:"cruza-grupo · cambia macro-clase"},
  ];
  items.forEach((it, k) => {
    const xx = k * 200;
    lg.append("rect").attr("x", xx).attr("y", 0).attr("width", 18).attr("height", 12).attr("fill","#fff").attr("stroke", it.color).attr("stroke-width", it.w);
    lg.append("text").attr("x", xx + 24).attr("y", 10).attr("font-size",10).attr("fill","#444").text(it.label);
  });
  display(svg.node());
}
```

**Cómo leer**:

- **Filas** = clase verdadera, **columnas** = clase predicha por
  CatBoost v2. La diagonal (verde) son aciertos.
- **Color** = recall de la fila (qué fracción de los I1 reales se
  predicen como cada columna). Cuanto más oscuro azul, mayor
  concentración.
- **Borde gris claro** alrededor de celdas off-diagonal **dentro de
  la misma macro-clase** (P1↔P2 son intra-grupo premolar; I1↔I2
  intra-grupo incisivo; M2↔M3 intra-grupo molar). Las confusiones
  con borde gris son las morfológicamente "permitidas".
- **Confusiones cruza-grupo** (sin borde, fondo blanco si v=0):
  son raras y se concentran en I2↔C y P1↔C (el canino como puente
  morfológico).

## Confusiones más frecuentes

```js
{
  const rows = exp11.catboost_holdout.top_confusions.slice(0, 12);
  display(Inputs.table(rows, {
    columns: ["true", "pred", "n", "pct_of_true", "intra_group"],
    header: {
      true: "Real",
      pred: "Predicho",
      n: "n",
      pct_of_true: "% de la clase real",
      intra_group: "Intra-grupo",
    },
    format: {
      pct_of_true: d => d.toFixed(2) + " %",
      intra_group: d => d ? "✓ misma macro" : "✗ cruza grupo",
    },
    layout: "auto",
  }));
}
```

**Lectura**: las cuatro confusiones más frecuentes son **todas
intra-grupo** (P2→P1, P1→P2, M3→M2, M2→M1). Aparecen las primeras
cross-group hacia el medio de la tabla (I2→C, C→I2), todas
involucrando al canino.

## Ablación del tamaño (v1, ¿cuánto aportan las 2 features de tamaño?)

Las features `bbox_diag_norm` y `log_perim_norm` dependen del
**tamaño absoluto** del diente (normalizado por la diagonal de la
imagen, no por landmarks). Quitarlas:

```js
{
  const a = exp11.ablation_size;
  display(html`<table style="width:100%;max-width:560px;border-collapse:collapse;font-size:0.85rem;margin:0.5rem 0 1rem;">
    <thead><tr style="background:#f7f7f7;border-bottom:2px solid #ddd;">
      <th style="padding:8px;text-align:left;">Configuración</th>
      <th style="padding:8px;text-align:right;">Hold top-1</th>
      <th style="padding:8px;text-align:right;">Hold top-2</th>
      <th style="padding:8px;text-align:right;">Hold macro-F1</th>
    </tr></thead>
    <tbody>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;"><strong>with_size</strong> (25 feats v1)</td><td style="padding:8px;text-align:right;font-family:monospace;">${(a.with_size.hold_top1*100).toFixed(1)} %</td><td style="padding:8px;text-align:right;font-family:monospace;">${(a.with_size.hold_top2*100).toFixed(1)} %</td><td style="padding:8px;text-align:right;font-family:monospace;">${a.with_size.hold_macro_f1.toFixed(3)}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">no_size (23 feats)</td><td style="padding:8px;text-align:right;font-family:monospace;">${(a.no_size.hold_top1*100).toFixed(1)} %</td><td style="padding:8px;text-align:right;font-family:monospace;">${(a.no_size.hold_top2*100).toFixed(1)} %</td><td style="padding:8px;text-align:right;font-family:monospace;">${a.no_size.hold_macro_f1.toFixed(3)}</td></tr>
      <tr><td style="padding:8px;color:#666;">Δ (with − no)</td><td style="padding:8px;text-align:right;font-family:monospace;color:#2c7a3f;font-weight:700;">+${((a.with_size.hold_top1 - a.no_size.hold_top1)*100).toFixed(1)} pp</td><td style="padding:8px;text-align:right;font-family:monospace;color:#2c7a3f;">+${((a.with_size.hold_top2 - a.no_size.hold_top2)*100).toFixed(1)} pp</td><td style="padding:8px;text-align:right;font-family:monospace;color:#2c7a3f;">+${(a.with_size.hold_macro_f1 - a.no_size.hold_macro_f1).toFixed(3)}</td></tr>
    </tbody>
  </table>`);
}
```

El tamaño aporta ~4 pp top-1. Es una señal real, **no leakage de
landmarks** (ningún feature usa la pose normalizada `*_lm`;
`bbox_diag_norm` solo depende del minbbox y de W·H del JPG).
Refuerza el hallazgo de **exp18** (PC1 = tamaño) y muestra que el
tamaño es **necesario pero no suficiente** para tipar dientes: con
solo forma sin tamaño todavía sale ~74 %.

## Por qué no se cierra el gap con CNN

Tier 4 (CNN sobre crops del minbbox) se descarta en esta iteración
con dos argumentos concretos:

1. **ROI esperado modesto**: el gap actual vs H1 original (~5 pp)
   es **consistente con confusiones morfológicas reales** (I1↔I2 son
   literalmente vecinos morfológicos en proyección 2D; el odontólogo
   humano también los confunde en pantos sin contexto posicional).
   Una CNN ayudaría con texturas y raíces pero no rompería la
   ambigüedad estructural.
2. **Costo-beneficio**: entrenar y validar una CNN multiclase sobre
   crops requiere horas-GPU y agrega dependencia de toolchain. El
   gap intra-grupo se resuelve **gratis** vía Uso C (prior
   posicional FDI del exp05), que es exactamente lo que el matching
   Hungarian ya provee.

## Conexión con exp05 (Uso C — pendiente)

El destino natural de las probas calibradas de CatBoost v2 es
servir de **prior multiplicativo** en el costo del matching
Hungarian del exp05:

```
score_combinado = α · NLL_posición_LM + (1−α) · (−log p_forma)
```

con `p_forma` = probabilidad calibrada del tipo predicho por
CatBoost. La discriminación al nivel de tipo dentro del grupo
—que el clasificador de forma **no** resuelve— se cierra gracias a
la información posicional (`*_lm`), que es exactamente la señal
que distingue P1 de P2 o M2 de M3.

El cierre formal del Uso C queda como **trabajo pendiente** en
[`temas_pendientes.md`](https://github.com/mkurno/tesis/blob/main/docs/planificacion/temas_pendientes.md).

## Conclusión

- **Modelo recomendado para downstream**: CatBoost v2 (79,95 %
  top-1, 95,96 % top-2, 93,72 % accuracy por grupo, 67 s de
  training en CPU).
- **H1 original (≥85 % top-1) no se cumple**: techo morfológico,
  no algorítmico — confirmado por ensembles/stacking que no aportan
  y por Optuna que solo arrima +0,3 pp con 35 min de cómputo.
- **H1 reformulada en términos de grupo + top-2 se cumple con
  holgura** (93,72 % / 95,96 %): la forma sola alcanza para tipar
  **grupo anatómico** con calidad clínica útil.
- **El próximo paso es Uso C** (forma como prior multiplicativo
  sobre el matching posicional del exp05), no más capacidad de
  modelo. El gap intra-grupo se cierra con información posicional.

## Artefactos

- Plan: [`docs/experimentos/11_forma_dientes/00_plan.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/11_forma_dientes/00_plan.md)
- Cierre baseline (F2): [`02_uso_B_resultados.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/11_forma_dientes/02_uso_B_resultados.md)
- Cierre iteración (Tier 1–3): [`03_uso_B_mejoras.md`](https://github.com/mkurno/tesis/blob/main/docs/experimentos/11_forma_dientes/03_uso_B_mejoras.md)
- Harness reproducible: [`utils/exp11_forma_dientes/evaluate_mejoras.py`](https://github.com/mkurno/tesis/blob/main/utils/exp11_forma_dientes/evaluate_mejoras.py)
- Features v2: [`utils/exp11_forma_dientes/build_dataset_v2.py`](https://github.com/mkurno/tesis/blob/main/utils/exp11_forma_dientes/build_dataset_v2.py)
- Modelo adoptado (no commiteado, 67 MB): `data/exp11/model_catboost_v2.cbm`
- Probas calibradas: `data/exp11/preds_catboost_v2.npz` (`pv_cal`, `ph_cal`)
- Métricas completas: [`data/exp11/mejoras_results.json`](https://github.com/mkurno/tesis/blob/main/data/exp11/mejoras_results.json)

[← exp05](./anexo-exp05-propagacion)  ·  [↑ Anexo](./anexo-experimentos)
