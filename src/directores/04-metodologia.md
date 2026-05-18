---
title: 4 · Metodología
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("04"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./03-dataset" style="color:#888;">← Cap. 3</a></span>
  <span><a href="./05-eda" style="color:#888;">Cap. 5 — EDA →</a></span>
</div>

# 4 · Metodología

## 4.1 Pipeline ETL

```
JSON (5.114)
   │
   ▼
stage_00_fix_jsons      correcciones en memoria (C1, C8, C9)
   │
   ▼
stage_01_etl_raw        pantos_raw.csv (22 cols) · shapes_raw.csv (32 cols)
   │
   ▼
stage_02_etl_full       campos derivados, normalizaciones, ángulos
   │
   ▼
pantos.csv (~119 cols) · shapes.csv (~67 cols)
   │
   ▼
stages 10–30+           outputs para Observable (data/observable/*.json)
```

**Reproducibilidad byte-igual** (`utils/parity_check.py`): cualquier cambio
en `lib/` o `pipeline/` debe pasar el parity check o justificar y renovar
el snapshot. Pilar metodológico declarado en AGENTS.md.

```bash
python -m pipeline.build              # corre todos los stages
python utils/parity_check.py          # rápido
python utils/parity_check.py --full   # incluye ETL crudo
```

> 📓 `docs/pipeline.md` · `pipeline/stage_*.py`

## 4.2 Convenciones de columnas

- `lib/columns.py` define **constantes** (`ShapesColumns`, `PantosColumns`)
  para evitar strings hardcodeados. Todo el codebase importa de ahí.
- Sufijos de normalización:
  - `*_px`     — coordenadas crudas en píxeles.
  - `*_norm`   — normalizado por dimensiones de imagen ($\in [0,1]$).
  - `*_lm`     — normalizado por landmarks condíleos (adimensional).

## 4.3 Splits canónicos

Estratificados por nº de dientes presentes. Construidos una sola vez en
`data/eval_set_v3/` y congelados:

```js
const splits = [
  {nombre: "Corpus (fitting)", n_pantos: 2348, n_dientes: "varía", uso: "Ajuste de tooth_stats_lm.json, shape_stats_lm.json, PCA, KDE"},
  {nombre: "Val",              n_pantos:  257, n_dientes: 7099,    uso: "Selección de hiperparámetros (exp04, exp06, exp11)"},
  {nombre: "Holdout",          n_pantos:  140, n_dientes: 4478,    uso: "Métricas finales (todos T_completa)"},
];
display(html`<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Split</th>
    <th style="text-align:right; padding:6px 10px;">Pantos</th>
    <th style="text-align:right; padding:6px 10px;">Dientes</th>
    <th style="text-align:left; padding:6px 10px;">Uso</th>
  </tr></thead>
  <tbody>${splits.map(s => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-weight:600;">${s.nombre}</td>
    <td style="padding:5px 10px; text-align:right;">${s.n_pantos.toLocaleString("es-AR")}</td>
    <td style="padding:5px 10px; text-align:right;">${typeof s.n_dientes==="number"?s.n_dientes.toLocaleString("es-AR"):s.n_dientes}</td>
    <td style="padding:5px 10px; color:#555; font-size:0.85rem;">${s.uso}</td>
  </tr>`)}</tbody>
</table>`);
```

> **Regla.** Los splits **no se mezclan** al evaluar. Las estadísticas
> publicadas en data/observable provienen únicamente del corpus.

## 4.4 Stack tecnológico

| Capa | Tecnología | Función |
|---|---|---|
| Datos | LabelMe JSON | Anotaciones de origen |
| ETL  | Python 3.9+, pandas | Pipeline batch |
| Análisis | numpy, scipy, scikit-learn, scikit-image | PCA, KDE, Procrustes |
| Detector NN | PyTorch (SmallUNet) | exp04, landmarks |
| Vis | Observable Framework, D3, Plot | App pública + esta vista |
| Reproducibilidad | parity check, splits congelados, requirements pinned | — |

## 4.5 Validación

- **Pytest** (`tests/`): geometría, columns, FDI, json_corrections.
- **Parity check**: outputs del pipeline byte-igual al snapshot.
- **EDA cross-check** (notebook 091): consistencia de cifras citadas en
  el documento de tesis.
- **Experimentos numerados** (`docs/experimentos/NN_<slug>/`): plan →
  ejecución → cierre con veredicto explícito (positivo, negativo, adoptado).

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./03-dataset" style="color:#888;">← Cap. 3 — Dataset</a>
  <a href="./05-eda" style="color:#4c78a8; font-weight:600;">Cap. 5 — EDA →</a>
</div>
