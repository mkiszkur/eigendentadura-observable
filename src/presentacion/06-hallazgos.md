---
title: Slide 6 · Hallazgos clave
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {slideEmphasis} from "../components/slide-layout.js";
display(slideNav(6));
```

<div style="
  min-height: 80vh; 
  background: white; 
  padding: 2rem; 
  border-radius: 8px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
">

<div style="max-width: 900px; margin: 0 auto;">

<div style="font-size: 0.75rem; color: #999; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 0.5rem;">
  SLIDE 6 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  Hallazgos clave
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

${slideEmphasis(html`
  <strong style="font-size: 1.2rem;">Respuestas a P1–P5</strong><br>
  Resultados positivos + resultados negativos robustos.
`, {color: "#7b52ab", background: "#f3f0ff"})}

<h3 style="margin-top: 1.5rem; margin-bottom: 0.8rem;">✅ P1: Espacio latente compacto</h3>
<div style="padding-left: 1rem; border-left: 3px solid #4c78a8; margin: 0.8rem 0;">
  - **PC1:** 30.52 % de la varianza (contracciones laterales + rotaciones molares).<br>
  - **PC1–PC4:** 60.11 % acumulado. **PC1–PC10:** 80.04 %.<br>
  - Corpus: 853 pantos con dentición completa.
</div>

<h3 style="margin-top: 1.5rem; margin-bottom: 0.8rem;">✅ P2: Normalización superior</h3>
<div style="padding-left: 1rem; border-left: 3px solid #54a24b; margin: 0.8rem 0;">
  - Landmarks condíleos (*_lm) **10.5× mejor** que normalización por imagen (*_norm).<br>
  - Varianza residual post-Procrustes: 1.54 px² vs. 16.12 px².
</div>

<h3 style="margin-top: 1.5rem; margin-bottom: 0.8rem;">⚠️ P3: Ausencia de subgrupos discretos</h3>
<div style="padding-left: 1rem; border-left: 3px solid #e45756; margin: 0.8rem 0;">
  - **Resultado negativo consolidado.** Múltiples líneas de evidencia:<br>
    • Clustering k-means sobre Z-scores: silhouette < 0.15.<br>
    • Clustering sobre Procrustes: silhouette 0.092.<br>
    • Estratificación por patrón FDI: no reorganiza distribuciones.<br>
  - **Implicación:** La variación dental es **continua**, no organizada en subpoblaciones discretas biológicamente significativas.
</div>

<h3 style="margin-top: 1.5rem; margin-bottom: 0.8rem;">⚠️ P4: Geometría × Patología (mixto)</h3>
<div style="padding-left: 1rem; border-left: 3px solid #f58518; margin: 0.8rem 0;">
  - **No asociación global:** PERMANOVA multivariada sobre PC1–PC10 × patologías: $p > 0.05$.<br>
  - **Sí asociaciones locales:** 129 / 1.024 pares (FDI, patología) significativos tras BH.<br>
  - **Interpretación:** Asociaciones débiles y localizadas, sin patrón global coherente.
</div>

<h3 style="margin-top: 1.5rem; margin-bottom: 0.8rem;">✅ P5: Herramienta de visualización</h3>
<div style="padding-left: 1rem; border-left: 3px solid #7b52ab; margin: 0.8rem 0;">
  - **Observable Framework** con 2 escenarios (poblacional + individual).<br>
  - Deploy: GitHub Pages (subtree mirror).<br>
  - Componentes: D3.js + Plot + htl. ~5.114 JSONs individuales.<br>
  - Público objetivo: odontólogos (exploración), directores (reproducibilidad).
</div>

${slideEmphasis(html`
  <strong>Contribución metodológica:</strong> Primera implementación documentada de <strong>eigendentadura</strong> y <strong>normalización por landmarks condíleos</strong> en análisis morfométrico dental poblacional.
`, {color: "#4c78a8"})}

</div>

</div>

</div>
