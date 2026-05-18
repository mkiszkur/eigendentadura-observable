---
title: Forma del arco
---

# Forma del arco dental

¿Qué tan profundo, simétrico y regular es el arco dental en cada panto? Esta vista materializa el experimento **exp30** ("clustering sobre la curva del arco dental"): ajusta polinomios sobre los centroides de las piezas permanentes en cada arcada y reporta un conjunto interpretable de descriptores —profundidad, anchura, asimetría L/R, R² de fit— por panto.

> **Hallazgo P3 (continuo, no discreto).** El análisis sistemático sobre 11 familias de features (poly2…poly6, FPCA, spline natural, catenaria) sobre **${corpus.n_pantos.toLocaleString("es-AR")} pantos** (universo geométrico canónico) **no** revela subgrupos discretos. Sí aparece un **eje continuo** ortogonal a los ejes previos: arcadas **profundas + regulares** vs **planas + irregulares**, capturado por `arch_depth_score`. Cierre completo en `docs/experimentos/30_clustering_curva_maxilar/99_cierre.md`.

```js
import * as d3 from "d3";
import {openPantoModal} from "./components/panto-modal.js";
```

```js
const corpus    = await FileAttachment("data/arch_curve_corpus.json").json();
const perc      = await FileAttachment("data/arch_features_percentiles.json").json();
const toothStats = await FileAttachment("data/tooth_stats.json").json();
const pantosRaw  = await FileAttachment("data/pantos_browser.json").json();
const pantosMapA = new Map(pantosRaw.pantos.map(p => [p.archivo, p]));
```

```js
// Index corpus por archivo
const corpusMap = new Map(corpus.pantos.map(p => [p.archivo, p]));

// Helpers polinomio (convención numpy.polyfit: coefs decrecientes)
function polyval(coefs, x) {
  let y = 0;
  for (const c of coefs) y = y * x + c;
  return y;
}

// Percentil de un valor en una distribución (búsqueda lineal sobre p5..p95)
function percentile(value, stats) {
  if (value == null || !isFinite(value)) return null;
  const ps = [["p5", 5], ["p25", 25], ["p50", 50], ["p75", 75], ["p95", 95]];
  if (value <= stats.p5) return 5;
  if (value >= stats.p95) return 95;
  for (let i = 0; i < ps.length - 1; i++) {
    const [k1, q1] = ps[i], [k2, q2] = ps[i + 1];
    const v1 = stats[k1], v2 = stats[k2];
    if (value >= v1 && value <= v2) {
      const t = (value - v1) / Math.max(v2 - v1, 1e-9);
      return Math.round(q1 + t * (q2 - q1));
    }
  }
  return null;
}

// Score corpus para densidad
const scoresAll = corpus.pantos
  .map(p => p.arch_depth_score)
  .filter(v => v != null && isFinite(v));
const scoresByCluster = {
  0: corpus.pantos.filter(p => p.arch_depth_cluster === 0).map(p => p.arch_depth_score),
  1: corpus.pantos.filter(p => p.arch_depth_cluster === 1).map(p => p.arch_depth_score),
};
```

<!-- ═══════ E.1  CURVA POR PANTO ═══════ -->

## Curva por panto

```js
const archivosOrdenados = corpus.pantos
  .map(p => p.archivo)
  .sort(d3.ascending);
const archivoInput = Inputs.select(archivosOrdenados, {
  label: "Panto (archivo)",
  value: archivosOrdenados[0],
});
const archivoSel = Generators.input(archivoInput);
```

<div>${archivoInput}</div>

```js
const seleccion = corpusMap.get(archivoSel);
```

```js
// Tarjetas numéricas con percentil
function kpiCard(label, value, statsKey, unitDigits = 3) {
  const stats = perc.percentiles[statsKey];
  const pct = stats && value != null ? percentile(value, stats) : null;
  const valTxt = value == null ? "—" : value.toFixed(unitDigits);
  const pctTxt = pct == null ? "" : ` (p${pct})`;
  return htl.html`<div style="
    background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;
    flex:1;min-width:120px;">
    <div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">${label}</div>
    <div style="font-size:1.05rem;font-weight:600;color:#111827;">${valTxt}<span style="font-weight:400;font-size:0.78rem;color:#6b7280;">${pctTxt}</span></div>
  </div>`;
}
```

