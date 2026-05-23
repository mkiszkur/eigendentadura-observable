---
title: Síntesis ejecutiva · P1–P5
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("sintesis"));
```

# Síntesis ejecutiva · P1–P5

<div style="background:#f5f7fa; border-left:4px solid #7b52ab; padding:1rem 1.2rem; margin:1.5rem 0 2rem; border-radius:4px;">

**Objetivo de esta página:** Responder las 5 preguntas de investigación en **formato tarjeta**, con cifras trazadas, visualizaciones interactivas y estado (consolidado/negativo/parcial). Navegación rápida sin leer los capítulos completos.

</div>

---

## P1 · ¿Existe un espacio latente compacto que capture la variación dental geométrica normal?

<div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:1.2rem; margin:1rem 0;">

**Respuesta:** **Sí.** PCA sobre 96 features (32 dientes × {$c_x$, $c_y$, $\theta$}) con normalización por landmarks condíleos.

**Cifras clave:**

- **PC1:** 30.52 % de la varianza explicada (contracciones laterales + rotaciones molares).
- **PC1–PC4:** 60.11 % acumulado (dimensionalidad reducida a 4).
- **PC1–PC10:** 80.04 % acumulado.
- **Corpus:** 853 pantos con dentición permanente completa (universo geométrico: 2.704).

**Estado:** ✅ **Consolidado** — Ver [cap. 7](./07-eigendentadura).

**Nota metodológica:** PCA sobre features centrados por diente (resta de media poblacional por FDI). Sin estandarización (preserva escala nativa). Eigen descomposición de matriz de covarianza 96 × 96.

**Visualización interactiva:** Ver [Eigendentadura en el observable público](../eigendentadura).

</div>

---

## P2 · ¿Qué normalización geométrica es mejor?

<div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:1.2rem; margin:1rem 0;">

**Respuesta:** **Normalización por landmarks condíleos** (`*_lm`) supera a normalización por imagen (`*_norm`) en todos los tests (exp16).

**Evidencia:**

| Test | `*_norm` | `*_lm` | Factor de mejora |
|------|----------|--------|------------------|
| Varianza residual post-Procrustes | 16.12 px² | **1.54 px²** | **10.5×** |
| Silhouette k-means (k=4) | 0.094 | **0.146** | 1.55× |
| Distancia intercondilar CV | 0.118 | **0.043** | 2.74× |

**Corpus:** 2.704 pantos (universo geométrico).

**Estado:** ✅ **Consolidado** — Ver [cap. 6](./06-normalizacion) y [exp16](./12-experimentos#exp16).

**Componente:** Ver [comparación visual lado a lado](./06-normalizacion#comparacion) con overlay de landmarks.

</div>

---

## P3 · ¿Existen subpoblaciones discretas?

<div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:1.2rem; margin:1rem 0;">

**Respuesta:** **No.** Múltiples líneas de evidencia convergen en ausencia de subgrupos discretos.

**Evidencia:**

- **Clustering k-means sobre Z-scores** (32 dims): silhouette < 0.15 para $k \in [2, 10]$. Máximo 0.146 en k=4 (exp16).
- **Clustering sobre coordenadas Procrustes** (64 dims): silhouette 0.092 (k=3).
- **Estratificación por patrón FDI** (exp28, Uso E.B): 4 grupos (T_completa / T_sin_terceros / T_mixta / T_residual) no reorganizan distribuciones $p(\mathbf{x} \mid \text{FDI})$.
- **Visualización PC1 × PC2:** Distribución continua, sin clusters visuales. Ver [densidad 2D](./07-eigendentadura#pc1-pc2).

**Corpus:** 2.704 pantos (universo geométrico).

**Estado:** ✅ **Resultado negativo consolidado** — Ver [cap. 9](./09-subpoblaciones).

**Nota:** Ausencia de subgrupos no implica ausencia de variación (la varianza es alta y real); implica que la variación es **continua** y no se organiza en clusters discretos biológicamente significativos.

</div>

---

## P4 · ¿Se asocia la geometría dental con patologías?

<div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:1.2rem; margin:1rem 0;">

**Respuesta:** **No a nivel global** (ausencia de asociación multivariada geometría × patologías), **sí a nivel local** (129 pares (FDI, patología) significativos tras Benjamini-Hochberg).

**Evidencia global (ausencia):**

- **PERMANOVA multivariada** sobre PC1–PC10 × presencia de caries/radiolucidez/restauraciones: $p > 0.05$ (no significativo).
- **Cluster comparison:** Distribución de patologías no difiere entre clusters PC1 × PC2 (Chi² $p > 0.2$).

**Evidencia local (significativo):**

- **Tests bivariados** (KS 2-sample) por diente: 129 / 1.024 pares (FDI, patología) significativos tras corrección BH (FDR = 0.05).
- Ejemplos: FDI 11 × caries incipiente ($p = 0.0012$), FDI 26 × radiolucidez apical ($p = 0.0034$).
- **Interpretación:** Asociaciones locales débiles, sin patrón global coherente.

**Corpus:** 2.704 pantos (universo geométrico).

**Estado:** ✅ **Resultado mixto consolidado** — Ver [cap. 9](./09-subpoblaciones) y [análisis bivariado detallado](./08-analisis-por-pieza#patologias).

</div>

---

## P5 · ¿Cómo construir una herramienta de visualización?

<div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:1.2rem; margin:1rem 0;">

**Respuesta:** **Observable Framework** con 2 escenarios: (1) poblacional (KDE, eigendentadura, distribuciones), (2) individual (odontograma, z-scores, comparación con cohorte).

**Arquitectura:**

- **Framework:** Observable Framework (Markdown + JavaScript reactivo).
- **Deploy:** GitHub Pages (subtree mirror).
- **Componentes:** D3.js (visualizaciones custom), Plot (gráficos estadísticos), htl (markup).
- **Datos:** JSONs generados por el pipeline (stages 20–29). Total: ~5.114 archivos JSON (1 por panto) + tablas agregadas.

**Audiencias:**

- **Odontólogos (público):** Exploración de población, individualización de paciente, benchmark z-scores. URL: [raíz del sitio](../).
- **Directores (interno):** Resumen de capítulos, infografías, trazabilidad de cifras. URL: esta vista.

**Estado:** 🟡 **Parcial** — Escenario poblacional implementado (100 %), escenario individual implementado (80 %, falta integración completa de patologías). Ver [cap. 10](./10-herramienta).

**Demo:** Ver [observable público](../) y [demo interactiva para directores](../demo).

</div>

---

## Navegación rápida por capítulo

<div style="background:#f9f9f9; border-radius:8px; padding:1rem 1.2rem; margin:2rem 0;">

```js
function quickNavCard(num, title, href, questions) {
  return html`<a href="${href}" style="display:block; border:1px solid #e0e0e0; border-radius:6px; padding:0.8rem 1rem; text-decoration:none; color:#222; background:white; transition:box-shadow 0.15s;">
    <div style="display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.3rem;">
      <span style="font-size:0.7rem; color:#888; font-weight:700; letter-spacing:0.05em;">CAP. ${num}</span>
      <span style="font-size:0.65rem; color:#7b52ab; font-weight:600; margin-left:auto;">${questions}</span>
    </div>
    <div style="font-weight:600; font-size:0.98rem;">${title}</div>
  </a>`;
}

