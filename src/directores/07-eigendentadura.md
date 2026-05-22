---
title: 7 · Eigendentadura
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("07"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./06-normalizacion" style="color:#888;">← Cap. 6</a></span>
  <span><a href="./08-analisis-por-pieza" style="color:#888;">Cap. 8 — Por pieza →</a></span>
</div>

# 7 · Eigendentadura

> **Pregunta P1.** ¿Existe un espacio latente compacto que capture la
> variación dental geométrica normal en una población?
> **Sí.** k = 4 componentes capturan ~60% de la varianza con estructura
> interpretable. La eigendentadura es estable bajo bootstrap y
> reproducible entre splits.

## 7.1 Construcción

- **Feature matrix**: $N \times 96$, con $N = 853$ pantos con dentición permanente completa.
- **Features por pieza**: $(c_x, c_y, \theta)$ normalizadas por landmarks (cap. 6).
- **Estandarización**: StandardScaler por columna → Z-scores.
- **PCA**: descomposición en componentes principales.

```js
const pcs = [
  {pc: "PC1", var: 29.97, ci: "[28.80; 31.42]", interp: "Curvatura global del arco"},
  {pc: "PC2", var: 12,    ci: "—",              interp: "Asimetría izquierda/derecha"},
  {pc: "PC3", var: 9,     ci: "—",              interp: "Apertura anterior/posterior"},
  {pc: "PC4", var: 7,     ci: "—",              interp: "Modos de inclinación"},
];
display(html`<table style="width:100%; max-width:680px; border-collapse:collapse; font-size:0.9rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Componente</th>
    <th style="text-align:right; padding:6px 10px;">Var (%)</th>
    <th style="text-align:left; padding:6px 10px;">CI 95% (bootstrap)</th>
    <th style="text-align:left; padding:6px 10px;">Interpretación</th>
  </tr></thead>
  <tbody>${pcs.map(p => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace; font-weight:600;">${p.pc}</td>
    <td style="padding:5px 10px; text-align:right;">${p.var.toFixed(2)}%</td>
    <td style="padding:5px 10px; font-size:0.82rem; color:#555;">${p.ci}</td>
    <td style="padding:5px 10px;">${p.interp}</td>
  </tr>`)}</tbody>
</table>`);
```

Más allá de **k = 4** la varianza adicional cae al ruido. Recordatorio
del cap. 6: bajo `*_lm` se necesitan **18 PCs para 90%** y **30 para
95%**, sustancialmente menos que con normalización por imagen (26 y 38).

## 7.2 PC1 es forma, no tamaño (exp18)

Bajo el esquema canónico `*_lm`, PC1 **no es tamaño dental ni posición
de la arcada en la imagen**:

```js
const r2pc = [
  {var_dep: "PC1", S1_hull: 0.087, S3_molar: 0.078},
  {var_dep: "PC2", S1_hull: "—",   S3_molar: 0.37},
  {var_dep: "PC3", S1_hull: "—",   S3_molar: 0.43},
];
display(html`<table style="width:100%; max-width:600px; border-collapse:collapse; font-size:0.9rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Var dep</th>
    <th style="text-align:right; padding:6px 10px;">R² vs S1 (área hull)</th>
    <th style="text-align:right; padding:6px 10px;">R² vs S3 (dist molar–molar)</th>
  </tr></thead>
  <tbody>${r2pc.map(r => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace; font-weight:600;">${r.var_dep}</td>
    <td style="padding:5px 10px; text-align:right;">${typeof r.S1_hull==="number"?r.S1_hull.toFixed(3):r.S1_hull}</td>
    <td style="padding:5px 10px; text-align:right;">${typeof r.S3_molar==="number"?r.S3_molar.toFixed(3):r.S3_molar}</td>
  </tr>`)}</tbody>
</table>`);
```

El tamaño residual se redistribuye hacia PC2/PC3 (R² 0.37, 0.43). Una
PCA residualizando cada feature contra el área del hull deja PC1
prácticamente inalterada (30,1 % → 31,3 %). Como referencia, bajo el
esquema `*_norm` (no canónico) PC1 se asociaba en **90 %** con la norma de
centroides — ese artefacto desaparece bajo `*_lm`.

> 📓 `docs/experimentos/18_pc1_tamano_vs_forma/99_cierre.md`

## 7.3 Visualización

La visualización canónica vive en el [observable público](../) (sección
*Geometría Dental* y *Análisis de casos atípicos*). El mock para
directores reusa los componentes existentes — no se replica la figura
acá para mantener brevedad.

> 📓 Notebooks 021, 022, 023, 025

## 7.4 Limitaciones

- Solo el **16,7 %** del dataset (853 pantos) tiene dentición permanente
  completa. La eigendentadura **no representa la población general** —
  representa la subpoblación con dentadura intacta. Los ausentes (terceros
  molares, premolares perdidos) se discuten en cap. 8 (PCA por pieza, que
  acepta dientes faltantes) y en exp10 (mixta).
- Cx/cy están **altamente correlacionados entre dientes**; los ángulos
  son más independientes → primeros PCs capturan modos globales de
  posición, dejando ángulo en PCs tardíos. **PCA por bloques** es el
  refinamiento más prometedor (cap. 8).

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./06-normalizacion" style="color:#888;">← Cap. 6</a>
  <a href="./08-analisis-por-pieza" style="color:#4c78a8; font-weight:600;">Cap. 8 — Por pieza →</a>
</div>