```js
display(htl.html`
<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0.5rem 0 0.8rem 0;">
  ${kpiCard("max depth",    seleccion?.max_arch_depth,    "max_arch_depth")}
  ${kpiCard("max width",    seleccion?.max_arch_width,    "max_arch_width")}
  ${kpiCard("max asym L/R", seleccion?.max_arch_asym_LR,  "max_arch_asym_LR")}
  ${kpiCard("max R²",       seleccion?.max_arch_R2_fit,   "max_arch_R2_fit")}
  ${kpiCard("man depth",    seleccion?.man_arch_depth,    "man_arch_depth")}
  ${kpiCard("man width",    seleccion?.man_arch_width,    "man_arch_width")}
  ${kpiCard("man asym L/R", seleccion?.man_arch_asym_LR,  "man_arch_asym_LR")}
  ${kpiCard("man R²",       seleccion?.man_arch_R2_fit,   "man_arch_R2_fit")}
</div>
`);
```

```js
// Plot principal: centroides + curvas grado 2 (línea sólida) y grado 4 (punteada)
function archPlot(panto) {
  if (!panto) return htl.html`<em style="color:#6b7280;">Sin datos.</em>`;
  const xDomain = [-0.85, 0.85];
  const xs = d3.range(xDomain[0], xDomain[1] + 1e-6, 0.01);
  const fit = (coefs) => xs.map(x => ({x, y: polyval(coefs, x)}));
  const maxFit2 = fit(panto.max_d2);
  const maxFit4 = fit(panto.max_d4);
  const manFit2 = fit(panto.man_d2);
  const manFit4 = fit(panto.man_d4);

  const teethMax = panto.max_teeth.map(([fdi, cx, cy]) => ({fdi, cx, cy, arch: "max"}));
  const teethMan = panto.man_teeth.map(([fdi, cx, cy]) => ({fdi, cx, cy, arch: "man"}));

  return Plot.plot({
    width: 720,
    height: 420,
    marginLeft: 50,
    marginBottom: 45,
    grid: true,
    x: {domain: xDomain, label: "x (frame *_lm)"},
    y: {domain: [-0.55, 0.55], reverse: true, label: "y (frame *_lm, ↓ inferior)"},
    color: {
      domain: ["maxilar (grado 2)", "maxilar (grado 4)", "mandibular (grado 2)", "mandibular (grado 4)"],
      range:  ["#dc2626", "#dc2626", "#1d4ed8", "#1d4ed8"],
      legend: true,
    },
    marks: [
      // Curvas grado 2 — línea sólida
      Plot.line(maxFit2, {x: "x", y: "y", stroke: "#dc2626", strokeWidth: 2.4}),
      Plot.line(manFit2, {x: "x", y: "y", stroke: "#1d4ed8", strokeWidth: 2.4}),
      // Curvas grado 4 — línea punteada
      Plot.line(maxFit4, {x: "x", y: "y", stroke: "#dc2626", strokeWidth: 1.6, strokeDasharray: "4 3", opacity: 0.85}),
      Plot.line(manFit4, {x: "x", y: "y", stroke: "#1d4ed8", strokeWidth: 1.6, strokeDasharray: "4 3", opacity: 0.85}),
      // Centroides de las piezas
      Plot.dot(teethMax, {x: "cx", y: "cy", fill: "#dc2626", r: 4.5, stroke: "#fff", strokeWidth: 1}),
      Plot.dot(teethMan, {x: "cx", y: "cy", fill: "#1d4ed8", r: 4.5, stroke: "#fff", strokeWidth: 1}),
      // Etiquetas FDI
      Plot.text(teethMax, {x: "cx", y: "cy", text: d => `${d.fdi}`, dy: -10, fontSize: 9, fill: "#7f1d1d"}),
      Plot.text(teethMan, {x: "cx", y: "cy", text: d => `${d.fdi}`, dy: 12, fontSize: 9, fill: "#1e3a8a"}),
      // Eje sagital
      Plot.ruleX([0], {stroke: "#999", strokeDasharray: "2 3", opacity: 0.5}),
    ],
  });
}
display(archPlot(seleccion));
```

<div style="font-size:0.85rem;color:#4b5563;margin-bottom:1.5rem;">
Línea <span style="color:#dc2626;font-weight:600;">sólida</span> = grado 2 (interpretable, "U abierta vs cerrada"). Línea <span style="color:#dc2626;font-weight:600;">punteada</span> = grado 4 (la usada para G06). Coordenadas en frame <code>*_lm</code> (cóndilos como referencia).
</div>

<!-- ═══════ E.2  DISTRIBUCIÓN DEL CORPUS ═══════ -->

## Distribución del corpus

Histogramas de las **8 features G06** (`depth`, `width`, `apex_x`, `apex_y`, `curv_apex`, `asym_LR`, `R²`, `log_arclen`) sobre los ${corpus.n_pantos.toLocaleString("es-AR")} pantos del corpus. La línea vertical marca el panto seleccionado.

