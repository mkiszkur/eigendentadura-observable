---
title: 2 · Marco teórico
sidebar: false
head: '<meta name="robots" content="noindex,nofollow">'
---

```js
import {directoresNav} from "../components/directores-nav.js";
display(directoresNav("02"));
```

<div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#888; margin-bottom:1rem;">
  <span><a href="./01-introduccion" style="color:#888;">← Cap. 1</a></span>
  <span><a href="./03-dataset" style="color:#888;">Cap. 3 — Dataset →</a></span>
</div>

# 2 · Marco teórico

## Conceptos centrales

```js
const conceptos = [
  {tag: "Geometría", title: "Notación FDI",
   sub: "Numeración dental estándar ISO. Q1=11–18, Q2=21–28, Q3=31–38, Q4=41–48. 32 piezas permanentes."},
  {tag: "Geometría", title: "Landmarks anatómicos",
   sub: "7 puntos por panto (L1–L7). Cóndilos (L1/L6, L2/L7), mentón (L3/L4) y mid-mentón (L5)."},
  {tag: "Normalización", title: "Transformación de similitud (4 GdL)",
   sub: "Traslación (2) + rotación (1) + escala (1). Determinada exactamente por 2 puntos (cóndilos)."},
  {tag: "Normalización", title: "Análisis Procrustes",
   sub: "Alineación de configuraciones por similitud minimizando SSD. Genera shape space invariante."},
  {tag: "Estadística", title: "PCA",
   sub: "Descomposición en componentes ortogonales por varianza. Base de la eigendentadura."},
  {tag: "Estadística", title: "KDE",
   sub: "Estimación no paramétrica de densidad. Usado para distribución por pieza y outliers."},
  {tag: "Estadística", title: "Z-scores robustos",
   sub: "Mediana y MAD por pieza. Posicionan un individuo en la población sin asumir normalidad."},
  {tag: "Visualización", title: "Visual storytelling",
   sub: "Encadenamiento narrativo de gráficos para construir argumento. Observable + reactividad."},
];
display(html`<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:0.7rem; margin:1rem 0;">
  ${conceptos.map(c => html`<div style="border:1px solid #e8e8e8; border-radius:6px; padding:0.7rem 0.9rem;">
    <div style="font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.2rem;">${c.tag}</div>
    <div style="font-weight:600; margin-bottom:0.25rem;">${c.title}</div>
    <div style="font-size:0.85rem; color:#555; line-height:1.4;">${c.sub}</div>
  </div>`)}
</div>`);
```

## Demos interactivas

Las visualizaciones que siguen son **didácticas**: ilustran los conceptos
operativos del marco teórico sobre ejemplos sintéticos o reducidos, con
controles que permiten al lector manipular los parámetros y observar el
efecto. Los análisis reales sobre el corpus aparecen en los capítulos
correspondientes (cap. 6 normalización, cap. 7 eigendentadura, etc.).

```js
import * as d3 from "d3";
```

### 2.1 Notación FDI — odontograma interactivo

Pasar el cursor sobre cualquier pieza muestra su código FDI y cuadrante.
La numeración FDI es la única convención dental que permite identificar
cualquier diente con dos dígitos: el primero indica el **cuadrante**
(1: superior derecho desde la perspectiva del paciente; 2: superior
izquierdo; 3: inferior izquierdo; 4: inferior derecho); el segundo, la
**posición** desde la línea media (1: incisivo central → 8: tercer
molar).

