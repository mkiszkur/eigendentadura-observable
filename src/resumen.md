---
title: Resumen ejecutivo
---

# Resumen ejecutivo

```js
import * as d3 from "d3";
```

```js
const ds             = await FileAttachment("data/dataset_stats.json").json();
const metadata       = await FileAttachment("data/metadata.json").json();
const symmetryData   = await FileAttachment("data/symmetry_pairs.json").json();
const occlusionData  = await FileAttachment("data/occlusion.json").json();
const prevalenceData = await FileAttachment("data/prevalence_by_tooth.json").json();
```

```js
const nWithPath  = ds.pantos.filter(p => p["Patología"]).length;
const nWithTreat = ds.pantos.filter(p => p["Tratamiento"]).length;
const nTotal     = ds.pantos.length;
const totalDientes = d3.sum(prevalenceData.teeth, t => t.n_present);
const cariesFields = ["Caries", "Caries incipiente", "Caries moderada", "Caries avanzada"];
const totalCaries = d3.sum(prevalenceData.teeth, t => d3.sum(cariesFields, f => t[f]?.count ?? 0));
const totalRestauraciones = d3.sum(prevalenceData.teeth, t => t["Restauración"]?.count ?? 0);
const totalRetenidos      = d3.sum(prevalenceData.teeth, t => t["Pieza retenida"]?.count ?? 0);
const totalEndodoncias    = d3.sum(prevalenceData.teeth, t => t["Tratamiento de conducto"]?.count ?? 0);
const symMedian = d3.median(symmetryData.pairs, p => p.stats.distance.median);
const worstPair = symmetryData.pairs.reduce((a, b) => b.stats.distance.median > a.stats.distance.median ? b : a);
```

---

## El dataset

<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(190px,1fr)); gap:1.2rem; margin-bottom:2rem;">