display(htl.html`<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:0.8rem;">
  ${quickNavCard("1", "Introducción", "./01-introduccion", "P1–P5 contexto")}
  ${quickNavCard("2", "Marco teórico", "./02-marco-teorico", "Fundamentos")}
  ${quickNavCard("3", "Dataset", "./03-dataset", "5.114 pantos")}
  ${quickNavCard("4", "Metodología", "./04-metodologia", "Pipeline + parity")}
  ${quickNavCard("5", "EDA", "./05-eda", "Distribuciones")}
  ${quickNavCard("6", "Normalización", "./06-normalizacion", "P2")}
  ${quickNavCard("7", "Eigendentadura", "./07-eigendentadura", "P1")}
  ${quickNavCard("8", "Análisis por pieza", "./08-analisis-por-pieza", "P1 + P4 local")}
  ${quickNavCard("9", "Subpoblaciones", "./09-subpoblaciones", "P3 + P4 global")}
  ${quickNavCard("10", "Herramienta", "./10-herramienta", "P5")}
  ${quickNavCard("11", "Conclusiones", "./11-conclusiones", "P1–P5 síntesis")}
  ${quickNavCard("12", "Experimentos", "./12-experimentos", "exp01–exp42")}
</div>`);
```

</div>

---

<div style="background:#f5f7fa; border-left:4px solid #4c78a8; padding:1rem 1.2rem; margin:2rem 0; border-radius:4px; font-size:0.92rem;">

**Nota final:** Esta síntesis es un **TL;DR ejecutivo** para pre-lectura rápida. Para contexto metodológico, supuestos, limitaciones y detalles técnicos, ver los capítulos completos. Para visualizaciones interactivas, ver el [observable público](../).

</div>

---

[← Volver al índice](./index)
