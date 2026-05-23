---
title: Slide 7 · La herramienta
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
display(slideNav(7));
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
  SLIDE 7 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  La herramienta
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

<div style="background: #f5f7fa; border-left: 4px solid #7b52ab; padding: 1rem 1.2rem; margin: 1.5rem 0; border-radius: 4px;">
  <strong>Observable Framework:</strong> sitio estático con visualizaciones interactivas (D3 + Plot). Deploy en GitHub Pages.
</div>

<h3 style="margin-top: 1.5rem; margin-bottom: 0.8rem;">Escenario 1: Análisis poblacional</h3>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
  <div style="background: #eef2f7; padding: 1rem; border-radius: 6px;">
    <strong style="color: #4c78a8;">📊 KDE por pieza</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Densidades de posición (cx, cy) por FDI. Comparación normalización *_norm vs. *_lm.</span>
  </div>
  <div style="background: #f0fdf4; padding: 1rem; border-radius: 6px;">
    <strong style="color: #54a24b;">🧬 Eigendentadura</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Exploración interactiva de PC1–PC10. Densidad 2D en PC1 × PC2.</span>
  </div>
  <div style="background: #fef3f2; padding: 1rem; border-radius: 6px;">
    <strong style="color: #e45756;">📈 Distribuciones</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Histogramas + boxplots de features geométricos (ángulos, distancias).</span>
  </div>
  <div style="background: #f3f0ff; padding: 1rem; border-radius: 6px;">
    <strong style="color: #7b52ab;">🔬 Patologías</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Prevalencia por FDI. Heatmap de comorbilidad.</span>
  </div>
</div>

<h3 style="margin-top: 2rem; margin-bottom: 0.8rem;">Escenario 2: Análisis individual</h3>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
  <div style="background: #eef2f7; padding: 1rem; border-radius: 6px;">
    <strong style="color: #4c78a8;">🦷 Odontograma interactivo</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Visualización de la dentadura individual. Click en diente → detalle.</span>
  </div>
  <div style="background: #f0fdf4; padding: 1rem; border-radius: 6px;">
    <strong style="color: #54a24b;">📏 Z-scores por diente</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Desvío respecto a media poblacional. Threshold ±2σ.</span>
  </div>
</div>

<h3 style="margin-top: 2rem; margin-bottom: 0.8rem;">Demo en vivo</h3>

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px; text-align: center; margin: 1.5rem 0;">
  <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 1rem;">
    🌐 Demo interactiva
  </div>
  <div style="font-size: 0.95rem; opacity: 0.9; margin-bottom: 1.5rem;">
    Proyectada en pantalla o accesible desde dispositivo del jurado
  </div>
  <a href="../" target="_blank" style="
    display: inline-block;
    background: white; 
    color: #667eea; 
    padding: 0.8rem 2rem; 
    border-radius: 6px; 
    text-decoration: none; 
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  ">Abrir demo →</a>
</div>

<div style="font-size: 0.9rem; color: #666; margin-top: 1rem;">
  <strong>Nota:</strong> La demo es el observable público. La vista interna para directores (con trazabilidad de cifras y experimentos) está en <code>/directores</code>.
</div>

</div>

</div>

</div>
