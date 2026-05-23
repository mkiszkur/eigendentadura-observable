---
title: Slide 5 · Metodología
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {pipelineInfographic} from "../components/pipeline-infographic.js";

const pipelineData = await FileAttachment("../data/pipeline_metadata.json").json();

display(slideNav(5));
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
  SLIDE 5 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  Metodología
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

<h3 style="margin-top: 1rem; margin-bottom: 0.8rem;">Pipeline ETL (39 stages)</h3>

```js
display(pipelineInfographic(pipelineData, {width: Math.min(width, 900), height: 380}));
```

<div style="font-size: 0.9rem; color: #666; margin: 0.5rem 0 1.5rem;">
  JSON (7 versiones) → correcciones automáticas → CSVs tabulares + JSONs para Observable. **Reproducible byte-igual** (parity check).
</div>

<h3 style="margin-top: 2rem; margin-bottom: 0.8rem;">Normalización geométrica</h3>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1rem 0;">
  <div>
    <strong style="color: #4c78a8;">*_norm</strong> (baseline)<br>
    <div style="font-size: 0.9rem; color: #666; margin-top: 0.3rem;">
      Normalización por tamaño de imagen (ancho × alto). Sensible a recorte y escala de adquisición.
    </div>
  </div>
  <div>
    <strong style="color: #54a24b;">*_lm</strong> (elegido)<br>
    <div style="font-size: 0.9rem; color: #666; margin-top: 0.3rem;">
      Normalización por frame intercondíleo: traslación al midpoint L1–L2, rotación por eje condilar, escala por distancia intercondilar.
    </div>
  </div>
</div>

<div style="background: #eef2f7; border-left: 4px solid #4c78a8; padding: 1rem 1.2rem; margin: 1.5rem 0; border-radius: 4px; font-size: 0.95rem;">
  <strong>Resultado clave:</strong> *_lm reduce varianza residual post-Procrustes <strong>10.5×</strong> vs. *_norm (exp16).
</div>

<h3 style="margin-top: 2rem; margin-bottom: 0.8rem;">Eigendentadura (PCA)</h3>

<div style="font-size: 0.95rem; line-height: 1.7;">
  - **Features:** 96 dimensiones = 32 dientes × {$c_x$, $c_y$, $\theta$} (coordenadas *_lm).<br>
  - **Preprocesamiento:** Centrado por diente (resta media poblacional por FDI). Sin estandarización.<br>
  - **Corpus:** 853 pantos con dentición permanente completa.<br>
  - **Interpretación:** PC1 = contracciones laterales + rotaciones molares. PC2 = arch width. PC3 = inclinación anterior-posterior.
</div>

<h3 style="margin-top: 2rem; margin-bottom: 0.8rem;">Validación de paridad</h3>

<div style="font-size: 0.95rem; line-height: 1.7; color: #666;">
  <code style="background: #f5f5f5; padding: 0.2rem 0.5rem; border-radius: 3px; font-family: monospace; font-size: 0.85rem;">python utils/parity_check.py</code> — verifica que el pipeline produce outputs **byte-igual** a los comprometidos en git. Toda modificación en <code>lib/</code> o <code>pipeline/</code> debe pasar parity check o justificar y renovar snapshot. <strong>Garantiza reproducibilidad.</strong>
</div>

</div>

</div>

</div>
