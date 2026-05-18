---
title: 8 · Análisis por pieza
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("08"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./07-eigendentadura" style="color:#888;">← Cap. 7</a></span>
  <span><a href="./09-subpoblaciones" style="color:#888;">Cap. 9 — Subpoblaciones →</a></span>
</div>

# 8 · Análisis por pieza dental

## 8.1 Por qué analizar pieza por pieza

La eigendentadura global (cap. 7) requiere **dentadura completa** (n = 853).
El análisis **por pieza** opera sobre el universo geométrico (n ≈ 2.704)
y describe, para cada FDI:

- Distribución de $(c_x, c_y, \theta)$ → KDE 2D.
- Casos atípicos → outliers por Mahalanobis o KDE.
- Z-scores robustos (mediana, MAD) para posicionar un individuo.

## 8.2 KDE por pieza

Las distribuciones son **estables intra-FDI** y **distintas entre FDIs**.
Los polígonos de densidad ($p_{50}$, $p_{75}$, $p_{95}$) trazan la
"nube" anatómica de cada pieza. La visualización canónica vive en el
observable público bajo *Geometría Dental*.

## 8.3 PCA por pieza

| Variante | PC1 promedio | PC1+PC2 prom |
|---|---|---|
| 3F-img (cx_norm, cy_norm, angle) | 40.0% | 73.4% |
| **3F-lm (cx_lm, cy_lm, angle)** | **57.0%** | **90.1%** |

Detalle cuantitativo en [cap. 6](./06-normalizacion#6-5-pca-por-pieza).
16/32 piezas cambian su feature dominante en PC1 al usar landmarks
(angle deja de dominar; cx/cy toman protagonismo).

## 8.4 Z-scores robustos

Para un panto individual, su z-score por pieza usa **mediana y MAD** del
corpus (no media/std, para robustez a outliers). El panel *Individuo*
del observable público implementa esta vista.

$$
z_{i,k} = \frac{x_{i,k} - \text{med}(x_k)}{1{,}4826 \cdot \text{MAD}(x_k)}
$$

Las estadísticas `tooth_stats_lm.json` se ajustan **solo sobre el corpus**
de 2.348 pantos ([splits canónicos](./04-metodologia#4-3-splits-canonicos)),
nunca sobre val/holdout.

## 8.5 Outliers

Dos métricas complementarias por pieza:

1. **Mahalanobis 2D** (cx, cy) con covarianza robusta (MCD).
2. **Densidad KDE inversa** (regiones de baja densidad).

Las "dentaduras típicas y atípicas" del [observable público](../) usan
esta señal agregada para identificar pantos de interés.

## 8.6 Forma del diente (exp11)

Análisis de la forma del polígono del diente vía momentos invariantes y
descriptor de Fourier sobre el contorno. **Veredicto del experimento:**
la forma intra-FDI es estable; las variaciones detectables son
mayoritariamente artefactos de anotación (no señal anatómica).

> 📓 Notebooks 031, 036, 037, 070 · `docs/experimentos/11_forma_dientes/99_cierre.md`

## 8.7 Asociación local FDI × patología (exp22)

A escala local $(FDI, \text{patología})$, **sí hay señal robusta**:

- **131 de 250 tests** (52.4%) significativos bajo BH-FDR $q < 0{,}05$.
- Esperados por azar: **12.5**.
- **`neoformation`** sobre **18 FDIs** con $M^2 \in [1{,}9;\,7{,}4]$ —
  huella más amplia, biológicamente plausible (lesiones expansivas
  desplazan caninos adyacentes).

Esto contrasta con la **ausencia de asociación global** (cap. 9): la
señal global es la suma promediada de señales locales heterogéneas que se
cancelan, no su ausencia.

> 📓 `docs/experimentos/22_asociacion_local_fdi_patologia/`

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./07-eigendentadura" style="color:#888;">← Cap. 7</a>
  <a href="./09-subpoblaciones" style="color:#4c78a8; font-weight:600;">Cap. 9 — Subpoblaciones →</a>
</div>
