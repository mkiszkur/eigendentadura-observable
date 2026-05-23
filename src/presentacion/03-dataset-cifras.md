---
title: Slide 3 · El dataset
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {dataFlowSankey} from "../components/data-flow-sankey.js";
display(slideNav(3));
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
  SLIDE 3 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  El dataset
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
  <div style="background: #eef2f7; border-left: 4px solid #4c78a8; padding: 1rem; border-radius: 4px;">
    <div style="font-size: 2.5rem; font-weight: 700; color: #4c78a8;">5.114</div>
    <div style="font-size: 0.9rem; color: #666;">Pantomografías anotadas</div>
  </div>
  <div style="background: #f0fdf4; border-left: 4px solid #54a24b; padding: 1rem; border-radius: 4px;">
    <div style="font-size: 2.5rem; font-weight: 700; color: #54a24b;">146.669</div>
    <div style="font-size: 0.9rem; color: #666;">Dientes identificados</div>
  </div>
  <div style="background: #fef3f2; border-left: 4px solid #e45756; padding: 1rem; border-radius: 4px;">
    <div style="font-size: 2.5rem; font-weight: 700; color: #e45756;">7</div>
    <div style="font-size: 0.9rem; color: #666;">Versiones de esquema JSON</div>
  </div>
</div>

<h3 style="margin-top: 2rem; margin-bottom: 1rem;">Flujo de datos: del universo al corpus</h3>

```js
display(dataFlowSankey({width: Math.min(width, 800), height: 400}));
```

<div style="margin-top: 1rem; font-size: 0.9rem; color: #666; line-height: 1.6;">
  - **5.114 pantos iniciales** (universo completo).<br>
  - **2.704 pantos** con FDI permanente ∧ landmarks condíleos completos → <strong>universo geométrico</strong> (caps. 6–9).<br>
  - **853 pantos** con dentición permanente completa (32 dientes) → <strong>corpus eigendentadura</strong> (cap. 7).
</div>

<h3 style="margin-top: 2rem; margin-bottom: 1rem;">Landmarks anatómicos</h3>

<div style="display: flex; gap: 1.5rem; align-items: flex-start;">
  <div style="flex: 1;">
    <strong>L1 / L2 / L6 / L7:</strong> Condíleos (articulación temporomandibular, ATM). Definen el frame intercondíleo para normalización geométrica.
  </div>
  <div style="flex: 1;">
    <strong>L3 / L4 / L5:</strong> Mentón. No se usan en normalización (alta variabilidad inter-anotador).
  </div>
</div>

<div style="background: #f5f7fa; border-left: 4px solid #7b52ab; padding: 1rem 1.2rem; margin: 1.5rem 0; border-radius: 4px; font-size: 0.95rem;">
  <strong>Cobertura:</strong> ~54 % de pantos tienen landmarks completos (L1–L7). 
  <strong>FDI:</strong> ~54 % tienen FDI identificado por odontólogo.
  <strong>Universo geométrico:</strong> intersección de ambos (2.704 pantos).
</div>

</div>

</div>

</div>