<div style="background:#f0f4ff; border-left:4px solid #4c78a8; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Pantomografías totales</div>
  <div style="font-size:2rem;font-weight:700;color:#4c78a8;line-height:1;">${ds.funnel[0].n.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">en la base de datos</div>
</div>

<div style="background:#f5f0ff; border-left:4px solid #7b52ab; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Dientes anotados</div>
  <div style="font-size:2rem;font-weight:700;color:#7b52ab;line-height:1;">${totalDientes.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">presencias FDI registradas</div>
</div>

<div style="background:#f9f0ff; border-left:4px solid #b07aa1; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Dientes con geometría</div>
  <div style="font-size:2rem;font-weight:700;color:#b07aa1;line-height:1;">${metadata.total_teeth.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">con coordenadas normalizadas</div>
</div>

<div style="background:#fff8f0; border-left:4px solid #f58518; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Anotaciones totales</div>
  <div style="font-size:2rem;font-weight:700;color:#f58518;line-height:1;">~476k</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">shapes, landmarks y entidades</div>
</div>

<div style="background:#f0fff4; border-left:4px solid #54a24b; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Centros clínicos</div>
  <div style="font-size:2rem;font-weight:700;color:#54a24b;line-height:1;">2</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">Centro A y Centro B</div>
</div>

</div>

## Universo de análisis

<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(190px,1fr)); gap:1.2rem; margin-bottom:2rem;">

```js
{
  const colors = ["#4c78a8","#54a24b","#7b52ab","#e45756"];
  for (const [i, step] of ds.funnel.entries()) {
    display(html`<div style="background:${colors[i]}14; border:1px solid ${colors[i]}44; border-radius:6px; padding:1rem 1.2rem;">
      <div style="font-size:0.7rem;color:#777;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${step.label}</div>
      <div style="font-size:2rem;font-weight:700;color:${colors[i]};line-height:1;">${step.n.toLocaleString("es-AR")}</div>
      ${step.excluded ? `<div style="font-size:0.72rem;color:#e15759;margin-top:4px;">−${step.excluded.toLocaleString("es-AR")} ${step.excluded_label}</div>` : ""}
    </div>`);
  }
}
```

</div>

## Epidemiología de patologías

<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(190px,1fr)); gap:1.2rem; margin-bottom:2rem;">

<div style="background:#fff7f7; border-left:4px solid #e45756; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Pantos con patología activa</div>
  <div style="font-size:2rem;font-weight:700;color:#e45756;line-height:1;">${(nWithPath/nTotal*100).toFixed(1)}%</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">${nWithPath.toLocaleString("es-AR")} de ${nTotal.toLocaleString("es-AR")} pantos</div>
</div>

<div style="background:#fff9f0; border-left:4px solid #f58518; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Pantos con tratamiento</div>
  <div style="font-size:2rem;font-weight:700;color:#f58518;line-height:1;">${(nWithTreat/nTotal*100).toFixed(1)}%</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">${nWithTreat.toLocaleString("es-AR")} de ${nTotal.toLocaleString("es-AR")} pantos</div>
</div>

<div style="background:#fff7f7; border-left:4px solid #c0392b; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Dientes con caries</div>
  <div style="font-size:2rem;font-weight:700;color:#c0392b;line-height:1;">${totalCaries.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">incipiente, moderada y avanzada</div>
</div>

<div style="background:#f0f7f0; border-left:4px solid #54a24b; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Restauraciones</div>
  <div style="font-size:2rem;font-weight:700;color:#54a24b;line-height:1;">${totalRestauraciones.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">dientes con restauración registrada</div>
</div>

<div style="background:#f5f0ff; border-left:4px solid #7b52ab; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Endodoncias</div>
  <div style="font-size:2rem;font-weight:700;color:#7b52ab;line-height:1;">${totalEndodoncias.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">tratamientos de conducto</div>
</div>

<div style="background:#f0f4ff; border-left:4px solid #4c78a8; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Piezas retenidas</div>
  <div style="font-size:2rem;font-weight:700;color:#4c78a8;line-height:1;">${totalRetenidos.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">predominantemente 3os molares</div>
</div>

</div>

## Geometría dental

<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(190px,1fr)); gap:1.2rem; margin-bottom:2rem;">

<div style="background:#f5f0ff; border-left:4px solid #7b52ab; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Eigendentadura</div>
  <div style="font-size:2rem;font-weight:700;color:#7b52ab;line-height:1;">${metadata.unique_pantos.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">pantos con forma media calculada</div>
</div>

<div style="background:#f0fff4; border-left:4px solid #54a24b; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Forma de arcada</div>
  <div style="font-size:2rem;font-weight:700;color:#54a24b;line-height:1;">Cuadrada</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">ratio profundidad/ancho &lt; 0.70</div>
</div>

<div style="background:#fff9f0; border-left:4px solid #f58518; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Simetría bilateral</div>
  <div style="font-size:2rem;font-weight:700;color:#f58518;line-height:1;">${symMedian.toFixed(3)}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">distancia mediana entre pares homólogos</div>
</div>

<div style="background:#fff7f7; border-left:4px solid #e45756; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Par menos simétrico</div>
  <div style="font-size:2rem;font-weight:700;color:#e45756;line-height:1;">${worstPair.fdi_r}↔${worstPair.fdi_l}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">mediana: ${worstPair.stats.distance.median.toFixed(3)}</div>
</div>

</div>

## Oclusión (proxy poblacional)

<small>Diferencia de centroides de incisivos centrales en coordenadas landmark-normalized, no en milímetros clínicos.</small>

<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(190px,1fr)); gap:1.2rem; margin:0.8rem 0 2rem;">

<div style="background:#f0f4ff; border-left:4px solid #4c78a8; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Overjet (mediana)</div>
  <div style="font-size:2rem;font-weight:700;color:#4c78a8;line-height:1;">${occlusionData.stats.overjet.median.toFixed(3)}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">IQR [${occlusionData.stats.overjet.q1.toFixed(3)}, ${occlusionData.stats.overjet.q3.toFixed(3)}]</div>
</div>

<div style="background:#f0fff4; border-left:4px solid #54a24b; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Overbite (mediana)</div>
  <div style="font-size:2rem;font-weight:700;color:#54a24b;line-height:1;">${occlusionData.stats.overbite.median.toFixed(3)}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">IQR [${occlusionData.stats.overbite.q1.toFixed(3)}, ${occlusionData.stats.overbite.q3.toFixed(3)}]</div>
</div>

<div style="background:#f5f0ff; border-left:4px solid #7b52ab; padding:1rem 1.2rem; border-radius:6px;">
  <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Dentaduras analizadas</div>
  <div style="font-size:2rem;font-weight:700;color:#7b52ab;line-height:1;">${occlusionData.n_dentitions.toLocaleString("es-AR")}</div>
  <div style="font-size:0.78rem;color:#666;margin-top:4px;">con los 4 incisivos centrales presentes</div>
</div>

</div>