```js
{
  const qColor = {1: "#4c78a8", 2: "#54a24b", 3: "#f58518", 4: "#e45756"};
  const fdiName = {
    1: "incisivo central", 2: "incisivo lateral", 3: "canino",
    4: "primer premolar", 5: "segundo premolar",
    6: "primer molar", 7: "segundo molar", 8: "tercer molar",
  };
  const rows = [
    {label: "Sup. derecho (Q1)",   q: 1, fdis: [18,17,16,15,14,13,12,11]},
    {label: "Sup. izquierdo (Q2)", q: 2, fdis: [21,22,23,24,25,26,27,28]},
    {label: "Inf. izquierdo (Q3)", q: 3, fdis: [31,32,33,34,35,36,37,38]},
    {label: "Inf. derecho (Q4)",   q: 4, fdis: [48,47,46,45,44,43,42,41]},
  ];
  const tip = document.createElement("div");
  tip.style.cssText = "min-height:1.5em;font-size:0.82rem;color:#444;margin:0.4rem 0;";
  tip.textContent = "Pasá el cursor sobre un diente.";

  const container = document.createElement("div");
  container.style.cssText = "max-width:640px;";
  for (const r of rows) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:4px;margin-bottom:4px;align-items:center;";
    const lab = document.createElement("div");
    lab.textContent = r.label;
    lab.style.cssText = `flex:0 0 130px;font-size:0.78rem;color:${qColor[r.q]};font-weight:600;`;
    row.appendChild(lab);
    for (const fdi of r.fdis) {
      const pos = fdi % 10;
      const cell = document.createElement("div");
      cell.textContent = fdi;
      cell.style.cssText =
        `flex:1 1 0;min-width:0;aspect-ratio:1;background:${qColor[r.q]}18;` +
        `border:1px solid ${qColor[r.q]}55;border-radius:4px;` +
        `display:flex;align-items:center;justify-content:center;` +
        `font-size:0.78rem;color:${qColor[r.q]};font-weight:600;cursor:default;`;
      cell.onmouseenter = () => { tip.textContent = `FDI ${fdi} · cuadrante ${r.q} · ${fdiName[pos]} (posición ${pos})`; };
      cell.onmouseleave = () => { tip.textContent = "Pasá el cursor sobre un diente."; };
      row.appendChild(cell);
    }
    container.appendChild(row);
  }
  container.appendChild(tip);
  display(container);
}
```

### 2.2 Marco condíleo — origen, escala y orientación

La normalización por landmarks proyecta cada panto a un **marco
canónico** definido por los dos cóndilos. El cóndilo izquierdo (L1/L6)
va al $(-1, 0)$, el derecho (L2/L7) va al $(+1, 0)$. El midpoint
intercondilar pasa al origen; la distancia intercondilar se vuelve la
unidad de escala. Cualquier panto queda así expresada en *unidades de
distancia intercondilar*, eliminando rotación, traslación y escala.

```js
{
  const w = 560, h = 220;
  const svg = d3.create("svg").attr("viewBox", `0 0 ${w} ${h}`)
    .attr("style", "max-width:100%;height:auto;background:#fafafa;border:1px solid #eee;border-radius:6px;");
  const cx = w/2, cy = h*0.55, R = 90;
  // Ejes
  svg.append("line").attr("x1", cx-R-50).attr("x2", cx+R+50).attr("y1", cy).attr("y2", cy)
    .attr("stroke", "#bbb").attr("stroke-dasharray", "3,3");
  svg.append("line").attr("x1", cx).attr("x2", cx).attr("y1", cy-90).attr("y2", cy+50)
    .attr("stroke", "#bbb").attr("stroke-dasharray", "3,3");
  // Cóndilos
  const L = {x: cx-R, y: cy}, R2 = {x: cx+R, y: cy};
  svg.append("line").attr("x1", L.x).attr("x2", R2.x).attr("y1", L.y).attr("y2", R2.y)
    .attr("stroke", "#4c78a8").attr("stroke-width", 1.5);
  svg.append("circle").attr("cx", L.x).attr("cy", L.y).attr("r", 6).attr("fill", "#4c78a8");
  svg.append("circle").attr("cx", R2.x).attr("cy", R2.y).attr("r", 6).attr("fill", "#4c78a8");
  svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 4).attr("fill", "#e45756");
  // Arco maxilar esquemático
  const arch = d3.range(-1, 1.01, 0.05).map(t => [cx + t*R*0.85, cy + 35 + 28*(1-t*t)]);
  svg.append("path").attr("d", d3.line().curve(d3.curveCatmullRom)(arch))
    .attr("stroke", "#888").attr("fill", "none").attr("stroke-width", 1.2).attr("stroke-dasharray", "2,2");
  // Labels
  const label = (x, y, text, color="#333", anchor="middle") =>
    svg.append("text").attr("x", x).attr("y", y).attr("text-anchor", anchor)
       .attr("font-size", 11).attr("fill", color).text(text);
  label(L.x, L.y-12, "L1/L6 (cóndilo izq.)", "#4c78a8");
  label(R2.x, R2.y-12, "L2/L7 (cóndilo der.)", "#4c78a8");
  label(cx, cy-12, "origen", "#e45756");
  label(L.x-6, L.y+5, "(−1, 0)", "#666", "end");
  label(R2.x+6, R2.y+5, "(+1, 0)", "#666", "start");
  label(cx, cy+90, "arco maxilar (esquemático)", "#888");
  // Distancia
  svg.append("path").attr("d", `M ${L.x} ${cy+22} L ${L.x} ${cy+30} L ${R2.x} ${cy+30} L ${R2.x} ${cy+22}`)
    .attr("stroke", "#888").attr("fill", "none").attr("stroke-width", 0.8);
  label(cx, cy+42, "d_intercondilar = 2 unidades", "#555");
  display(svg.node());
}
```

