---
title: Introducción
---

# Analíticos Visuales para Odontología

```js
import {summaryCards, computeSummary} from "./components/summary-cards.js";
```

```js
const ds = await FileAttachment("data/dataset_stats.json").json();
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const metadata = await FileAttachment("data/metadata.json").json();
const symmetryData = await FileAttachment("data/symmetry_pairs.json").json();
const occlusionData = await FileAttachment("data/occlusion.json").json();
const prevalenceData = await FileAttachment("data/prevalence_by_tooth.json").json();
```

<div style="max-width: 720px; margin-bottom: 2rem; line-height: 1.6; color: #333;">

Este dashboard es el resultado de un proyecto de tesis de maestría que combina
**analíticos visuales** y **visual storytelling** aplicados a un dataset de radiografías
panorámicas dentales anotadas por especialistas.

El objetivo central es transformar ~476.000 anotaciones clínicas en conocimiento
explorable: patrones de prevalencia, geometría poblacional, y comparaciones entre
individuos y subpoblaciones.

</div>

## El dataset

<div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem;">

<div style="background: #f0f4ff; border-left: 4px solid #4c78a8; padding: 1rem 1.4rem; border-radius: 6px; min-width: 180px;">
  <div style="font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Pantomografías</div>
  <div style="font-size: 2.2rem; font-weight: 700; color: #4c78a8; line-height: 1;">${ds.funnel[0].n.toLocaleString("es-AR")}</div>
  <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">en la base de datos</div>
</div>

<div style="background: #f0f7f0; border-left: 4px solid #54a24b; padding: 1rem 1.4rem; border-radius: 6px; min-width: 180px;">
  <div style="font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Universo prevalencias</div>
  <div style="font-size: 2.2rem; font-weight: 700; color: #54a24b; line-height: 1;">${ds.universe_prevalencia.toLocaleString("es-AR")}</div>
  <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">con FDI permanente anotado</div>
</div>

<div style="background: #f5f0ff; border-left: 4px solid #7b52ab; padding: 1rem 1.4rem; border-radius: 6px; min-width: 180px;">
  <div style="font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Universo geometría</div>
  <div style="font-size: 2.2rem; font-weight: 700; color: #7b52ab; line-height: 1;">${ds.universe_kde.toLocaleString("es-AR")}</div>
  <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">con landmarks condíleos</div>
</div>

<div style="background: #fff8f0; border-left: 4px solid #f58518; padding: 1rem 1.4rem; border-radius: 6px; min-width: 180px;">
  <div style="font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Shapes anotadas</div>
  <div style="font-size: 2.2rem; font-weight: 700; color: #f58518; line-height: 1;">~476k</div>
  <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">contornos, landmarks y entidades</div>
</div>

</div>

## Resumen de hallazgos

<details>
<summary>Cómo leer estas tarjetas</summary>

Cada tarjeta resume una dimensión distinta de los hallazgos del trabajo:
- **Muestra** — cantidad de pantomografías y dientes incluidos en cada universo de análisis.
- **Salud bucal** — prevalencia agregada de las patologías anotadas en la población.
- **Simetría** — asimetría mediana entre pares homólogos izquierdo/derecho.
- **Geometría** — forma y medidas clínicas medias de las arcadas.
- **Oclusión** — valores medianos de overjet y overbite poblacional.

Cada sección del dashboard profundiza en estas dimensiones.

</details>

```js
const summary = computeSummary({metadata, prevalenceData, symmetryData, occlusionData, toothStats});
display(summaryCards({summary}));
```

## Objetivos

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem;">

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem;">
  <div style="font-weight: 600; color: #333; margin-bottom: 6px;">📊 Análisis exploratorio visual</div>
  <div style="font-size: 0.875rem; color: #555; line-height: 1.5;">Descubrir patrones de prevalencia, geometría dental y distribuciones poblacionales a partir de las anotaciones clínicas.</div>
