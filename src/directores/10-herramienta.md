---
title: 10 · Herramienta de visualización
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("10"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./09-subpoblaciones" style="color:#888;">← Cap. 9</a></span>
  <span><a href="./11-conclusiones" style="color:#888;">Cap. 11 — Conclusiones →</a></span>
</div>

# 10 · Herramienta de visualización

> **Pregunta P5.** ¿Es posible exponer este análisis a usuarios clínicos
> sin formación técnica vía una herramienta de visualización interactiva?
> **Sí.** Aplicación sobre **Observable Framework** publicada en GitHub Pages.

## 10.1 Acceso

- **Sitio público** (usuarios clínicos): <a href="../">../</a> (misma raíz).
- **Sitio interno** (estos directores): este sitio.
- **Repo mirror** público:
  [`mkiszkur/eigendentadura-observable`](https://github.com/mkiszkur/eigendentadura-observable)
  → GH Pages.

> ⚠️ Observable Cloud (`observablehq.cloud`) fue **deprecado el 2025-04-15**.
> El deploy actual es 100% GH Pages.

## 10.2 Arquitectura

```
┌─────────────────────────────┐     ┌──────────────────┐
│  Pipeline ETL (Python)      │ ──→ │ data/observable/ │
│  pipeline/stage_NN_*.py     │     │   *.json         │
└─────────────────────────────┘     └────────┬─────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ Observable App   │
                                    │ observable/src/  │
                                    │  ~30 componentes │
                                    └────────┬─────────┘
                                              │ npx observable build
                                              ▼
                                    ┌──────────────────┐
                                    │ Static dist/     │
                                    │  → GH Pages      │
                                    └──────────────────┘
```

## 10.3 Componentes

`observable/src/components/` (~30 archivos JS). Familias:

| Familia | Ejemplos | Datos |
|---|---|---|
| **Geometría** | `panto-schematic`, `panto-normalized`, `arch-form` | `pantos_browser.json`, `pantos_geometry/` |
| **Estadística poblacional** | `kde-plot`, `boxplot-2d`, `pca-scatter`, `rose-plot`, `radar-angular` | `tooth_stats_lm.json`, `kde_grids.json` |
| **Patología** | `prevalence-odontogram`, `pathology-heatmap`, `upset-plot` | `prevalence_by_tooth.json`, `geo_patologia.json` |
| **Individuo** | `individual-rose-plot`, `mini-odontograma`, `funnel-chart` | `individual_scores.json` |
| **Subpoblaciones** | `subpop-arch-form`, `subpop-diff-heatmap`, `subpop-violin-plot` | `*_genero.json`, `*_origen.json` |
| **Utilidades** | `paginated-table`, `range-slider`, `teeth-selector`, `collapsible`, `zoomable-chart`, `summary-cards` | — |

## 10.4 Estado actual

```js
const estado = [
  {area: "EDA + dataset",                pct: 100, color: "#54a24b"},
  {area: "Geometría dental + KDE",        pct: 100, color: "#54a24b"},
  {area: "Eigendentadura + tipicidad",    pct: 100, color: "#54a24b"},
  {area: "Patologías + cruce",            pct: 100, color: "#54a24b"},
  {area: "Subpoblaciones",                pct: 100, color: "#54a24b"},
  {area: "Individuo vs población",        pct: 100, color: "#54a24b"},
  {area: "Anexo experimentos",            pct: 100, color: "#54a24b"},
  {area: "Stage 36 (apinamiento exp28)",  pct:  20, color: "#f58518"},
  {area: "Validación clínica cualitativa", pct: 30, color: "#f58518"},
];
display(Plot.plot({
  width: Math.min(width, 700), height: 280, marginLeft: 220,
  x: {label: "% completitud", domain: [0, 100], grid: true},
  y: {label: null, domain: estado.map(e=>e.area)},
  marks: [
    Plot.barX(estado, {x: "pct", y: "area", fill: "color", tip: true}),
    Plot.text(estado, {x: "pct", y: "area", text: d=>`${d.pct}%`, dx: 4, textAnchor: "start", fontSize: 11}),
  ],
}));
```

## 10.5 Reproducibilidad

- Builds determinísticos (sin estado oculto en notebooks).
- Datos servidos desde el repo (FileAttachment), no llamadas de red.
- Versionado SemVer; breaking changes documentados en `CHANGES_V<MAJOR>.md`.
- Deploy via `git subtree push --prefix=observable obs main`.

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./09-subpoblaciones" style="color:#888;">← Cap. 9</a>
  <a href="./11-conclusiones" style="color:#4c78a8; font-weight:600;">Cap. 11 — Conclusiones →</a>
</div>
