---
title: 6 · Normalización geométrica
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("06"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./05-eda" style="color:#888;">← Cap. 5</a></span>
  <span><a href="./07-eigendentadura" style="color:#888;">Cap. 7 — Eigendentadura →</a></span>
</div>

# 6 · Normalización geométrica

> **Pregunta P2.** ¿Qué normalización geométrica preserva mejor la señal
> anatómica eliminando la variabilidad extrínseca (equipo, recorte,
> posicionamiento)?
> **Respuesta:** normalización por **landmarks condíleos**, con
> evidencia cuantitativa (exp16).

## 6.1 Tres esquemas comparados

| Esquema | Definición | Sufijo | Pros | Contras |
|---|---|---|---|---|
| **raw** | Píxeles crudos | (sin sufijo) | Sin pérdida | Confunde anatomía con resolución de equipo |
| **bbox-norm** | $x/W,\ y/H$ | `*_norm` | Simple, $\in [0,1]$ | Comprime artificialmente la varianza |
| **landmark** | Similitud por L1+L6 ↔ L2+L7 | `*_lm` | Marco intrínseco al paciente | Requiere los 4 landmarks condíleos (cobertura 54%) |

## 6.2 Transformación de similitud (4 GdL)

Para cada centroide dental $(x, y)$:

$$
x_{lm} = \frac{(x - o_x)\cos\theta + (y - o_y)\sin\theta}{d}, \quad
y_{lm} = \frac{-(x - o_x)\sin\theta + (y - o_y)\cos\theta}{d}
$$

con $(o_x, o_y)$ = punto medio entre centros condíleos, $\theta$ = ángulo
del eje intercondíleo, $d$ = distancia intercondílea. Las coordenadas
resultantes son **adimensionales** y directamente comparables entre
pacientes.

```js
// Mock visual del marco condíleo
const w = 520, h = 280;
const svg = d3.create("svg").attr("viewBox", [0, 0, w, h]).attr("width", w).attr("height", h)
  .style("background", "#fafafa").style("border", "1px solid #ddd").style("border-radius", "6px");
// Cabeza estilizada
svg.append("ellipse").attr("cx", w/2).attr("cy", h/2 + 10).attr("rx", 180).attr("ry", 100)
  .attr("fill", "none").attr("stroke", "#ccc").attr("stroke-width", 2);
// Cóndilos
const L = {x: w/2 - 150, y: h/2 - 40};
const R = {x: w/2 + 150, y: h/2 - 40};
const O = {x: (L.x+R.x)/2, y: (L.y+R.y)/2};
svg.append("circle").attr("cx", L.x).attr("cy", L.y).attr("r", 8).attr("fill", "#7b52ab");
svg.append("circle").attr("cx", R.x).attr("cy", R.y).attr("r", 8).attr("fill", "#7b52ab");
svg.append("text").attr("x", L.x - 10).attr("y", L.y - 12).attr("text-anchor", "end").attr("font-size", 12).attr("fill", "#7b52ab").attr("font-weight", 600).text("L1/L6");
svg.append("text").attr("x", R.x + 10).attr("y", R.y - 12).attr("text-anchor", "start").attr("font-size", 12).attr("fill", "#7b52ab").attr("font-weight", 600).text("L2/L7");
// Eje intercondíleo
svg.append("line").attr("x1", L.x).attr("y1", L.y).attr("x2", R.x).attr("y2", R.y).attr("stroke", "#7b52ab").attr("stroke-width", 2).attr("stroke-dasharray", "4 2");
// Origen
svg.append("circle").attr("cx", O.x).attr("cy", O.y).attr("r", 6).attr("fill", "#e45756");
svg.append("text").attr("x", O.x).attr("y", O.y - 12).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#e45756").attr("font-weight", 600).text("origen (o_x, o_y)");
// Dientes ejemplo
const teeth = d3.range(-6, 7).map(i => ({x: O.x + i*22, y: O.y + 70}));
svg.selectAll("rect.tooth").data(teeth).join("rect").attr("class","tooth")
  .attr("x", d=>d.x-7).attr("y", d=>d.y-12).attr("width", 14).attr("height", 24)
  .attr("fill", "#fff").attr("stroke", "#4c78a8");
// Etiqueta de distancia
svg.append("text").attr("x", w/2).attr("y", L.y - 28).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#7b52ab").text("d = distancia intercondílea (escala)");
display(svg.node());
```

### ¿Por qué dos puntos son suficientes?

| Necesidad | GdL | Fuente |
|---|---|---|
| Traslación | 2 | Mid-cóndilo (origen) |
| Rotación | 1 | Ángulo del eje intercondíleo |
| Escala | 1 | Distancia intercondílea |
| **Total** | **4** | **2 puntos = exactamente determinado** |

### ¿Por qué cóndilos y no otros landmarks?

- El eje intercondíleo está en los **extremos** de la imagen, lejos de la variabilidad dental.
- Distancia intercondílea = medida **cefalométrica establecida** en ortodoncia.
- Landmarks mentón (L3/L4) son **más variables** (dependen de morfología mandibular individual).

<details>
<summary>▸ Detalle metodológico — Similitud vs afín (3 puntos)</summary>

Usar 3 puntos no colineales (cóndilos + mentón) define una transformación
afín con escala independiente por eje. Ventaja: corrige distorsión
anisotrópica del equipo. Riesgo: podría **absorber variación anatómica
real** del paciente (un paciente con mandíbula más prognática tendría
distancia condilo-mentón mayor, lo cual queda absorbido como "escala
vertical").

La similitud es la elección conservadora. Los resultados del cap. 8
muestran que la reducción de dispersión con landmarks es marcada en $c_x$
pero menor en $c_y$, abriendo la puerta al modelo afín como **refinamiento
futuro** (ver [cap. 11](./11-conclusiones)).

</details>

---

## 6.3 Cobertura

```js
const cob = [
  {grupo: "Total",                              n: 5114, pct: 100.0, color: "#4c78a8"},
  {grupo: "lm_norm_complete",                   n: 2749, pct:  53.8, color: "#7b52ab"},
  {grupo: "fdi_32_complete",                    n:  853, pct:  16.7, color: "#54a24b"},
  {grupo: "32 FDI + landmarks",                 n:  831, pct:  16.3, color: "#3b1d6e"},
  {grupo: "Universo geométrico (FDI ∧ landmarks)", n: 2704, pct: 52.9, color: "#08306b"},
];
display(Plot.plot({
  width: Math.min(width, 700), height: 200, marginLeft: 220,
  x: {label: "Pantos", grid: true, domain: [0, 5114]},
  y: {label: null, domain: cob.map(c=>c.grupo)},
  marks: [
    Plot.barX(cob, {x: "n", y: "grupo", fill: "color", tip: true}),
    Plot.text(cob, {x: "n", y: "grupo", text: d=>`${d.n.toLocaleString("es-AR")} (${d.pct.toFixed(1)}%)`, dx: 4, textAnchor: "start", fontSize: 11}),
  ],
}));
```

Los campos calculados `lm_norm_complete` y `fdi_32_complete` reemplazan
los flags manuales (con discrepancias chicas pero existentes).

> 📓 `lib/columns.py` · `lib/geometry.py` · `lib/panto/`

---

## 6.4 Resultado central (exp16) — comparación cuantitativa

Sobre la matriz de features 96-dimensional de la eigendentadura
(n = 853 con dentición permanente completa), se midió la **varianza
atribuible a covariables no geométricas** (ancho/alto de imagen y
versión de LabelMe) como $R^2$ multivariado *trace-based*:

```js
const r2 = [
  {esquema: "raw (px)", r2: 0.541, color: "#e45756"},
  {esquema: "*_norm (bbox)", r2: 0.124, color: "#f58518"},
  {esquema: "*_lm (landmark)", r2: 0.054, color: "#54a24b"},
];
display(Plot.plot({
  width: Math.min(width, 600), height: 180, marginLeft: 130,
  x: {label: "R² covariables (↓ mejor)", grid: true, domain: [0, 0.6]},
  y: {label: null, domain: r2.map(r=>r.esquema)},
  marks: [
    Plot.barX(r2, {x: "r2", y: "esquema", fill: "color", tip: true}),
    Plot.text(r2, {x: "r2", y: "esquema", text: d=>d.r2.toFixed(3), dx: 4, textAnchor: "start", fontSize: 12, fontWeight: 600}),
    Plot.ruleX([0]),
  ],
}));
```

**Reducción de 10× respecto al crudo** ($0{,}541 \to 0{,}054$). El esquema
`*_lm` **absorbe la variabilidad extrínseca** (equipo, recorte) que el
esquema raw confunde con anatomía.

### Diagnóstico de "eigenvector de tamaño de imagen"

```js
const pcaDiag = [
  {esquema: "raw", pc1_pct: 51, pr: 2.71, hallazgo: "PC1 es esencialmente un eigenvector de tamaño de imagen"},
  {esquema: "*_lm", pc1_pct: 30, pr: 4.9, hallazgo: "Varianza distribuida en más componentes"},
];
display(html`<table style="width:100%; max-width:760px; border-collapse:collapse; font-size:0.9rem; margin-top:1rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Esquema</th>
    <th style="text-align:right; padding:6px 10px;">% var en PC1</th>
    <th style="text-align:right; padding:6px 10px;">Participation Ratio</th>
    <th style="text-align:left; padding:6px 10px;">Diagnóstico</th>
  </tr></thead>
  <tbody>${pcaDiag.map(r => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 10px; font-family:monospace;">${r.esquema}</td>
    <td style="padding:5px 10px; text-align:right;">${r.pc1_pct}%</td>
    <td style="padding:5px 10px; text-align:right;">${r.pr}</td>
    <td style="padding:5px 10px; color:#555;">${r.hallazgo}</td>
  </tr>`)}</tbody>
</table>`);
```

### Distancias Procrustes entre score-spaces

Las distancias Procrustes normalizadas entre los tres score-spaces PC1..PC10
están en $d^2/\|A\|^2 \in [0{,}77,\ 1{,}21]$: los espacios son
**estructuralmente distintos**. Cambiar la normalización **no es una
rotación** de los componentes, sino una reorganización completa.

> 📓 Cierre completo: `docs/experimentos/16_comparacion_normalizaciones/01_cierre.md`

---

## 6.5 PCA por pieza

```js
const pcaPieza = [
  {variante: "3F-img",  features: "cx_norm, cy_norm, angle_normalized", pc1: 40.0, pc1pc2: 73.4, color: "#bbb"},
  {variante: "3F-lm",   features: "cx_lm, cy_lm, angle_normalized_lm",   pc1: 43.1, pc1pc2: 74.8, color: "#54a24b"},
  {variante: "8F-lm",   features: "+ 5 geométricos (área, compactness, …)", pc1: 39.7, pc1pc2: 61.4, color: "#e45756"},
];
display(html`<table style="width:100%; max-width:780px; border-collapse:collapse; font-size:0.9rem;">
  <thead style="background:#f5f5f5;"><tr>
    <th style="text-align:left; padding:6px 10px;">Variante</th>
    <th style="text-align:left; padding:6px 10px;">Features</th>
    <th style="text-align:right; padding:6px 10px;">PC1 prom</th>
    <th style="text-align:right; padding:6px 10px;">PC1+PC2 prom</th>
  </tr></thead>
  <tbody>${pcaPieza.map(r => html`<tr style="border-bottom:1px solid #eee; background:${r.color}15;">
    <td style="padding:5px 10px; font-weight:600;">${r.variante}</td>
    <td style="padding:5px 10px; font-size:0.82rem; color:#555;">${r.features}</td>
    <td style="padding:5px 10px; text-align:right; font-weight:600;">${r.pc1.toFixed(1)}%</td>
    <td style="padding:5px 10px; text-align:right;">${r.pc1pc2.toFixed(1)}%</td>
  </tr>`)}</tbody>
</table>`);
```

**3F-lm concentra ligeramente más varianza en PC1** (43,1 % vs 40,0 %; PC1+PC2 74,8 % vs 73,4 %). Los **features geométricos adicionales (8F-lm) diluyen la señal posicional**: con 8 features PC1 pasa a estar dominada por `minbbox_area` (28/32 piezas), capturando tamaño pero no estructura posicional. Conclusión: **(cx_lm, cy_lm, angle_normalized_lm) es el set óptimo**.

### Clustering por pieza (K-Means k=2..6)

| Variante | Silhouette | Calinski-H | k mediana | Outliers (|z|>3) |
|---|---|---|---|---|
| 3F-img | 0,260 ± 0,013 | 866 ± 146 | 2 | 2,1 % |
| **3F-lm** | **0,262 ± 0,016** | **902 ± 150** | **2** | **2,0 %** |
| 8F-lm | 0,214 ± 0,031 | 669 ± 102 | 2 | 6,3 % |

Silhouette **+0,8 %** vs imagen; Calinski **+4 %**. **La normalización por landmarks no mejora la separabilidad de subgrupos por pieza** —un resultado negativo coherente con la conclusión del capítulo 9 (P3: ausencia de subgrupos discretos). 8F-lm además remueve 3× más outliers (6,3 % vs 2,0 %), evidenciando distribuciones con colas pesadas: confirma que sumar área/forma agrega ruido, no señal.

> 📓 Notebook 037

---

## 6.6 Sobre la "dispersión intra-pieza"

La normalización por landmarks **aumenta** la std de cx/cy comparada con
la normalización por imagen (cx: $-256\%$, cy: $-62\%$). **No es un
defecto**:

- Normalización por imagen comprime todo al $[0,1]$, lo que reduce std
  artificialmente.
- Normalización por landmarks **escala por distancia intercondílea**,
  revelando la **variabilidad anatómica real** que estaba enmascarada.

Métrica correcta para comparar normalizaciones = **eficiencia del PCA y
calidad de clustering**, no std crudo.

---

## 6.7 Limitaciones

- **Cobertura 46.2%** sin landmarks → análisis sobre toda la población
  requiere bbox-norm como fallback.
- Landmarks L1–L7 son **anotaciones manuales** y tienen variabilidad de
  medición.
- El ángulo del diente dispone de dos versiones: `angle_normalized`
  (frente a la imagen) y `angle_normalized_lm` (rotado por el eje
  intercondíleo). Para coherencia de frame, los análisis con
  coordenadas `*_lm` usan `angle_normalized_lm`; los análisis con
  `*_norm` usan `angle_normalized`. Impacto cuantitativo pequeño
  (Procrustes $d^2/\|A\|^2 = 0{,}012$ entre la variante mixta previa
  y la coherente actual), pero metodológicamente necesario.
- Trabajo futuro: explorar **transformación afín** (3 puntos) en piezas
  donde la similitud sea insuficiente.

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./05-eda" style="color:#888;">← Cap. 5 — EDA</a>
  <a href="./07-eigendentadura" style="color:#4c78a8; font-weight:600;">Cap. 7 — Eigendentadura →</a>
</div>
