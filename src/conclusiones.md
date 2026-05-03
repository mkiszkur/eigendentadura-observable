---
title: Conclusiones y síntesis
---

# Conclusiones

```js
const ds = await FileAttachment("data/dataset_stats.json").json();
const prevalenceData = await FileAttachment("data/prevalence_by_tooth.json").json();
import * as d3 from "d3";
```

## Hallazgos principales

### Geometría dental poblacional

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin: 1rem 0 1.5rem;">

<div style="border-left: 4px solid #4c78a8; padding: 0.8rem 1rem; background: #f7f9ff;">
  <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Distribución continua, sin subtipos discretos</div>
  <div style="font-size: 0.85rem; color: #555; line-height: 1.5;">Los cinco algoritmos de clustering evaluados (KMeans, Ward, GMM, Spectral, HDBSCAN) arrojan silhouette scores < 0.25 sobre las ${ds.universe_kde.toLocaleString("es-AR")} dentaduras con landmarks. La variabilidad dental en esta población es un continuo, no un conjunto de fenotipos discretos.</div>
</div>

<div style="border-left: 4px solid #7b52ab; padding: 0.8rem 1rem; background: #f9f7ff;">
  <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Alta simetría bilateral poblacional</div>
  <div style="font-size: 0.85rem; color: #555; line-height: 1.5;">La distancia mediana entre pares homólogos (11↔21, 16↔26, etc.) es del orden de 0.02 unidades normalizadas (escala intercondílea = 1.0), lo que indica que la población como conjunto es muy simétrica, aunque con outliers identificables.</div>
</div>

<div style="border-left: 4px solid #54a24b; padding: 0.8rem 1rem; background: #f7fff7;">
  <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Forma de arcada predominantemente cuadrada</div>
  <div style="font-size: 0.85rem; color: #555; line-height: 1.5;">El ratio profundidad/ancho intermolar de la eigendentadura clasifica la arcada como cuadrada (&lt; 0.70), tanto maxilar como mandibular. Este es el primer cálculo de este tipo para esta cohorte.</div>
</div>

</div>

### Epidemiología de patologías

```js
{
  const paths = prevalenceData.pathologies;
  const totalByPath = {};
  for (const p of paths) totalByPath[p] = 0;
  for (const tooth of prevalenceData.teeth) {
    for (const p of paths) totalByPath[p] += tooth[p]?.count ?? 0;
  }
  const sorted = Object.entries(totalByPath).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const n = prevalenceData.n_dentitions;

  const rows = sorted.map(([label, count]) => {
    const pct = (count / (n * 32) * 100).toFixed(2);
    return `<tr>
      <td style="padding: 5px 10px; font-size:0.85rem;">${label}</td>
      <td style="padding: 5px 10px; text-align:right; font-size:0.85rem; font-variant-numeric: tabular-nums;">${count.toLocaleString("es-AR")}</td>
      <td style="padding: 5px 10px; text-align:right; font-size:0.85rem; color:#666;">${pct}%</td>
    </tr>`;
  }).join("");

  display(html`<div style="margin: 1rem 0 1.5rem;">
    <table style="border-collapse: collapse; min-width: 380px;">
      <thead>
        <tr style="border-bottom: 2px solid #ddd;">
          <th style="padding: 6px 10px; text-align:left; font-size:0.8rem; color:#666; font-weight:600;">Patología</th>
          <th style="padding: 6px 10px; text-align:right; font-size:0.8rem; color:#666; font-weight:600;">Casos (dientes)</th>
          <th style="padding: 6px 10px; text-align:right; font-size:0.8rem; color:#666; font-weight:600;">% sobre total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="border-top: 1px solid #eee;">
          <td colspan="3" style="padding: 5px 10px; font-size:0.75rem; color:#999;">
            n = ${n.toLocaleString("es-AR")} dentaduras · % calculado sobre total de dientes presentes en la muestra
          </td>
        </tr>
      </tfoot>
    </table>
  </div>`);
}
```

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin: 0 0 1.5rem;">

<div style="border-left: 4px solid #e45756; padding: 0.8rem 1rem; background: #fff7f7;">
  <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Molares: piezas más afectadas</div>
  <div style="font-size: 0.85rem; color: #555; line-height: 1.5;">Las restauraciones y caries avanzadas se concentran en los primeros y segundos molares (36, 46, 37, 47), consistente con la epidemiología dental conocida y con el mayor esfuerzo masticatorio de estas piezas.</div>
</div>

<div style="border-left: 4px solid #f58518; padding: 0.8rem 1rem; background: #fff9f0;">
  <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Piezas retenidas: terceros molares</div>
  <div style="font-size: 0.85rem; color: #555; line-height: 1.5;">La retención dentaria se concentra casi exclusivamente en los terceros molares (18, 28, 38, 48), con prevalencia notoriamente mayor que cualquier otra pieza, en línea con la literatura clínica.</div>
</div>

<div style="border-left: 4px solid #72b7b2; padding: 0.8rem 1rem; background: #f7fdfd;">
  <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Baja multimorbilidad</div>
  <div style="font-size: 0.85rem; color: #555; line-height: 1.5;">La mayoría de las dentaduras presentan 0 ó 1 tipo de patología. Una fracción pequeña pero clínicamente relevante concentra múltiples hallazgos simultáneos.</div>
</div>

</div>