### 2.3 Procrustes — alineación de similitud (4 grados de libertad)

Una transformación de similitud combina traslación, rotación y escala
uniforme. Aplicada a una configuración geométrica, **no altera su
forma**: solo la *posiciona* dentro del shape space. Ajustá los sliders
para reproducir el alineamiento manual y comparar con la solución
óptima por mínimos cuadrados:

```js
const procRot   = view(Inputs.range([-180, 180], {value: 0, step: 1, label: "Rotación (°)"}));
const procScale = view(Inputs.range([0.5, 1.5],  {value: 1, step: 0.01, label: "Escala"}));
```

```js
{
  // Configuración de referencia (5 puntos arbitrarios = mini-panto)
  const ref = [[0,0], [1.5,0.3], [3,-0.2], [2.5,-1.8], [0.5,-1.5]];
  // Configuración "movida" generada con rotación 30° + escala 1.2 + translación (4, 1.5)
  const θGT = 30 * Math.PI/180, sGT = 1.2, tGT = [4, 1.5];
  const moved = ref.map(([x,y]) => [
    tGT[0] + sGT*(x*Math.cos(θGT) - y*Math.sin(θGT)),
    tGT[1] + sGT*(x*Math.sin(θGT) + y*Math.cos(θGT)),
  ]);
  // Aplicar transform usuario (inversa para que el alineado ideal sea moved → ref)
  const θ = procRot * Math.PI/180;
  // Centramos en centroide de moved, aplicamos rot+escala inv, comparamos contra ref centrado
  const c = [d3.mean(moved, d=>d[0]), d3.mean(moved, d=>d[1])];
  const refC = [d3.mean(ref, d=>d[0]), d3.mean(ref, d=>d[1])];
  const aligned = moved.map(([x,y]) => {
    const dx = x - c[0], dy = y - c[1];
    return [
      refC[0] + procScale*( dx*Math.cos(-θ) - dy*Math.sin(-θ)),
      refC[1] + procScale*( dx*Math.sin(-θ) + dy*Math.cos(-θ)),
    ];
  });
  const ssd = d3.sum(ref, (p,i) => (p[0]-aligned[i][0])**2 + (p[1]-aligned[i][1])**2);
  // Solución óptima (closed form para similarity Procrustes 2D)
  // Usamos el algoritmo clásico: centrar, computar matriz cruzada, SVD-like via atan2.
  const movedC = moved.map(([x,y]) => [x-c[0], y-c[1]]);
  const refCt  = ref.map(([x,y]) => [x-refC[0], y-refC[1]]);
  let num=0, den=0, sumMovedSq=0;
  for (let i = 0; i < ref.length; i++) {
    num += refCt[i][0]*movedC[i][1] - refCt[i][1]*movedC[i][0];
    den += refCt[i][0]*movedC[i][0] + refCt[i][1]*movedC[i][1];
    sumMovedSq += movedC[i][0]**2 + movedC[i][1]**2;
  }
  // OJO: el ángulo óptimo aplica a movedC → refCt vía rotación inv. Esto es para "deshacer" el θGT.
  const θopt = Math.atan2(-num, den);   // grados que el usuario debería poner
  const sopt = Math.sqrt(den*den + num*num) / sumMovedSq;
  // Plot
  const all = [...ref.map(p=>({x:p[0],y:p[1],kind:"Referencia"})),
               ...aligned.map(p=>({x:p[0],y:p[1],kind:"Alineado (tus params)"}))];
  display(html`<div>
    ${Plot.plot({
      width: 540, height: 320,
      x: {label: "x", domain: [-1, 5]},
      y: {label: "y", domain: [-3, 2.5]},
      color: {legend: true, domain:["Referencia","Alineado (tus params)"], range:["#4c78a8","#e45756"]},
      marks: [
        Plot.dot(all, {x:"x", y:"y", fill:"kind", r:6}),
        Plot.line(ref.concat([ref[0]]), {x:"0", y:"1", stroke:"#4c78a8", strokeWidth:1, strokeDasharray:"2,3"}),
        Plot.line(aligned.concat([aligned[0]]), {x:"0", y:"1", stroke:"#e45756", strokeWidth:1, strokeDasharray:"2,3"}),
      ]
    })}
    <div style="font-size:0.82rem; color:#444; margin-top:0.4rem;">
      <strong>SSD actual:</strong> ${ssd.toFixed(3)}.
      <strong>Óptimo cerrado:</strong> rotación ${(θopt*180/Math.PI).toFixed(1)}°, escala ${sopt.toFixed(3)}
      (esta combinación minimiza SSD entre las dos configuraciones).
    </div>
  </div>`);
}
```