</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem;">
  <div style="font-weight: 600; color: #333; margin-bottom: 6px;">🦷 Eigendentadura</div>
  <div style="font-size: 0.875rem; color: #555; line-height: 1.5;">Caracterizar la configuración dental media de la población y cuantificar la variabilidad individual usando coordenadas normalizadas por landmarks condíleos.</div>
</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem;">
  <div style="font-weight: 600; color: #333; margin-bottom: 6px;">🔬 Epidemiología de patologías</div>
  <div style="font-size: 0.875rem; color: #555; line-height: 1.5;">Mapear la distribución espacial de hallazgos clínicos, sus co-ocurrencias y patrones de multimorbilidad en la dentadura.</div>
</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem;">
  <div style="font-weight: 600; color: #333; margin-bottom: 6px;">👤 Individuo vs. población</div>
  <div style="font-size: 0.875rem; color: #555; line-height: 1.5;">Posicionar una dentadura individual en el espacio poblacional mediante z-scores, para facilitar interpretación clínica comparativa.</div>
</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem;">
  <div style="font-weight: 600; color: #333; margin-bottom: 6px;">🔀 Subpoblaciones</div>
  <div style="font-size: 0.875rem; color: #555; line-height: 1.5;">Comparar geometría y prevalencia entre centros clínicos y grupos demográficos para detectar sesgos o diferencias sistemáticas.</div>
</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem;">
  <div style="font-weight: 600; color: #333; margin-bottom: 6px;">📖 Visual storytelling</div>
  <div style="font-size: 0.875rem; color: #555; line-height: 1.5;">Transformar los análisis en narrativas visuales accesibles para investigadores, clínicos y gestores sanitarios.</div>
</div>

</div>

