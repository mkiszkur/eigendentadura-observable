---
title: 2 · Marco teórico
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("02"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./01-introduccion" style="color:#888;">← Cap. 1</a></span>
  <span><a href="./03-dataset" style="color:#888;">Cap. 3 — Dataset →</a></span>
</div>

# 2 · Marco teórico

## Conceptos centrales

```js
const conceptos = [
  {tag: "Geometría", title: "Notación FDI",
   sub: "Numeración dental estándar ISO. Q1=11–18, Q2=21–28, Q3=31–38, Q4=41–48. 32 piezas permanentes."},
  {tag: "Geometría", title: "Landmarks anatómicos",
   sub: "7 puntos por panto (L1–L7). Cóndilos (L1/L6, L2/L7), mentón (L3/L4) y mid-mentón (L5)."},
  {tag: "Normalización", title: "Transformación de similitud (4 GdL)",
   sub: "Traslación (2) + rotación (1) + escala (1). Determinada exactamente por 2 puntos (cóndilos)."},
  {tag: "Normalización", title: "Análisis Procrustes",
   sub: "Alineación de configuraciones por similitud minimizando SSD. Genera shape space invariante."},
  {tag: "Estadística", title: "PCA",
   sub: "Descomposición en componentes ortogonales por varianza. Base de la eigendentadura."},
  {tag: "Estadística", title: "KDE",
   sub: "Estimación no paramétrica de densidad. Usado para distribución por pieza y outliers."},
  {tag: "Estadística", title: "Z-scores robustos",
   sub: "Mediana y MAD por pieza. Posicionan un individuo en la población sin asumir normalidad."},
  {tag: "Visualización", title: "Visual storytelling",
   sub: "Encadenamiento narrativo de gráficos para construir argumento. Observable + reactividad."},
];
display(html`<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:0.7rem; margin:1rem 0;">
  ${conceptos.map(c => html`<div style="border:1px solid #e8e8e8; border-radius:6px; padding:0.7rem 0.9rem;">
    <div style="font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.2rem;">${c.tag}</div>
    <div style="font-weight:600; margin-bottom:0.25rem;">${c.title}</div>
    <div style="font-size:0.85rem; color:#555; line-height:1.4;">${c.sub}</div>
  </div>`)}
</div>`);
```

## Eigenshape / eigenfaces como antecedente

La eigendentadura es el análogo dental de la *eigenfaces* (Turk & Pentland, 1991)
y del *Active Shape Model* (Cootes et al., 1995): PCA sobre configuraciones
geométricas previamente alineadas a un marco común. Cada panto se representa
como un vector de $32 \times 3 = 96$ features (cx, cy, ángulo por pieza),
ordenados por FDI.

<details>
<summary>▸ Detalle metodológico — Qué diferencia este trabajo del ASM clásico</summary>

- **No usamos contornos completos** (que requerirían correspondencia de
  cientos de puntos por shape). Trabajamos con un descriptor reducido por
  diente: centroide + ángulo del minBBox.
- **Alineación**: en lugar de Procrustes generalizado sobre landmarks
  densos, alineamos con una transformación de **similitud (4 GdL) sobre
  los 2 cóndilos**. El cap. 6 compara este esquema con `raw` y bbox-norm
  cuantitativamente (exp16).
- **Handling de ausencias**: ASM clásico requiere todas las landmarks
  presentes; aquí trabajamos sobre el universo de pantos con FDI
  completo (n ≈ 853) y separadamente sobre el de PCA-por-pieza
  (n ≈ 2.704), donde no se exige completitud.

</details>

## Cohortes y splits

| Cohorte | n pantos | Uso |
|---|---|---|
| Universo total | 5.114 | EDA general (cap. 5) |
| Universo prevalencias (FDI permanente) | ~4.388 | Prevalencia patologías (cap. 5, 8) |
| Universo geométrico (FDI ∧ landmarks) | 2.704 | PCA por pieza, KDE, normalización (cap. 6, 8) |
| Dentición completa (32 FDI ∧ landmarks) | 831 | Eigendentadura, Procrustes (cap. 7, 9) |

**Splits canónicos para experimentos** (estratificados por nº de dientes):

- **Corpus de fitting**: 2.348 pantos (las estadísticas `tooth_stats_lm.json`
  y `shape_stats_lm.json` se ajustan **solo aquí**).
- **Val**: 257 pantos / 7.099 dientes.
- **Holdout**: 140 pantos / 4.478 dientes (todos `T_completa`).

Los splits **no se mezclan** al evaluar. Documentación en
`docs/experimentos/` y en el cap. 4.

## Referencias clave

Catálogo completo en el documento de tesis (`docs/tesis/12_referencias.md`).
Subset central:

- **Turk & Pentland (1991)** — Eigenfaces. *J. Cognitive Neuroscience.*
- **Cootes et al. (1995)** — Active Shape Models. *CVIU.*
- **Goodall (1991)** — Procrustes methods. *J.R.Stat.Soc. B.*
- **Bookstein (1991)** — Morphometric tools for landmark data.
- **Heimann & Meinzer (2009)** — Statistical shape models for 3D medical
  image segmentation.
- **Wand & Jones (1995)** — Kernel smoothing.
- **OMS / Dean (1991)** — Definiciones de patología dental usadas como flags.

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./01-introduccion" style="color:#888;">← Cap. 1 — Introducción</a>
  <a href="./03-dataset" style="color:#4c78a8; font-weight:600;">Cap. 3 — Dataset →</a>
</div>
