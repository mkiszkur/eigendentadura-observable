---
title: Slide 8 · Impacto y cierre
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {slideEmphasis} from "../components/slide-layout.js";
display(slideNav(8));
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
  SLIDE 8 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  Impacto y cierre
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

<h3 style="margin-top: 1rem; margin-bottom: 0.8rem;">Contribuciones metodológicas</h3>

<div style="display: grid; gap: 1rem; margin: 1rem 0;">
  <div style="background: #eef2f7; border-left: 4px solid #4c78a8; padding: 1rem 1.2rem; border-radius: 4px;">
    <strong>1. Eigendentadura</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Primera implementación documentada de PCA sobre geometría dental poblacional (96 features). Análogo a eigenfaces, sin precedentes en la literatura.</span>
  </div>
  <div style="background: #f0fdf4; border-left: 4px solid #54a24b; padding: 1rem 1.2rem; border-radius: 4px;">
    <strong>2. Normalización por landmarks condíleos</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Mejora 10× sobre normalización estándar por imagen. Reproducible, basada en anatomía, independiente de escala de adquisición.</span>
  </div>
  <div style="background: #f3f0ff; border-left: 4px solid #7b52ab; padding: 1rem 1.2rem; border-radius: 4px;">
    <strong>3. Pipeline reproducible byte-igual</strong><br>
    <span style="font-size: 0.9rem; color: #666;">39 stages, 7 versiones de JSON reconciliadas, parity check automatizado. Garantiza reproducibilidad científica.</span>
  </div>
  <div style="background: #fef3f2; border-left: 4px solid #e45756; padding: 1rem 1.2rem; border-radius: 4px;">
    <strong>4. Resultados negativos robustos</strong><br>
    <span style="font-size: 0.9rem; color: #666;">Ausencia de subgrupos discretos (P3) y de asociación geometría×patología global (P4). Evidencia de distribución continua, no cluster biology.</span>
  </div>
</div>

<h3 style="margin-top: 2rem; margin-bottom: 0.8rem;">Trabajo futuro</h3>

<div style="font-size: 0.95rem; line-height: 1.7; padding-left: 1rem; border-left: 3px solid #f58518; margin: 1rem 0; color: #666;">
  - **Detector NN de landmarks** (exp04, exp06): refinar con datos de propagación de error (exp15).<br>
  - **Asociaciones locales geometría×patología** (P4): explorar mediante modelos mixtos jerárquicos (pieza anidada en individuo).<br>
  - **Integración con metadata clínica**: origen geográfico, edad, género (hoy parcialmente explorado en exp28).<br>
  - **Validación prospectiva**: aplicar eigendentadura a cohorte nueva (argentina o internacional).
</div>

${slideEmphasis(html`
  <strong style="font-size: 1.2rem;">Impacto esperado</strong><br><br>
  Herramienta de <strong>exploración morfométrica</strong> (no diagnóstico automatizado) para odontólogos e investigadores. Metodología reproducible y extensible a otros contextos anatómicos (cefalometría, ortodoncia).
`, {color: "#7b52ab", background: "#f3f0ff"})}

<div style="
  margin-top: 3rem; 
  text-align: center; 
  padding: 2rem; 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
  border-radius: 8px; 
  color: white;
">
  <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">
    Gracias
  </div>
  <div style="font-size: 1.1rem; opacity: 0.9;">
    ¿Preguntas del jurado?
  </div>
</div>

<div style="margin-top: 2rem; text-align: center; font-size: 0.9rem; color: #666;">
  <strong>Contacto:</strong> eduardo.kiszkurno@example.com (reemplazar con email real)<br>
  <strong>Repo:</strong> github.com/mkiszkur/Tesis<br>
  <strong>Demo:</strong> <a href="../" style="color: #4c78a8; text-decoration: none;">mkiszkur.github.io/eigendentadura-observable</a>
</div>

</div>

</div>

</div>