## Tabla de contenidos

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1rem; margin: 1rem 0 2rem;">

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4c78a8; border-bottom: 2px solid #4c78a8; padding-bottom: 4px; margin-bottom: 0.5rem;">Universo de datos</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./dataset#embudo-de-filtrado">Embudo de filtrado</a></li>
<li><a href="./dataset#distribucion-de-dientes-anotados-por-pantomografia">Distribución de dientes anotados</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #7b52ab; border-bottom: 2px solid #7b52ab; padding-bottom: 4px; margin-bottom: 0.5rem;">Geometría Dental</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./#mapa-de-densidad-kde">Mapa de densidad (KDE)</a></li>
<li><a href="./#estadisticas-de-los-dientes-seleccionados">Estadísticas por pieza</a></li>
<li><a href="./#boxplots-2-d-dispersion-posicional">Boxplots 2D — Dispersión posicional</a></li>
<li><a href="./#distribucion-angular-por-diente">Distribución angular</a></li>
<li><a href="./#radar-dispersion-angular-por-diente">Radar angular</a></li>
<li><a href="./#dentaduras-tipicas-y-atipicas">Dentaduras típicas y atípicas</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #72b7b2; border-bottom: 2px solid #72b7b2; padding-bottom: 4px; margin-bottom: 0.5rem;">Morfometría clínica</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./morfometria#forma-de-arcada">Forma de arcada</a></li>
<li><a href="./morfometria#overbite-y-overjet-proxy-poblacional">Overbite y overjet</a></li>
<li><a href="./morfometria#indice-de-bolton">Índice de Bolton</a></li>
<li><a href="./morfometria#simetria-bilateral">Simetría bilateral</a></li>
<li><a href="./morfometria#overlay-de-los-4-cuadrantes">Overlay de los 4 cuadrantes</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #e45756; border-bottom: 2px solid #e45756; padding-bottom: 4px; margin-bottom: 0.5rem;">Patologías</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./patologias#prevalencia-por-tipo-de-diente">Prevalencia por tipo de diente</a></li>
<li><a href="./patologias#heatmap-fdi-patologia">Heatmap FDI × patología</a></li>
<li><a href="./patologias#prevalencia-de-patologias-por-diente">Prevalencia por diente</a></li>
<li><a href="./patologias#co-ocurrencias-upset-plot">Co-ocurrencias (UpSet)</a></li>
<li><a href="./patologias#multimorbilidad">Multimorbilidad</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #f58518; border-bottom: 2px solid #f58518; padding-bottom: 4px; margin-bottom: 0.5rem;">¿Existen subtipos?</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./clusters#comparacion-de-silhouette">Comparación de Silhouette</a></li>
<li><a href="./clusters#varianza-explicada-pca">Varianza explicada (PCA)</a></li>
<li><a href="./clusters#kmeans">KMeans</a></li>
<li><a href="./clusters#agglomerative-ward">Agglomerative Ward</a></li>
<li><a href="./clusters#gaussian-mixture-gmm">Gaussian Mixture (GMM)</a></li>
<li><a href="./clusters#spectral">Spectral</a></li>
<li><a href="./clusters#hdbscan">HDBSCAN</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #54a24b; border-bottom: 2px solid #54a24b; padding-bottom: 4px; margin-bottom: 0.5rem;">Subpob. — Origen clínico</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./subpoblacion-origen#mapa-kde-comparativo">KDE comparativo</a></li>
<li><a href="./subpoblacion-origen#estadisticas-de-los-dientes-seleccionados">Estadísticas</a></li>
<li><a href="./subpoblacion-origen#diferencia-por-diente-heatmap">Diferencia por diente</a></li>
<li><a href="./subpoblacion-origen#distribuciones-marginales">Distribuciones marginales</a></li>
<li><a href="./subpoblacion-origen#distribucion-angular-comparativa">Distribución angular</a></li>
<li><a href="./subpoblacion-origen#forma-de-arcada-comparativa">Forma de arcada</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #54a24b; border-bottom: 2px solid #54a24b; padding-bottom: 4px; margin-bottom: 0.5rem;">Subpob. — Sexo biológico</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./subpoblacion-genero#mapa-kde-comparativo">KDE comparativo</a></li>
<li><a href="./subpoblacion-genero#estadisticas-de-los-dientes-seleccionados">Estadísticas</a></li>
<li><a href="./subpoblacion-genero#diferencia-por-diente-heatmap">Diferencia por diente</a></li>
<li><a href="./subpoblacion-genero#distribuciones-marginales">Distribuciones marginales</a></li>
<li><a href="./subpoblacion-genero#distribucion-angular-comparativa">Distribución angular</a></li>
<li><a href="./subpoblacion-genero#forma-de-arcada-comparativa">Forma de arcada</a></li>
</ul>
</div>

<div style="border: 1px solid #dde3f0; border-radius: 6px; padding: 0.7rem 1rem;">
<div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #b07aa1; border-bottom: 2px solid #b07aa1; padding-bottom: 4px; margin-bottom: 0.5rem;">Individuo vs Población</div>
<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.83rem; line-height: 2;">
<li><a href="./individuo#seleccion-de-individuo">Selección de individuo</a></li>
<li><a href="./individuo#dentadura-individuo-vs-poblacion">Dentadura vs población</a></li>
<li><a href="./individuo#z-scores-por-diente">Z-scores por diente</a></li>
<li><a href="./individuo#distribucion-angular-individuo-vs-poblacion">Distribución angular</a></li>
<li><a href="./individuo#detalle-de-dientes">Detalle de dientes</a></li>
<li><a href="./individuo#atipicidad-posicional-vs-angular-poblacion-completa">Atipicidad posicional vs angular</a></li>
</ul>
</div>

</div>

<div style="font-size: 0.8rem; color: #999; border-top: 1px solid #eee; padding-top: 0.8rem;">
  Maestría en Explotación de Datos y Descubrimiento del Conocimiento — UBA FCEN · 
  Autor: Lic. Eduardo Miguel Kiszkurno · 
  Directores: Dr. Claudio Delrieux, Dra. Debora Pollicelli
</div>