> **Lectura.** Procrustes encuentra exactamente esos cuatro parámetros
> (rotación, escala, dos de traslación) en forma cerrada por mínimos
> cuadrados. Cuando se dispone de un par confiable de landmarks
> (los cóndilos en este trabajo), la transformación queda
> **determinada** y no requiere optimización iterativa.

### 2.4 PCA — descomposición ortogonal por varianza

PCA descompone una nube de puntos en direcciones ortogonales
**ordenadas por varianza explicada**. La primera componente (PC1)
maximiza la varianza proyectada; la segunda (PC2), entre las
ortogonales a PC1, hace lo propio; etc. En la eigendentadura cada
panto es un vector de 96 dimensiones (32 dientes × {cx, cy, ángulo});
PC1 explica ≈ 29,97 % de la varianza total (cap. 7).

Aquí, un ejemplo bidimensional para visualizar el principio:

```js
const corr = view(Inputs.range([-0.95, 0.95], {value: 0.7, step: 0.05, label: "Correlación ρ"}));
```

```js
{
  // Generar nube correlacionada con un PRNG determinístico
  function lcg(seed) { return () => (seed = (seed*1103515245 + 12345) & 0x7fffffff, seed/0x7fffffff); }
  const rnd = lcg(42);
  function norm() {
    const u = Math.max(rnd(), 1e-9), v = rnd();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }
  const n = 300;
  const data = [];
  for (let i = 0; i < n; i++) {
    const a = norm(), b = norm();
    const x = a;
    const y = corr*a + Math.sqrt(1 - corr*corr)*b;
    data.push({x, y});
  }
  const μx = d3.mean(data, d=>d.x), μy = d3.mean(data, d=>d.y);
  let cxx=0, cyy=0, cxy=0;
  for (const d of data) { cxx += (d.x-μx)**2; cyy += (d.y-μy)**2; cxy += (d.x-μx)*(d.y-μy); }
  cxx /= n; cyy /= n; cxy /= n;
  // Eigen 2x2
  const tr = cxx+cyy, det = cxx*cyy - cxy*cxy;
  const λ1 = tr/2 + Math.sqrt(tr*tr/4 - det);
  const λ2 = tr/2 - Math.sqrt(tr*tr/4 - det);
  // Eigenvector para λ1
  const v1 = cxy === 0 ? (cxx > cyy ? [1,0] : [0,1]) : [λ1 - cyy, cxy];
  const n1 = Math.hypot(v1[0], v1[1]); v1[0]/=n1; v1[1]/=n1;
  const v2 = [-v1[1], v1[0]];
  const pc1 = [{x:μx-2*Math.sqrt(λ1)*v1[0], y:μy-2*Math.sqrt(λ1)*v1[1]},
               {x:μx+2*Math.sqrt(λ1)*v1[0], y:μy+2*Math.sqrt(λ1)*v1[1]}];
  const pc2 = [{x:μx-2*Math.sqrt(λ2)*v2[0], y:μy-2*Math.sqrt(λ2)*v2[1]},
               {x:μx+2*Math.sqrt(λ2)*v2[0], y:μy+2*Math.sqrt(λ2)*v2[1]}];
  const pct1 = 100*λ1/(λ1+λ2), pct2 = 100*λ2/(λ1+λ2);
  display(html`<div>
    ${Plot.plot({
      width: 460, height: 340,
      x: {label: "x", domain: [-3.5, 3.5]},
      y: {label: "y", domain: [-3.5, 3.5]},
      marks: [
        Plot.dot(data, {x:"x", y:"y", r:2.5, fill:"#888", fillOpacity:0.55}),
        Plot.line(pc1, {x:"x", y:"y", stroke:"#e45756", strokeWidth:3}),
        Plot.line(pc2, {x:"x", y:"y", stroke:"#4c78a8", strokeWidth:2}),
      ]
    })}
    <div style="font-size:0.82rem; color:#444; margin-top:0.4rem;">
      <span style="color:#e45756; font-weight:600;">PC1</span>: ${pct1.toFixed(1)} %.
      <span style="color:#4c78a8; font-weight:600;">PC2</span>: ${pct2.toFixed(1)} %.
      Cuando ρ → 0 las dos componentes capturan varianza similar
      (la nube es isotrópica). Cuando |ρ| → 1, PC1 domina.
    </div>
  </div>`);
}
```

