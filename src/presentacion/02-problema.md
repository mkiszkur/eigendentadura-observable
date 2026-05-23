---
title: Slide 2 · El problema
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {slideNav} from "../components/slide-nav.js";
import {slideBullet, slideEmphasis} from "../components/slide-layout.js";
display(slideNav(2));
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
  SLIDE 2 / 8
</div>

<h1 style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 1.5rem; line-height: 1.2;">
  El problema
</h1>

<div style="font-size: 1rem; line-height: 1.8; color: #333;">

${slideEmphasis(html`
  <strong style="font-size: 1.2rem;">¿Cómo se analiza la geometría dental poblacional de forma reproducible y explorable?</strong>
`, {color: "#7b52ab", background: "#f3f0ff"})}

${slideBullet("**Contexto clínico:** La radiografía panorámica (pantomografía) es el estudio de primera línea en odontología. Captura ambas arcadas dentales, ATM, senos maxilares y estructuras adyacentes en una sola imagen.", {icon: "🦷"})}

${slideBullet("**Problema:** Las anotaciones geométricas (posición, orientación, presencia/ausencia de dientes, patologías) se almacenan en JSON heterogéneos (7 versiones de esquema LabelMe) sin un pipeline estándar de análisis.", {icon: "⚠️"})}

${slideBullet("**Oportunidad:** ~5.114 pantomografías anotadas manualmente por odontólogos expertos, con metadata clínica (origen geográfico, género, patologías). Único dataset de esta escala con anotaciones geométricas completas en Argentina.", {icon: "💡"})}

${slideBullet("**Gap:** No hay precedentes de **eigendentadura** (análogo dental a eigenfaces) ni de **normalización por landmarks condíleos** en la literatura. Las herramientas existentes son supervisadas (clasificadores de patologías), no exploratorias.", {icon: "🔍"})}

${slideEmphasis(html`
  <strong>Principio rector:</strong> <em>"Hipótesis non fingo"</em> (Newton, Principia).<br>
  Herramientas agnósticas para que el odontólogo <strong>descubra</strong> patrones, no clasificadores supervisados.
`, {color: "#4c78a8"})}

</div>

</div>

</div>