```js
function featureHist(featKey, panto) {
  const values = corpus.pantos.map(p => p[featKey]).filter(v => v != null);
  const stats = perc.percentiles[featKey];
  const sel = panto?.[featKey];
  return Plot.plot({
    width: 230,
    height: 110,
    marginLeft: 35,
    marginBottom: 28,
    marginTop: 18,
    style: {fontSize: 10},
    title: featKey.replace("_arch_", " · "),
    x: {label: null},
    y: {label: null, axis: null},
    marks: [
      Plot.rectY(values, Plot.binX({y: "count"}, {x: d => d, fill: "#e5e7eb", stroke: "#9ca3af", strokeWidth: 0.5})),
      Plot.ruleX([stats?.p50], {stroke: "#6b7280", strokeDasharray: "2 2"}),
      sel != null ? Plot.ruleX([sel], {stroke: "#ef4444", strokeWidth: 2}) : null,
    ].filter(Boolean),
  });
}

function archGrid(prefix, label, panto) {
  const feats = ["depth", "width", "apex_x", "apex_y", "curv_apex", "asym_LR", "R2_fit", "log_arclen"];
  const cells = feats.map(f => featureHist(`${prefix}_arch_${f}`, panto));
  return htl.html`
    <h4 style="margin:0.8rem 0 0.4rem 0;color:${prefix === "max" ? "#dc2626" : "#1d4ed8"};">${label}</h4>
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
      ${cells}
    </div>`;
}

display(htl.html`
  ${archGrid("max", "Maxilar", seleccion)}
  ${archGrid("man", "Mandibular", seleccion)}
`);
```

<!-- ═══════ E.3  SCORE CONTINUO ═══════ -->

## Eje continuo: profundidad/regularidad del arco

`arch_depth_score` es la proyección estandarizada (z-score corpus) sobre el eje μ₀→μ₁ del clustering `G09_spline_kmeans_k2` del exp30. Valores **bajos** → arcadas **planas + irregulares** (R² bajo, asimetría alta, depth baja). Valores **altos** → arcadas **profundas + regulares**. La dicotomía se incluye por reproducibilidad del experimento, pero **la estructura subyacente es continua** (silhouette ≈ 0.36).

```js
function densityKde(values, points = 80) {
  if (values.length === 0) return [];
  const ext = d3.extent(values);
  const bw = 1.06 * d3.deviation(values) * Math.pow(values.length, -1/5);
  const xs = d3.range(ext[0] - bw, ext[1] + bw, (ext[1] - ext[0] + 2*bw) / points);
  return xs.map(x => ({
    x,
    y: d3.mean(values, v => Math.exp(-0.5 * ((x - v) / bw) ** 2)) / (bw * Math.sqrt(2 * Math.PI)),
  }));
}

const kdeC0 = densityKde(scoresByCluster[0]);
const kdeC1 = densityKde(scoresByCluster[1]);
const selScore = seleccion?.arch_depth_score;
const selCluster = seleccion?.arch_depth_cluster;

display(Plot.plot({
  width: 720,
  height: 240,
  marginLeft: 50,
  marginBottom: 40,
  grid: true,
  x: {label: "arch_depth_score (z-score corpus)"},
  y: {label: "densidad", axis: null},
  color: {
    domain: ["cluster 0 (plano · irregular)", "cluster 1 (profundo · regular)"],
    range:  ["#f97316", "#0ea5e9"],
    legend: true,
  },
  marks: [
    Plot.areaY(kdeC0, {x: "x", y: "y", fill: "#f97316", fillOpacity: 0.45}),
    Plot.areaY(kdeC1, {x: "x", y: "y", fill: "#0ea5e9", fillOpacity: 0.45}),
    Plot.line(kdeC0, {x: "x", y: "y", stroke: "#c2410c", strokeWidth: 1.2}),
    Plot.line(kdeC1, {x: "x", y: "y", stroke: "#0369a1", strokeWidth: 1.2}),
    selScore != null
      ? Plot.ruleX([selScore], {stroke: "#111827", strokeWidth: 2})
      : null,
    selScore != null
      ? Plot.text([{x: selScore, label: `score = ${selScore.toFixed(2)}`}],
                  {x: "x", y: 0.05, text: "label", textAnchor: "start", dx: 6,
                   fontWeight: 600, fontSize: 11, fill: "#111827"})
      : null,
  ].filter(Boolean),
}));
```

<div style="font-size:0.85rem;color:#4b5563;margin-bottom:1.5rem;">
Panto seleccionado: <strong>${seleccion ? `score = ${seleccion.arch_depth_score?.toFixed(2) ?? "—"}` : "—"}</strong> →
<span style="color:${selCluster === 0 ? "#c2410c" : selCluster === 1 ? "#0369a1" : "#6b7280"};font-weight:600;">
  ${selCluster === 0 ? "arco plano/irregular" : selCluster === 1 ? "arco profundo/regular" : "sin clasificar"}
</span>.
</div>