### 2.5 KDE — estimación no paramétrica de densidad

KDE coloca un kernel gaussiano sobre cada observación y suma:

$$
\hat f(x) = \frac{1}{n h} \sum_{i=1}^{n} K\!\left( \frac{x - x_i}{h} \right),
\qquad K(u) = \frac{1}{\sqrt{2\pi}}\, e^{-u^2/2}.
$$

El **ancho de banda** $h$ controla el suavizado: muy chico, se ve ruido;
muy grande, se pierden modos reales. Ajustá el slider para verlo sobre
una distribución bimodal sintética (parecida a las prevalencias por
pieza que se ven en cap. 5):

```js
const kdeH = view(Inputs.range([0.05, 1.5], {value: 0.4, step: 0.05, label: "Ancho de banda h"}));
```

```js
{
  function lcg(seed) { return () => (seed = (seed*1103515245 + 12345) & 0x7fffffff, seed/0x7fffffff); }
  const rnd = lcg(7);
  function norm() {
    const u = Math.max(rnd(), 1e-9), v = rnd();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }
  const xs = [];
  for (let i = 0; i < 200; i++) xs.push(rnd() < 0.6 ? -1.5 + 0.6*norm() : 1.5 + 0.4*norm());
  const grid = d3.range(-4, 4.01, 0.05);
  const dens = grid.map(g => {
    let s = 0;
    for (const x of xs) s += Math.exp(-0.5*((g-x)/kdeH)**2)/Math.sqrt(2*Math.PI);
    return {x: g, y: s/(xs.length*kdeH)};
  });
  display(Plot.plot({
    width: 560, height: 260,
    x: {label: "x", domain: [-4, 4]},
    y: {label: "Densidad estimada", grid: true},
    marks: [
      Plot.ruleY([0]),
      Plot.areaY(dens, {x:"x", y:"y", fill:"#4c78a8", fillOpacity:0.3}),
      Plot.line(dens, {x:"x", y:"y", stroke:"#4c78a8", strokeWidth:1.6}),
      Plot.tickX(xs.map(x => ({x})), {x:"x", stroke:"#888", strokeOpacity:0.4}),
    ]
  }));
}
```

### 2.6 Z-scores robustos — posicionar al individuo

Para localizar a un paciente individual dentro de la población usamos
**z-scores robustos** basados en mediana y MAD (median absolute
deviation), no en media y desvío estándar. Esto evita que outliers
patológicos inflen el desvío y "tapen" señal genuina. Ajustá $|z|$
para ver el área que queda en la cola **bajo el supuesto gaussiano**
(la población real es ligeramente más pesada en colas, ver cap. 8):

