---
title: Anexo · Experimentos metodológicos
---

# Anexo · Experimentos metodológicos

```js
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
import * as d3 from "d3";
```

```js
const index    = await FileAttachment("data/anexo/index.json").json();
const splits   = await FileAttachment("data/anexo/splits.json").json();
const coverage = await FileAttachment("data/anexo/corpus_coverage.json").json();
```

> Anexo orientado a la **dirección de tesis**. Cinco experimentos
> metodológicos sobre detección de landmarks anatómicos y propagación
> de su error a las herramientas centrales de la tesis (eigendentadura
> e imputación FDI). El cuerpo de la tesis se concentra en los hallazgos
> exploratorios (capítulos 5–11); este anexo documenta el **proceso de
> validación instrumental** que los soporta.

## Contexto mínimo para leer el anexo

**Qué son los 7 landmarks anatómicos** (L1–L7). Puntos de referencia
que marcan la geometría del cráneo en una panorámica:

- **L1, L2** — cóndilos mandibulares (par izquierdo y derecho). Definen
  el eje intercondilar, que se usa para **normalizar** todas las pantos
  a una misma escala y orientación.
- **L3, L4** — bórdes laterales del mentón.
- **L5** — punto medio del mentón.
- **L6, L7** — eminencias articulares (encima de los cóndilos).

**Por qué los necesitamos**. Dos herramientas centrales de la tesis
dependen de tener los 7 landmarks confiables:

1. **Eigendentadura** (cap. 7). PCA sobre ~96 features = 32 dientes ×
   {cx, cy, ángulo} *después* de normalizar con los landmarks (trasladar
   al midpoint condilar, rotar por el eje intercondilar, escalar por la
   distancia intercondilar). Sin landmarks, las posiciones de los dientes
   no son comparables entre pacientes.
2. **Imputación FDI** (cap. 10). Asignar a cada diente su número ISO
   3950 (11–48) cuando el odontólogo no lo anotó, usando densidades
   gaussianas por FDI en el frame normalizado por landmarks.

**El problema**: ~46 % del corpus no tiene landmarks anotados por
humanos. Los cinco experimentos del anexo construyen y validan un
detector que los predice automáticamente, y miden cuánto se degradan
esas dos herramientas al usar predicciones en lugar de GT humano.

## Hilo conductor

El recorrido va de menos a más sofisticado, descartando hipótesis a medida
que se acumula evidencia. Cada experimento parte de la pregunta abierta
que dejó el anterior:

- **exp01** prueba la opción más barata: pedirle los landmarks a un LLM
  visual. Pierde contra un prior geométrico muy simple (sin imagen).
- **exp02** prueba métodos clásicos de visión por computador sobre 5
  pantos curadas. Mejora 5/7 landmarks pero falla en cóndilos (L1/L2).
- **exp03** amplía el eval set a 469 pantos: las mejoras de exp02 se
  derrumban (artefacto de n=5). Conclusión: los métodos clásicos están
  estancados, hay que cambiar de paradigma.
- **exp04** entrena una red neuronal pequeña (heatmap regression) sobre
  ~2.5k pantos con GT. Bate al prior 3–13× en mediana sobre el holdout.
  Es el detector adoptado.
- **exp05** mide el costo de usar el detector en lugar de GT humano
  para las dos herramientas centrales (eigendentadura e imputación FDI).

```js
{
  const items = index.map((e, i) => ({...e, i}));
  display(html`<ol style="list-style:none;padding-left:0;margin:1.5rem 0;display:flex;flex-direction:column;gap:0.6rem;">
    ${items.map(e => html`
      <li style="display:grid;grid-template-columns:auto auto 1fr auto;gap:14px;align-items:center;padding:10px 14px;border-left:4px solid ${e.status_color};background:${e.status_color}10;border-radius:4px;">
        <span style="font-family:monospace;font-size:0.78rem;color:#888;">exp${String(e.num).padStart(2,"0")}</span>
        <a href="./anexo-${e.slug}" style="font-weight:700;color:#222;text-decoration:none;">${e.title}</a>
        <span style="font-size:0.78rem;color:#666;line-height:1.35;">${e.question}</span>
        <span style="font-size:0.7rem;color:${e.status_color};font-weight:600;white-space:nowrap;">${e.status_label}</span>
      </li>
    `)}
  </ol>`);
}
```

## Por qué este recorrido importa

**Casi la mitad del corpus** carece de landmarks GT. Sin un detector
confiable, esos pantos quedan fuera de la eigendentadura, la
normalización por landmarks y la imputación FDI — es decir, fuera de
las tres herramientas analíticas principales de la tesis. Las KPI de
abajo cuantifican la magnitud del problema:

```js
display(kpiGrid([
  {
    label: "Pantos en el corpus",
    value: coverage.n_pantos_total.toLocaleString("es-AR"),
    sub: "JSONs anotados (universo total)",
    color: "#4c78a8",
    source: "stage_02_pantos_processed.py",
    tooltip: "Universo total de pantomografías anotadas"
  },
  {
    label: "Con landmarks completos",
    value: coverage.n_landmarks_complete.toLocaleString("es-AR"),
    sub: "pantos con GT humano de L1–L7",
    color: "#54a24b",
    source: "stage_02_pantos_processed.py",
    tooltip: "Pantomografías con 7 landmarks condíleos anotados manualmente"
  },
  {
    label: "Sin landmarks completos",
    value: coverage.n_landmarks_missing.toLocaleString("es-AR"),
    sub: `${coverage.pct_missing} % del corpus — necesitan imputación`,
    color: "#e15759",
    tooltip: "Pantos sin landmarks completos que requieren predicción NN"
  },
  {
    label: "Predicciones NN persistidas",
    value: coverage.n_corpus_predicted.toLocaleString("es-AR"),
    sub: "exp05 ckpt v2 sobre todos los pantos",
    color: "#7b52ab",
    source: "exp05 v2",
    tooltip: "Predicciones del detector NN v2 sobre todo el corpus"
  }
], {minWidth: "220px"}));
```

```js
display(htl.html`<p><strong>Casi la mitad del corpus</strong> (${coverage.pct_missing} %) carece de
landmarks anotados por humanos. Sin un detector confiable o un prior
robusto, esos pantos quedan fuera de la eigendentadura, la
normalización por landmarks y la imputación FDI. Los cinco
experimentos del anexo construyen y validan ese detector.</p>`);
```

## Conjuntos de validación

Tres conjuntos distintos de pantomografías se usan a lo largo del
anexo, cada uno con un rol diferente. Es importante distinguirlos
porque las cifras de cada experimento se reportan sobre uno u otro:

```js
{
  const blocks = [
    ["exp05_universe", splits.exp05_universe, "#4c78a8"],
    ["eval_set_v3",    splits.eval_set_v3,    "#7b52ab"],
    ["exp01_setB",     splits.exp01_setB,     "#f58518"],
  ];
  display(html`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:1.1rem;margin:0.8rem 0;">
    ${blocks.map(([key, b, color]) => html`
      <div style="border:1px solid ${color}55;border-radius:6px;padding:0.95rem 1.1rem;background:${color}08;">
        <div style="font-size:0.75rem;color:${color};text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:6px;">${b.label}</div>
        <div style="font-size:0.82rem;color:#555;line-height:1.45;margin-bottom:8px;">${b.description}</div>
        <div style="font-family:monospace;font-size:0.78rem;color:#333;">
          ${Object.entries(b).filter(([k]) => k.startsWith("n_")).map(([k, v]) => html`<div>${k} = <b>${v.toLocaleString("es-AR")}</b></div>`)}
        </div>
      </div>
    `)}
  </div>`);
}
```

> **Política de splits**: los corpus de fitting de exp04 (entrenamiento)
> y de las estadísticas `tooth_stats_lm` (eigendentadura, imputación
> FDI) **excluyen** val ∪ holdout. Las cifras reportadas en cada
> experimento se calculan sobre val (257 pantos) y, cuando importa la
> generalización a casos "limpios", sobre holdout (140 pantos, 100 %
> `T_completa`).

## Métrica común a todo el anexo

La precisión de un landmark predicho se reporta siempre como **error
relativo a la distancia intercondilar GT**:

```
err_rel = ‖ p̂ − p_GT ‖ / d_intercondilar_GT
```

Esto normaliza por el tamaño del cráneo (las pantos vienen en
tamaños distintos según el equipo y el paciente) y hace los errores
comparables entre pacientes. Para una panto típica, **1 %** de
`err_rel` corresponde a ~1 mm. **Umbral operativo de éxito**:
mediana ≤ 3 % y máximo ≤ 5 % por landmark, fijado en el plan
original.

## Lectura recomendada

| Si querés revisar... | Página |
|---|---|
| Por qué un LLM multimodal no alcanza al prior geométrico | [exp01 — LLM visual](./anexo-exp01-llm) |
| Por qué métodos clásicos de CV no superan al prior en L1/L2 | [exp02 — CV híbrida](./anexo-exp02-cv) y [exp03 — preprocesamiento + n=469](./anexo-exp03-preproc) |
| El detector final adoptado y su margen sobre el baseline | [exp04 — SmallUNet (NN)](./anexo-exp04-nn) |
| **Cómo afecta el detector a la eigendentadura y a la imputación FDI** | [exp05 — propagación + imputación](./anexo-exp05-propagacion) |

## Trazabilidad

Cada experimento tiene su carpeta en `docs/experimentos/NN_<slug>/`
con plan inicial (`00_plan.md`), cierres parciales y cierre final
(`99_cierre.md`). El código vive en `utils/expNN_<slug>/` y los outputs
en `data/expNN/` o, cuando corresponde, en `data/exp05/` (re-uso entre
experimentos). Esta página resume cada cierre con sus números
exactos y links cruzados.