<!-- ═══════ E.4  GALERÍA DE EXTREMOS ═══════ -->

## Galería de extremos

Cuatro grupos de 4 pantos según el percentil de `arch_depth_score`: extremos bajos (arcadas planas e irregulares), medianos, extremos altos (arcadas profundas y regulares) y aleatorios. Solo se muestra la curva ajustada de grado 4.

```js
const corpusWithScore = corpus.pantos
  .filter(p => p.arch_depth_score != null)
  .sort((a, b) => a.arch_depth_score - b.arch_depth_score);

function pickRandom(arr, n, seed = 17) {
  // PRNG determinístico para no resamplear en cada render
  let s = seed;
  const rng = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

const mid = Math.floor(corpusWithScore.length / 2);
const tiles = {
  "Más planos / irregulares": corpusWithScore.slice(0, 4),
  "Medianos":                  corpusWithScore.slice(mid - 2, mid + 2),
  "Más profundos / regulares": corpusWithScore.slice(-4).reverse(),
  "Aleatorios":                pickRandom(corpusWithScore, 4),
};

function thumbPlot(panto) {
  const xs = d3.range(-0.85, 0.85 + 1e-6, 0.02);
  const maxLine = xs.map(x => ({x, y: polyval(panto.max_d4, x)}));
  const manLine = xs.map(x => ({x, y: polyval(panto.man_d4, x)}));
  const teethAll = [
    ...panto.max_teeth.map(([fdi, cx, cy]) => ({cx, cy, c: "#dc2626"})),
    ...panto.man_teeth.map(([fdi, cx, cy]) => ({cx, cy, c: "#1d4ed8"})),
  ];
  return Plot.plot({
    width: 170,
    height: 130,
    marginLeft: 5,
    marginRight: 5,
    marginTop: 18,
    marginBottom: 18,
    style: {fontSize: 9},
    x: {domain: [-0.85, 0.85], axis: null},
    y: {domain: [-0.55, 0.55], reverse: true, axis: null},
    marks: [
      Plot.line(maxLine, {x: "x", y: "y", stroke: "#dc2626", strokeWidth: 1.6}),
      Plot.line(manLine, {x: "x", y: "y", stroke: "#1d4ed8", strokeWidth: 1.6}),
      Plot.dot(teethAll, {x: "cx", y: "cy", fill: "c", r: 1.6, stroke: null}),
    ],
  });
}

function tileGroup(title, pantos) {
  return htl.html`
    <div>
      <h4 style="margin:0.5rem 0 0.3rem 0;font-size:0.9rem;">${title}</h4>
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
        ${pantos.map(p => htl.html`
          <div style="cursor:pointer;border:1px solid #e5e7eb;border-radius:4px;padding:4px;background:#fff;"
               onclick=${() => openPantoModal({
                  id: p.archivo,
                  pantoMeta: pantosMapA.get(p.archivo) ?? null,
                  toothStats,
                  extraBadges: [
                    {label: "score", value: p.arch_depth_score?.toFixed(2), color: "#111827"},
                    {label: "cluster", value: p.arch_depth_cluster, color: p.arch_depth_cluster === 1 ? "#0369a1" : "#c2410c"},
                  ],
                })}>
            <div style="font-size:0.7rem;color:#6b7280;text-align:center;">${p.archivo.slice(0, 8)} · ${p.arch_depth_score.toFixed(2)}</div>
            ${thumbPlot(p)}
          </div>`)}
      </div>
    </div>`;
}

display(htl.html`
  <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:1.2rem;">
    ${Object.entries(tiles).map(([t, ps]) => tileGroup(t, ps))}
  </div>
`);
```

---

### Cobertura y fuentes

- **Corpus**: ${corpus.n_pantos.toLocaleString("es-AR")} pantos (universo geométrico canónico del exp30: ≥5 piezas permanentes anotadas en **cada** arcada, frame `*_lm` válido).
- **Features G06** (16 cols en `pantos.csv`): `{max,man}_arch_{depth, width, apex_x, apex_y, curv_apex, asym_LR, R2_fit, log_arclen}`.
- **Eje continuo**: `arch_depth_score` (proyección z-score sobre μ₀→μ₁ del clustering `G09_spline_kmeans_k2`) + `arch_depth_cluster_exp30 ∈ {0, 1}` (dicotomía advertida — la estructura es continua).
- **Pipeline**: `pipeline/stage_40_arch_features.py` reusa `utils/exp30_clustering_curva_maxilar/features.py` y valida byte-igualdad contra los parquets de exp30.
- **Sidecars de esta vista**: `data/arch_curve_corpus.json` (coeficientes deg-2/deg-4 + centroides por panto del corpus), `data/arch_features_percentiles.json` (p5/p25/p50/p75/p95 de las 16 features).