```js
const zCut = view(Inputs.range([0.5, 4], {value: 1.96, step: 0.05, label: "|z| umbral"}));
```

```js
{
  const grid = d3.range(-4, 4.01, 0.05);
  const φ = z => Math.exp(-0.5*z*z)/Math.sqrt(2*Math.PI);
  const dens = grid.map(z => ({z, y: φ(z), tail: Math.abs(z) >= zCut}));
  // Aproximación tail prob: 2*(1 - Φ(z))
  function erf(x) {
    const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1/(1+p*x);
    const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
    return sign*y;
  }
  const Φ = z => 0.5*(1+erf(z/Math.SQRT2));
  const tailProb = 2*(1 - Φ(zCut));
  display(html`<div>
    ${Plot.plot({
      width: 560, height: 240,
      x: {label: "z", domain: [-4, 4]},
      y: {label: "ϕ(z)", grid: true},
      marks: [
        Plot.ruleY([0]),
        Plot.areaY(dens.filter(d=>d.tail), {x:"z", y:"y", fill:"#e45756", fillOpacity:0.55}),
        Plot.areaY(dens.filter(d=>!d.tail), {x:"z", y:"y", fill:"#4c78a8", fillOpacity:0.18}),
        Plot.line(dens, {x:"z", y:"y", stroke:"#222", strokeWidth:1.2}),
        Plot.ruleX([-zCut, zCut], {stroke:"#e45756", strokeDasharray:"3,3"}),
      ]
    })}
    <div style="font-size:0.82rem; color:#444; margin-top:0.4rem;">
      Cola bilateral con $|z| \ge ${zCut.toFixed(2)}$: <strong>${(100*tailProb).toFixed(2)} %</strong>
      bajo gaussiana. En cap. 8 se compara contra la cola empírica observada.
    </div>
  </div>`);
}
```

---

## Eigenshape / eigenfaces como antecedente

La eigendentadura es el análogo dental de la *eigenfaces* (Turk & Pentland, 1991)
y del *Active Shape Model* (Cootes et al., 1995): PCA sobre configuraciones
geométricas previamente alineadas a un marco común. Cada panto se representa
como un vector de $32 \times 3 = 96$ features (cx, cy, ángulo por pieza),
ordenados por FDI.

### Nuestra eigendentadura — dentadura media poblacional

La figura siguiente es la **dentadura media** que sale de promediar los
2.704 pantos del universo geométrico tras normalizar al marco condíleo
(cap. 6). Cada diente se dibuja en su posición media; el rectángulo
representa $\pm 1\sigma$ de variación poblacional en posición; la
orientación es la del ángulo medio del minBBox. Los dos puntos azules
son los cóndilos (origen del marco). Fuente: `tooth_stats_lm.json`.

```js
const toothStatsLM = await FileAttachment("../data/tooth_stats_lm.json").json();
```

