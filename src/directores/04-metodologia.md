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

```js
const lmNN = await FileAttachment("../data/landmarks_nn_metrics.json").json();
```

## 4.1 Enfoque general

Tesis de **ciencia de datos** orientada al análisis exploratorio
*data-driven* del dataset descrito en el Cap. 3. El trabajo no parte
de hipótesis biológicas a contrastar sino del principio rector —
*"Hipótesis non fingo"*— de construir herramientas agnósticas para
que el odontólogo descubra los patrones, antes que imponer un modelo
*a priori*.

Cuatro perspectivas complementarias articulan los Caps. 5–10:

1. **Descriptivo poblacional** (Cap. 5) — prevalencias, distribuciones, calidad.
2. **Modelado geométrico** (Caps. 6–7) — eigendentadura.
3. **Análisis local por pieza** (Cap. 8) — estructura de varianza FDI a FDI.
4. **Cruce con cofactores** (Cap. 9) — subpoblaciones, patologías, clustering.

La **herramienta interactiva** (Cap. 10) materializa esta cuádruple
perspectiva sobre Observable Framework para uso clínico.

**Resultados negativos como aporte.** Dos hallazgos negativos
articulan el trabajo: ausencia de subgrupos discretos en el espacio
geométrico (silhouette $< 0{,}15$ bajo cinco algoritmos) y ausencia
de asociación global geometría × patología tras corrección por
multiplicidad. Se reportan con el mismo rigor estadístico que los
positivos.

**Fuera de alcance.** Clasificación supervisada de patologías,
segmentación con *deep learning*, modelos generativos clínicos y
toda inferencia diagnóstica automatizada. El detector neuronal de
landmarks (§4.4.3) es la única componente supervisada y cumple un
rol exclusivamente auxiliar de imputación geométrica.

