---
title: Resumen ejecutivo
---

# Resumen ejecutivo

```js
import * as d3 from "d3";
import {kpiCard, kpiGrid} from "./components/kpi-card.js";
```

```js
const ds             = await FileAttachment("data/dataset_stats.json").json();
const metadata       = await FileAttachment("data/metadata.json").json();
const symmetryData   = await FileAttachment("data/symmetry_pairs.json").json();
const occlusionData  = await FileAttachment("data/occlusion.json").json();
const prevalenceData = await FileAttachment("data/prevalence_by_tooth.json").json();
```

```js
const nWithPath  = ds.pantos.filter(p => p["Patología"]).length;
const nWithTreat = ds.pantos.filter(p => p["Tratamiento"]).length;
const nTotal     = ds.pantos.length;
const totalDientes = d3.sum(prevalenceData.teeth, t => t.n_present);
const totalFlags = d3.sum(ds.pantos, p => d3.sum(ds.flag_labels, k => p[k] ?? 0));
const totalRestauraciones = d3.sum(prevalenceData.teeth, t => t["Restauración"]?.count ?? 0);
const symMedian = d3.median(symmetryData.pairs, p => p.stats.distance.median);
const worstPair = symmetryData.pairs.reduce((a, b) => b.stats.distance.median > a.stats.distance.median ? b : a);
```

## Universo de análisis

Cómo se construye el dataset a partir de los JSONs crudos hasta los universos usados en cada sección del análisis.

```js
{
  const COLORS = ["#4c78a8", "#4e8c9e", "#54a24b", "#7b52ab"];
  display(html`<div style="display:flex; align-items:flex-end; gap:0; margin:1rem 0 3.5rem; flex-wrap:nowrap; overflow-x:auto;">
    ${ds.funnel.map((step, i) => html`
      ${i > 0 ? html`<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; padding:0 0.7rem 1.2rem; text-align:center; min-width:fit-content; align-self:center;">
        ${step.excluded ? html`<div style="font-size:0.68rem; color:#e15759; white-space:nowrap; font-weight:600;">−${step.excluded.toLocaleString("es-AR")}</div>` : ""}
        <div style="color:#bbb; font-size:1.5rem; line-height:1.2;">→</div>
        ${step.excluded ? html`<div style="font-size:0.63rem; color:#aaa; white-space:nowrap; max-width:90px; text-align:center; line-height:1.2;">${step.excluded_label}</div>` : ""}
      </div>` : ""}
      <div style="background:${COLORS[i]}18; border:1px solid ${COLORS[i]}55; border-radius:6px; padding:1rem 1.2rem; min-width:140px; flex:1 1 140px;">
        <div style="font-size:0.65rem; color:#777; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; line-height:1.3;">${step.label}</div>
        <div style="font-size:1.9rem; font-weight:700; color:${COLORS[i]}; line-height:1;">${step.n.toLocaleString("es-AR")}</div>
      </div>
    `)}
  </div>`);
}
```

## El dataset

### Pantomografías

```js
{
  const f = ds.funnel;
  display(kpiGrid([
    { 
      label: "JSONs en la base", 
      value: f[0].n.toLocaleString("es-AR"), 
      sub: "archivos de pantomografía", 
      color: "#4c78a8",
      source: "stage_00_fix_jsons.py",
      tooltip: "Todos los archivos JSON en data/json/"
    },
    { 
      label: "Con anotaciones", 
      value: f[1].n.toLocaleString("es-AR"), 
      sub: "al menos un hallazgo registrado", 
      color: "#4e8c9e",
      source: "stage_01_pantos_raw.py",
      tooltip: "Pantos con al menos un shape anotado"
    },
    { 
      label: "Con FDI permanente", 
      value: f[2].n.toLocaleString("es-AR"), 
      sub: "universo epidemiológico", 
      color: "#54a24b",
      source: "stage_02_pantos_processed.py",
      tooltip: "Universo epidemiológico (prevalencias de patologías)"
    },
    { 
      label: "Con landmarks condíleos", 
      value: f[3].n.toLocaleString("es-AR"), 
      sub: "universo eigendentadura/geometría", 
      color: "#7b52ab",
      source: "stage_02_pantos_processed.py",
      tooltip: "Universo geométrico (7 landmarks L1-L7 completos)"
    },
    { 
      label: "Centros clínicos", 
      value: "2", 
      sub: "Centro A y Centro B", 
      color: "#f58518",
      tooltip: "Dos centros de anotación independientes"
    },
  ]));
}
```