```js
{
  // Layout: cóndilos en (-1,0) y (+1,0). El eje y crece hacia abajo en
  // coordenadas de imagen, pero tooth_stats_lm ya está en coords
  // anatómicas (superior arriba, inferior abajo) → invertimos y para
  // que la maxila quede arriba en el SVG.
  const W = 640, H = 360, pad = 30;
  const allX = toothStatsLM.flatMap(t => [t.cx_mean - 2*t.cx_std, t.cx_mean + 2*t.cx_std, -1.05, 1.05]);
  const allY = toothStatsLM.flatMap(t => [t.cy_mean - 2*t.cy_std, t.cy_mean + 2*t.cy_std, 0]);
  const xDom = [d3.min(allX), d3.max(allX)];
  const yDom = [d3.min(allY), d3.max(allY)];
  const sx = d3.scaleLinear().domain(xDom).range([pad, W-pad]);
  // En LM frame, y positivo suele ser hacia abajo (maxilar inferior). Para
  // que la mandíbula superior quede arriba visualmente, invertimos rango.
  const sy = d3.scaleLinear().domain(yDom).range([pad, H-pad]);

  const svg = d3.create("svg").attr("viewBox", `0 0 ${W} ${H}`)
    .attr("style", "max-width:100%;height:auto;background:#fafafa;border:1px solid #eee;border-radius:6px;");

  // Línea media (línea horizontal y=0 entre cóndilos)
  svg.append("line")
    .attr("x1", sx(-1.05)).attr("x2", sx(1.05))
    .attr("y1", sy(0)).attr("y2", sy(0))
    .attr("stroke", "#ddd").attr("stroke-dasharray", "3,3");
  // Línea vertical x=0
  svg.append("line")
    .attr("x1", sx(0)).attr("x2", sx(0))
    .attr("y1", pad).attr("y2", H-pad)
    .attr("stroke", "#eee").attr("stroke-dasharray", "2,3");

  // Cóndilos
  svg.append("circle").attr("cx", sx(-1)).attr("cy", sy(0)).attr("r", 6).attr("fill", "#4c78a8");
  svg.append("circle").attr("cx", sx(1)).attr("cy", sy(0)).attr("r", 6).attr("fill", "#4c78a8");
  svg.append("text").attr("x", sx(-1)).attr("y", sy(0)-12).attr("text-anchor","middle")
     .attr("font-size", 10).attr("fill", "#4c78a8").text("L1/L6");
  svg.append("text").attr("x", sx(1)).attr("y", sy(0)-12).attr("text-anchor","middle")
     .attr("font-size", 10).attr("fill", "#4c78a8").text("L2/L7");

  // Colores por cuadrante
  const qColor = q => ({1: "#4c78a8", 2: "#54a24b", 3: "#f58518", 4: "#e45756"})[q] ?? "#888";
  const qOf = fdi => Math.floor(fdi/10);

  // Dientes: rectángulo orientado al ángulo medio, dimensión proporcional a std
  const teethG = svg.append("g");
  for (const t of toothStatsLM) {
    const q = qOf(t.fdi);
    const c = qColor(q);
    const cx = sx(t.cx_mean), cy = sy(t.cy_mean);
    // Tamaño del rectángulo: ±1σ por cada eje (a escala del plot).
    // Si σ es 0 o muy chico, usamos un mínimo visible.
    const wPx = Math.max(8, 2 * Math.abs(sx(t.cx_mean + t.cx_std) - cx));
    const hPx = Math.max(12, 2 * Math.abs(sy(t.cy_mean + t.cy_std) - cy));
    // angle_mean está en grados; el "ángulo del diente" en LM frame
    // es la inclinación del eje largo del minBBox respecto al eje x.
    const rot = (t.angle_mean - 90); // empíricamente 90° = recto vertical
    const g = teethG.append("g")
      .attr("transform", `translate(${cx},${cy}) rotate(${rot})`);
    g.append("rect")
      .attr("x", -wPx/2).attr("y", -hPx/2)
      .attr("width", wPx).attr("height", hPx)
      .attr("rx", 2)
      .attr("fill", c).attr("fill-opacity", 0.18)
      .attr("stroke", c).attr("stroke-width", 1);
    g.append("text")
      .attr("x", 0).attr("y", 3)
      .attr("text-anchor", "middle")
      .attr("font-size", 8)
      .attr("fill", c)
      .attr("font-weight", 600)
      .text(t.fdi);
  }

  // Leyenda de cuadrantes
  const legend = svg.append("g").attr("transform", `translate(${W-160},${pad})`);
  ["Q1 sup. der.", "Q2 sup. izq.", "Q3 inf. izq.", "Q4 inf. der."].forEach((lbl, i) => {
    legend.append("rect").attr("x", 0).attr("y", i*16).attr("width", 10).attr("height", 10)
      .attr("fill", qColor(i+1)).attr("fill-opacity", 0.4)
      .attr("stroke", qColor(i+1));
    legend.append("text").attr("x", 14).attr("y", i*16+9)
      .attr("font-size", 10).attr("fill", "#444").text(lbl);
  });

  display(svg.node());
}
```

<div style="font-size:0.82rem; color:#555; margin-top:0.3rem;">
  Cada rectángulo: posición media del diente (centro), incertidumbre
  poblacional ±1σ (ancho/alto), orientación media del minBBox
  (rotación). Datos: <code>tooth_stats_lm.json</code> (obtenidos del
  corpus de fitting de cap. 6).