## 4.2 Pipeline ETL y reproducibilidad

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
stages 10–58            outputs para Observable (data/observable/*.json)
```

**Reproducibilidad byte-igual** (`utils/parity_check.py`): cualquier
cambio en `lib/` o `pipeline/` debe pasar el parity check o
justificar y renovar el snapshot. Pilar metodológico declarado en
AGENTS.md. El check vigila 34 artefactos (6 archivos en `data/csv/` —
incluido `thesis_figures.json` que registra todas las cifras citadas
en la tesis— más 28 JSON en `observable/src/data/`).

```bash
python -m pipeline.build              # corre todos los stages
python utils/parity_check.py          # rápido
python utils/parity_check.py --full   # incluye ETL crudo
```

> 📓 `docs/general/pipeline.md` · `pipeline/stage_*.py`

## 4.3 Convenciones de código

- `lib/columns.py` define **constantes** (`ShapesColumns`, `PantosColumns`)
  para evitar strings hardcodeados. Todo el codebase importa de ahí.
- Sufijos de normalización:
  - `*_px`     — coordenadas crudas en píxeles.
  - `*_norm`   — normalizado por dimensiones de imagen ($\in [0,1]$).
  - `*_lm`     — normalizado por landmarks condíleos (adimensional, anatómicamente comparable; **canónico** post-CHANGES_V5).

## 4.4 Métodos

Los métodos transversales del trabajo se organizan en cuatro bloques
temáticos según su rol argumentativo. No tienen el mismo peso: el
*backbone* es el PCA global de §4.4.1; los demás son auxiliares,
contrastes o validación.

### 4.4.1 Análisis geométrico y reducción dimensional

El PCA es el método central, aplicado en **tres roles operativos**:

1. **Objeto de estudio** (eigendentadura, Cap. 7) — descomposición espectral de la matriz $831 \times 96$ de Z-scores. Los autovectores se interpretan como modos anatómicos de variación (PC1 anteroposterior, PC2 inclinación, etc.) y se materializan como "eigendentaduras visuales" mediante perturbaciones $\pm 2\sigma$.
2. **Preprocesamiento del clustering** (Cap. 9) — los Z-scores se proyectan sobre los primeros diez componentes del PCA del Rol 1 (~90 % de varianza) antes del barrido de algoritmos. **No se ajusta un segundo PCA**.
3. **Visualización 2D** (Cap. 10) — el plano $(PC_1, PC_2)$ del PCA del Rol 1 funciona como mapa cartográfico en la página *Análisis de clusters*.

**Morfometría geométrica** (Cap. 6) — Análisis Procrustes generalizado
(GPA) sobre las configuraciones condíleas y de mentón, seguido de
PCA tangente sobre las coordenadas Procrustes. Alternativa de
referencia al PCA global del Rol 1.

### 4.4.2 Caracterización poblacional y agrupamiento

- **KDE por pieza** (`scipy.stats.gaussian_kde`, ancho de banda
  Silverman) — densidad bivariada por FDI sobre los centroides
  $(cx, cy)$. Funciona como *prior* poblacional para el análisis
  individuo vs. población (Cap. 8) y como visualización canónica
  en la herramienta (Cap. 10).
- **Barrido sistemático de clustering** sobre cinco familias de
  algoritmos (KMeans, jerárquico Ward, HDBSCAN, GMM, MiniBatchKMeans)
  sobre tres representaciones (Z-scores 96-D, coordenadas Procrustes,
  *embeddings* UMAP). Calidad medida por silhouette + Calinski–Harabasz
  + Davies–Bouldin. **Resultado negativo central P3**: ausencia de
  subgrupos discretos (Cap. 9, silhouette $< 0{,}15$).

### 4.4.3 Detección, imputación y proxies clínicos

Única componente supervisada del trabajo: **detector neuronal de
landmarks** (HRNet-lite + *heatmaps* + `softargmax` + TTA *flip*).
Su único rol es imputar coordenadas geométricas para extender la
normalización por landmarks (Cap. 6) al ~46 % del dataset cuyos
JSON originales (versiones $< 5{,}5{,}0$) no incluyen las
anotaciones de cóndilos y mentón. El detector **no participa de
ningún análisis clínico ni diagnóstico**.

**Métricas en holdout** (140 pantos × 7 landmarks):

```js
const fmt = x => x.toFixed(2).replace(".", ",");
display(html`<ul style="margin:0; padding-left:1.2rem;">
  <li><strong>Mediana global</strong>: ${fmt(lmNN.aggregate.median_pct)} % de la distancia intercondilar (${lmNN.aggregate.n_measurements} mediciones).</li>
  <li><strong>Restringida a los cuatro cóndilos</strong> (L1, L2, L6, L7): ${fmt(lmNN.intercondylar.median_pct)} %.</li>
  <li><strong>p95 global</strong>: ${fmt(lmNN.aggregate.p95_pct)} %.</li>
</ul>`);
```

> Artefacto canónico: `data/models/exp04/checkpoint_best_v2.pt`. Cierre
> completo en [`docs/experimentos/04_landmarks_nn/99_cierre.md`](../../docs/experimentos/04_landmarks_nn/99_cierre.md).

**Refiner stage-2 de landmarks.** Un segundo modelo (`data/models/exp06/checkpoint_best_v1.pt`,
política `BplusD_10`) afina los cuatro puntos condíleos $L_1$, $L_2$,
$L_6$, $L_7$ sobre la salida del detector cuando el desplazamiento
$\Delta s_1 \to s_2 \leq 10$ px. Reduce el error mediano de los
cóndilos y se incorpora al *fallback* de `lib/landmarks_nn`.

**Imputadores de la numeración FDI** (`pipeline/stage_04_impute_fdi.py`).
Cuando un polígono dental no trae FDI explícita (Cap. 3 §3.1.3), tres
modelos en cascada completan la numeración —y **nunca sobrescriben
la anotación GT cuando existe**—:

- **M1 — Posicional**: gaussiano diagonal por FDI sobre $(cx, cy, \theta)$ en frame `*_lm`. Actúa como *prior* bayesiano.
- **M2 — Por forma**: CatBoost v2 sobre 43 descriptores morfológicos del polígono (firma radial, Hu, EFD, minbbox, curvatura, cúspides). Top-1 holdout 79,95 %. Complementario a M1 cuando la posición es ambigua. Artefacto: `data/models/exp11/model_catboost_v2.cbm`.
- **M3 — Asignador canónico**: combina M1 y M2 con asignación Hungarian + unicidad por panto.

**Proxies clínicos derivados del frame intercondíleo**:

- **Oclusión proxy** (`stage_32_occlusion.py`) — overbite y overjet a partir de centroides de incisivos centrales (FDI 11, 21, 31, 41) sobre coordenadas `*_lm`.
- **Índice de Bolton** (`stage_34_bolton.py`) — ratios anterior y overall sobre anchuras de minbbox normalizadas por distancia intercondílea. Limitación: las anchuras desde panorámica están sujetas a distorsión del aparato.
- **Simetría bilateral** (`stage_31_symmetry.py`) — para cada FDI con homólogo contralateral, $\Delta x$ y $\Delta y$ vs. el reflejo del par sobre el plano sagital.

Los tres operan exclusivamente sobre `*_lm`. **No son insumos del PCA
ni del clustering**: se reportan como ejemplos de análisis habilitados
por el frame intercondíleo, sin pretensión de validación clínica
cuantitativa.

### 4.4.4 Validación estadística

Tests no paramétricos (Mann–Whitney $U$, Kruskal–Wallis,
Kolmogorov–Smirnov, $\chi^2$ de Pearson, Fisher exacto, PERMANOVA;
Hotelling $T^2$ multivariado para outliers en PCA).

**Control de multiplicidad** —dada la cantidad de tests, central
para el rigor del trabajo—:

- **Benjamini–Hochberg (BH-FDR)** [Benjamini & Hochberg 1995]: política por defecto, $q = 0{,}05$.
- **Bonferroni**: como referencia conservadora para los cruces Procrustes × patología (Cap. 9).
- **Permutación** ($n = 10{.}000$): contraste no paramétrico cuando la normalidad es discutible.
- **Bootstrap BCa** ($n = 1{.}000$): IC al 95 % para todos los estimadores clave (varianza explicada por PCs, MAE del detector, silhouette, etc.).

## 4.5 Splits canónicos

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
> publicadas en `data/observable/` provienen únicamente del corpus.
> Las cuatro categorías operativas usadas para estratificar
> (`T_completa`, `T_sin_terceros`, `T_mixta`, `T_residual`) se
> definen en el glosario (Apéndice G del Cap. 13).

## 4.6 Stack tecnológico

| Capa | Tecnología | Función |
|---|---|---|
| Datos | LabelMe JSON | Anotaciones de origen |
| ETL  | Python 3.14, pandas, NumPy | Pipeline batch |
| Análisis | SciPy, scikit-learn, statsmodels, HDBSCAN, UMAP | PCA, KDE, clustering, tests |
| Geometría | Shapely, scikit-image | Polígonos, minbbox, Procrustes |
| Detector NN | PyTorch (HRNet-lite) | exp04, landmarks |
| Visualización | Matplotlib, Seaborn (estática); Observable Framework v1.13.4 + D3 + Plot (web) | App pública + esta vista |
| Reproducibilidad | parity check, splits congelados, `requirements.txt` *pinned* | — |

Tabla 4.1: Stack tecnológico por capa: tecnologías usadas en datos, ETL, análisis, geometría, detector NN, visualización y reproducibilidad.

Inventario completo de versiones (Python y JavaScript) en el
**Apéndice J** del Cap. 13.

## 4.7 Validación

- **Pytest** (`tests/`): geometría, columns, FDI, json_corrections, cifras de la tesis (`tests/test_tesis_figures.py` valida cada cifra publicada contra su fuente canónica).
- **Parity check**: outputs del pipeline byte-igual al snapshot.
- **`utils/check_md_figures.py`**: cada marcador `<!--fig:id-->VALOR<!--/fig-->` en los `.md` debe coincidir con la fuente canónica declarada en `docs/tesis/_figures.yaml`.
- **Experimentos numerados** (`docs/experimentos/NN_<slug>/`): plan → ejecución → cierre con veredicto explícito (positivo, negativo, adoptado).

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./03-dataset" style="color:#888;">← Cap. 3 — Dataset</a>
  <a href="./05-eda" style="color:#4c78a8; font-weight:600;">Cap. 5 — EDA →</a>
</div>