### Anotaciones

```js
display(kpiGrid([
  { 
    label: "Anotaciones totales", 
    value: "~476k", 
    sub: "shapes, landmarks y entidades clínicas", 
    color: "#f58518",
    source: "stage_03_shapes_processed.py",
    tooltip: "Shapes totales en data/csv/shapes.csv"
  },
  { 
    label: "Dientes anotados", 
    value: totalDientes.toLocaleString("es-AR"), 
    sub: "presencias FDI en pantomografías", 
    color: "#7b52ab",
    source: "stage_04_prevalence.py",
    tooltip: "Presencias FDI permanentes anotadas por revisores"
  },
  { 
    label: "Con geometría", 
    value: metadata.total_teeth.toLocaleString("es-AR"), 
    sub: "centroides normalizados por landmarks", 
    color: "#b07aa1",
    source: "stage_21_tooth_stats_lm.py",
    tooltip: "Dientes con coordenadas landmark-normalized"
  },
]));
```

### Hallazgos clínicos

```js
display(kpiGrid([
  { 
    label: "Flags totales", 
    value: totalFlags.toLocaleString("es-AR"), 
    sub: "hallazgos registrados a nivel diente", 
    color: "#e45756",
    source: "stage_04_prevalence.py",
    tooltip: "Suma de hallazgos clínicos a nivel diente en el dataset"
  },
  { 
    label: "Tipos de hallazgo", 
    value: ds.flag_labels.length.toString(), 
    sub: "patologías y tratamientos distintos", 
    color: "#e45756",
    source: "stage_04_prevalence.py",
    tooltip: "Patologías y tratamientos distintos anotados"
  },
  { 
    label: "Con patología activa", 
    value: nWithPath.toLocaleString("es-AR"), 
    sub: `de ${nTotal.toLocaleString("es-AR")} pantos con geometría`, 
    color: "#c0392b",
    source: "stage_04_prevalence.py",
    tooltip: "Pantos con al menos una patología activa registrada"
  },
  { 
    label: "Con tratamiento", 
    value: nWithTreat.toLocaleString("es-AR"), 
    sub: "restauraciones, endodoncias, implantes", 
    color: "#f58518",
    source: "stage_04_prevalence.py",
    tooltip: "Pantos con restauraciones, endodoncias o implantes"
  },
  { 
    label: "Restauraciones", 
    value: totalRestauraciones.toLocaleString("es-AR"), 
    sub: "el hallazgo más prevalente", 
    color: "#59a14f",
    source: "stage_04_prevalence.py",
    tooltip: "Hallazgo más prevalente en el dataset"
  },
]));
```

## Geometría dental