</div>

```js
{
  const ns = toothStatsLM.map(t => t.n);
  display(html`<div style="font-size:0.78rem; color:#888; margin-top:0.1rem;">
    n por diente: <strong>${Math.min(...ns).toLocaleString("es-AR")}</strong>
    a <strong>${Math.max(...ns).toLocaleString("es-AR")}</strong>
    (los terceros molares tienen menos cobertura por agenesia o extracción).
  </div>`);
}
```

> **Lectura.** Esta "media" es la **eigendentadura punto-origen** del
> PCA: $\boldsymbol{\mu} \in \mathbb{R}^{96}$. Los componentes
> principales (PC1, PC2, …) son **deformaciones** ortogonales a partir
> de este origen. PC1 (≈ 30 % de la varianza, ver cap. 7) captura
> principalmente apertura intermolar e inclinación de cuadrantes; PC2
> agrega asimetrías. La visualización iterada de $\boldsymbol{\mu} +
> k\sigma_j \boldsymbol{v}_j$ a lo largo de PCs es el análogo dental
> de las *eigenfaces*.

<details>
<summary>▸ Detalle metodológico — Qué diferencia este trabajo del ASM clásico</summary>

- **No usamos contornos completos** (que requerirían correspondencia de
  cientos de puntos por shape). Trabajamos con un descriptor reducido por
  diente: centroide + ángulo del minBBox.
- **Alineación**: en lugar de Procrustes generalizado sobre landmarks
  densos, alineamos con una transformación de **similitud (4 GdL) sobre
  los 2 cóndilos**. El cap. 6 compara este esquema con `raw` y bbox-norm
  cuantitativamente (exp16).
- **Handling de ausencias**: ASM clásico requiere todas las landmarks
  presentes; aquí trabajamos sobre el universo de pantos con FDI
  completo (n ≈ 853) y separadamente sobre el de PCA-por-pieza
  (n ≈ 2.704), donde no se exige completitud.

</details>

## Cohortes y splits

| Cohorte | n pantos | Uso |
|---|---|---|
| Universo total | 5.114 | EDA general (cap. 5) |
| Universo prevalencias (FDI permanente) | ~4.388 | Prevalencia patologías (cap. 5, 8) |
| Universo geométrico (FDI ∧ landmarks) | 2.704 | PCA por pieza, KDE, normalización (cap. 6, 8) |
| Dentición completa (32 FDI ∧ landmarks) | 831 | Eigendentadura, Procrustes (cap. 7, 9) |

**Splits canónicos para experimentos** (estratificados por nº de dientes):

- **Corpus de fitting**: 2.348 pantos (las estadísticas `tooth_stats_lm.json`
  y `shape_stats_lm.json` se ajustan **solo aquí**).
- **Val**: 257 pantos / 7.099 dientes.
- **Holdout**: 140 pantos / 4.478 dientes (todos `T_completa`).

Los splits **no se mezclan** al evaluar. Documentación en
`docs/experimentos/` y en el cap. 4.

## Referencias clave

Catálogo completo en el documento de tesis (`docs/tesis/12_referencias.md`).
Subset central:

- **Turk & Pentland (1991)** — Eigenfaces. *J. Cognitive Neuroscience.*
- **Cootes et al. (1995)** — Active Shape Models. *CVIU.*
- **Goodall (1991)** — Procrustes methods. *J.R.Stat.Soc. B.*
- **Bookstein (1991)** — Morphometric tools for landmark data.
- **Heimann & Meinzer (2009)** — Statistical shape models for 3D medical
  image segmentation.
- **Wand & Jones (1995)** — Kernel smoothing.
- **OMS / Dean (1991)** — Definiciones de patología dental usadas como flags.

<div style="margin-top:2.5rem; padding-top:0.8rem; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:0.85rem;">
  <a href="./01-introduccion" style="color:#888;">← Cap. 1 — Introducción</a>
  <a href="./03-dataset" style="color:#4c78a8; font-weight:600;">Cap. 3 — Dataset →</a>
</div>
