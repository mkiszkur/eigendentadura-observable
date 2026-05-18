---
title: Tesis · Vista para directores
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("index"));
```

<div style="background:#1f2937; color:#e5e7eb; padding:0.45rem 1rem; border-radius:4px; font-size:0.78rem; margin:-0.5rem 0 1.4rem; letter-spacing:0.04em;">
  <strong style="color:#fff;">VISTA INTERNA — DIRECTORES</strong> &nbsp;·&nbsp;
  Resumen iterativo del documento de tesis. Cifras y figuras trazadas al
  pipeline / experimentos. No indexado. URL conocida solo por directores.
</div>

# Tesis · Vista para directores

**Autor.** Lic. Eduardo Miguel Kiszkurno
**Directores.** Dr. Claudio Delrieux · Dra. Débora Pollicelli
**Programa.** Maestría en Explotación de Datos y Descubrimiento del Conocimiento — FCEN, UBA

---

## ¿Qué es este sitio?

Una versión **iterativa, visual y resumida** del documento de tesis, pensada para
que los directores puedan **evaluar la metodología** sin leer los ~12 capítulos en prosa.

Cada sección reproduce el contenido del capítulo correspondiente con:

- **KPIs y figuras interactivas** (reusan las del [observable público](../)
  cuando ya existen).
- **Detalle técnico** (fórmulas, estadísticos, $n$, supuestos, tests) en
  bloques colapsables.
- **Trazabilidad**: cada cifra apunta al notebook, stage del pipeline o
  experimento (`expNN`) que la produce.
- **Estado**: se marca explícitamente lo que es resultado consolidado, lo
  que es resultado negativo (parte del aporte), y lo que está pendiente.

> **Lo que NO es este sitio.** No es el observable del usuario clínico
> (ese está en la [home](../) del mismo dominio). No reemplaza al PDF
> final de tesis: lo precede para iterar metodología.

---

## Tabla de contenidos

<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:0.9rem; margin:1rem 0 2rem;">

${tocCard("1", "Introducción", "Preguntas P1–P5, scope, principio rector.", "./01-introduccion", "✅")}
${tocCard("2", "Marco teórico", "PCA, Procrustes, KDE, eigenshape, FDI.", "./02-marco-teorico", "✅")}
${tocCard("3", "Dataset", "5.114 JSON · 7 versiones · errores C1–C9 · cohortes.", "./03-dataset", "★ A FONDO")}
${tocCard("4", "Metodología", "Pipeline ETL, parity check, splits canónicos.", "./04-metodologia", "✅")}
${tocCard("5", "EDA", "Distribuciones, missingness estructural, prevalencias.", "./05-eda", "★ A FONDO")}
${tocCard("6", "Normalización geométrica", "Similitud por landmarks vs. afín · exp16.", "./06-normalizacion", "★ A FONDO")}
${tocCard("7", "Eigendentadura", "PCA global, varianza, ausencia de bimodalidad.", "./07-eigendentadura", "✅")}
${tocCard("8", "Análisis por pieza", "PCA por pieza, KDE, z-scores.", "./08-analisis-por-pieza", "✅")}
${tocCard("9", "Subpoblaciones", "Clustering · género · origen · exp28.", "./09-subpoblaciones", "✅")}
${tocCard("10", "Herramienta", "Arquitectura Observable, stages, deploy.", "./10-herramienta", "🟡")}
${tocCard("11", "Conclusiones", "Respuestas P1–P5, resultados negativos, futuro.", "./11-conclusiones", "✅")}
${tocCard("12", "Anexo experimentos", "exp01–exp28 con cierre y veredicto.", "./12-experimentos", "✅")}

</div>

```js
function tocCard(num, title, sub, href, badge) {
  const badgeColor = badge.startsWith("★") ? "#7b52ab"
                   : badge === "🟡" ? "#f58518"
                   : "#54a24b";
  return html`<a href="${href}" style="display:block; border:1px solid #e0e0e0; border-radius:8px; padding:0.9rem 1.1rem; text-decoration:none; color:#222; background:white; transition:box-shadow 0.15s;">
    <div style="display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.3rem;">
      <span style="font-size:0.7rem; color:#888; font-weight:700; letter-spacing:0.05em;">CAP. ${num}</span>
      <span style="font-size:0.65rem; color:${badgeColor}; font-weight:700; margin-left:auto;">${badge}</span>
    </div>
    <div style="font-weight:600; font-size:1.02rem; margin-bottom:0.25rem;">${title}</div>
    <div style="font-size:0.82rem; color:#555; line-height:1.4;">${sub}</div>
  </a>`;
}
```

---

## Estado del documento

```js
const estado = [
  {sec: "Resumen + introducción + marco", val: "Desarrollo", color: "#54a24b"},
  {sec: "Dataset + metodología + EDA", val: "Desarrollo", color: "#54a24b"},
  {sec: "Normalización + eigendentadura", val: "Desarrollo", color: "#54a24b"},
  {sec: "Análisis por pieza + subpoblaciones", val: "Desarrollo", color: "#54a24b"},
  {sec: "Herramienta (cap. 10)", val: "Parcial", color: "#f58518"},
  {sec: "Conclusiones + referencias + apéndices", val: "Desarrollo", color: "#54a24b"},
];
display(html`<table style="width:100%; max-width:720px; border-collapse:collapse; font-size:0.92rem;">
  ${estado.map(r => html`<tr>
    <td style="padding:6px 12px; border-bottom:1px solid #eee;">${r.sec}</td>
    <td style="padding:6px 12px; border-bottom:1px solid #eee; color:${r.color}; font-weight:600;">${r.val}</td>
  </tr>`)}
</table>`);
```

Trazabilidad completa: capítulo ↔ notebook ↔ experimento ↔ stage del pipeline en
[Cap. 12 — Anexo experimentos](./12-experimentos) y en el repo bajo
`docs/tesis/_revision_2026-05-18.md`.

---

## Convenciones del sitio

- **Cifras**: todas las cifras que aparecen son **reproducibles** desde el
  pipeline o un notebook identificado. Cuando una cifra es preliminar se
  indica con `(prelim)`.
- **Resultados negativos** se reportan con el mismo rigor que los positivos
  (es parte del aporte). No se reframean.
- **Detalle técnico** vive dentro de bloques colapsables marcados
  `▸ Detalle metodológico`.
- **Inserciones de experimentos** pendientes de integración prosística en
  el PDF final se muestran con borde violeta.
- **Hipótesis** (P1–P5) se etiquetan en cada sección donde se las contesta.

<div style="margin-top:2.5rem; padding-top:1rem; border-top:1px solid #ddd; font-size:0.82rem; color:#777;">
  ¿Algo confuso, mal explicado, o sin sustento estadístico? Anotalo y lo
  iteramos. La idea de este sitio es <em>encontrar errores metodológicos
  antes</em> de escribir la versión final en prosa.
</div>