```js
display(kpiGrid([
  { 
    label: "Eigendentadura", 
    value: metadata.unique_pantos.toLocaleString("es-AR"), 
    sub: "pantos con forma media calculada", 
    color: "#7b52ab",
    source: "stage_21_tooth_stats_lm.py",
    tooltip: "Dentadura media con landmarks condíleos completos"
  },
  { 
    label: "Forma de arcada", 
    value: "Cuadrada", 
    sub: "ratio profundidad/ancho < 0.70", 
    color: "#54a24b",
    source: "exp30_clustering_curva_maxilar",
    tooltip: "Ratio profundidad/ancho < 0,70 según ajuste de arcada"
  },
  { 
    label: "Simetría bilateral", 
    value: symMedian.toFixed(3), 
    sub: "distancia mediana entre pares homólogos", 
    color: "#f58518",
    source: "stage_22_symmetry_pairs.py",
    tooltip: "Distancia mediana entre pares homólogos en coordenadas LM"
  },
  { 
    label: "Par menos simétrico", 
    value: `${worstPair.fdi_r}↔${worstPair.fdi_l}`, 
    sub: `mediana: ${worstPair.stats.distance.median.toFixed(3)}`, 
    color: "#e45756",
    source: "stage_22_symmetry_pairs.py",
    tooltip: "Par con mayor distancia mediana entre homólogos"
  },
]));
```

## Oclusión (proxy poblacional)

<small>Diferencia de centroides de incisivos centrales en coordenadas landmark-normalized, no en milímetros clínicos.</small>

```js
display(kpiGrid([
  { 
    label: "Overjet (mediana)", 
    value: occlusionData.stats.overjet.median.toFixed(3), 
    sub: `IQR [${occlusionData.stats.overjet.q1.toFixed(3)}, ${occlusionData.stats.overjet.q3.toFixed(3)}]`, 
    color: "#4c78a8",
    source: "stage_23_occlusion.py",
    tooltip: "Proxy poblacional desde centroides de incisivos centrales"
  },
  { 
    label: "Overbite (mediana)", 
    value: occlusionData.stats.overbite.median.toFixed(3), 
    sub: `IQR [${occlusionData.stats.overbite.q1.toFixed(3)}, ${occlusionData.stats.overbite.q3.toFixed(3)}]`, 
    color: "#54a24b",
    source: "stage_23_occlusion.py",
    tooltip: "Proxy poblacional desde centroides de incisivos centrales"
  },
  { 
    label: "Dentaduras analizadas", 
    value: occlusionData.n_dentitions.toLocaleString("es-AR"), 
    sub: "con los 4 incisivos centrales presentes", 
    color: "#7b52ab",
    source: "stage_23_occlusion.py",
    tooltip: "Pantos con los 4 incisivos centrales presentes (FDI 11, 21, 31, 41)"
  },
]));
```

## Hallazgos negativos (P3, P4)

Los resultados negativos son parte central del aporte de esta investigación: descartan hipótesis previas y orientan estudios futuros.

```js
display(html`<div style="background:#f5f5f5; border-left:4px solid #e45756; padding:1.2rem 1.5rem; border-radius:6px; margin:1.5rem 0;">
  <h3 style="margin-top:0; margin-bottom:0.8rem; font-size:1.1rem; color:#e45756;">⚠️ Resultados negativos verificados</h3>
  <ul style="margin:0; padding-left:1.5rem; line-height:1.7;">
    <li><strong>Distribución continua, no discreta (P3):</strong> Los cinco algoritmos de clustering evaluados (k-means, jerárquico, DBSCAN, Gaussian Mixture, HDBSCAN) arrojan silhouette &lt; 0,25 sobre z-scores normalizados. <strong>No existen subtipos dentales discretos</strong> en esta población — la variación geométrica es gradual y continua.</li>
    <li><strong>Ausencia de asociación geometría × patología global (P4):</strong> El scatter z_pos vs. z_ang coloreado por número de patologías (n_pathologies) no muestra gradiente espacial significativo. La atipicidad geométrica <strong>no predice la carga patológica</strong> a nivel poblacional (análisis por pieza individual queda para estudios futuros).</li>
  </ul>
  <p style="margin-top:0.8rem; margin-bottom:0; font-size:0.88rem; color:#666; font-style:italic;">
    Estos hallazgos negativos orientan la investigación hacia análisis por pieza individual y factores de confusión (edad, origen, género), descartando la búsqueda de subgrupos discretos.
  </p>
</div>`);
```
