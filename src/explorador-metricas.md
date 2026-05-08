---
title: Explorador de muestras
---

# Explorador de muestras

Tabla completa de todas las pantomografías con sus métricas geométricas, morfométricas y de patología. Usá los controles para filtrar y ordenar. Clic en una fila para ver el detalle del individuo.

```js
import {cleanArchivo} from "./components/panto-table.js";
import * as d3 from "d3";
```

```js
const individualsRaw = await FileAttachment("data/individual_scores.json").json();
const browserData    = await FileAttachment("data/pantos_browser.json").json();
const occIndividuals = await FileAttachment("data/occlusion_individuals.json").json();
const boltonData     = await FileAttachment("data/bolton.json").json();

const allPb   = browserData.pantos;
const pbMap   = new Map(allPb.map(p => [p.archivo, p]));
const occMap  = new Map(occIndividuals.map(d => [cleanArchivo(d.json_filename), d]));
const bolMap  = new Map(boltonData.individuals.map(d => [d.short_filename, d]));

// Compute bilateral symmetry (mean |dx_reflect| across homologous pairs)
function computeSymmetry(teeth) {
  if (!teeth || !teeth.length) return null;
  const byFdi = new Map(teeth.map(t => [t.fdi, t]));
  const pairs = [[11,21],[12,22],[13,23],[14,24],[15,25],[16,26],[17,27],[18,28],
                 [41,31],[42,32],[43,33],[44,34],[45,35],[46,36],[47,37],[48,38]];
  let sum = 0, n = 0;
  for (const [a,b] of pairs) {
    const ta = byFdi.get(a), tb = byFdi.get(b);
    if (ta && tb) { sum += Math.hypot(ta.cx + tb.cx, ta.cy - tb.cy); n++; }
  }
  return n > 0 ? sum / n : null;
}

// Join all sources
const joined = individualsRaw.map(d => {
  const sid = cleanArchivo(d.json_filename);
  const pb  = pbMap.get(sid) ?? {};
  const occ = occMap.get(sid) ?? {};
  const bol = bolMap.get(sid) ?? {};
  const sym = computeSymmetry(d.teeth);
  return {
    id:             sid,
    n_teeth:        d.n_teeth,
    z_mean:         d.z_mean,
    z_max:          d.z_max,
    z_pos:          d.z_pos,
    z_ang:          d.z_ang,
    sex:            d.sex ?? null,
    origin:         d.data_origin ?? null,
    denticion:      pb.denticion ?? null,
    fdi_completo:   pb.fdi_completo ?? false,
    lm_completo:    pb.lm_completo  ?? false,
    overjet:        occ.overjet  ?? null,
    overbite:       occ.overbite ?? null,
    bolton_ant:     bol.anterior_ratio  ?? null,
    bolton_ov:      bol.overall_ratio   ?? null,
    bolton_ant_z:   bol.anterior_z ?? null,
    bolton_ov_z:    bol.overall_z  ?? null,
    symmetry:       sym,
    n_caries:       pb.flags?.Caries        ?? 0,
    n_endo:         pb.flags?.Endodoncia    ?? 0,
    n_resto:        pb.flags?.Restauracion  ?? 0,
    n_retenido:     pb.flags?.Retenido      ?? 0,
    n_raiz:         pb.flags?.["Raiz remanente"] ?? 0,
  };
});
```

<!-- ═══════ CONTROLES DE FILTRO ═══════ -->

```js
const fmt3 = d3.format(".3f"), fmt1 = d3.format(".1f");

// z_mean: max threshold (show items with z̄ ≤ value)
const zmAll = joined.map(d => d.z_mean).filter(v => v != null);
const zmMaxInput = Inputs.range([d3.min(zmAll), d3.max(zmAll)], {step: 0.05, value: d3.max(zmAll), label: "z̄ máx"});
const zmMaxFilter = Generators.input(zmMaxInput);

// z_max: max threshold
const zxAll = joined.map(d => d.z_max).filter(v => v != null);
const zxMaxInput = Inputs.range([d3.min(zxAll), d3.max(zxAll)], {step: 0.05, value: d3.max(zxAll), label: "z_max máx"});
const zxMaxFilter = Generators.input(zxMaxInput);

// n_teeth: min threshold
const ntAll = joined.map(d => d.n_teeth).filter(v => v != null);
const ntMinInput = Inputs.range([d3.min(ntAll), d3.max(ntAll)], {step: 1, value: d3.min(ntAll), label: "Dientes mín"});
const ntMinFilter = Generators.input(ntMinInput);

// Categorical filters
const sexOptions = ["Todos", ...new Set(joined.map(d => d.sex).filter(Boolean))];
const sexInput = Inputs.select(sexOptions, {value: "Todos", label: "Sexo"});
const sexFilter = Generators.input(sexInput);

const origOptions = ["Todos", ...new Set(joined.map(d => d.origin).filter(Boolean))];
const origInput = Inputs.select(origOptions, {value: "Todos", label: "Origen"});
const origFilter = Generators.input(origInput);

const dentOptions = ["Todos", ...new Set(joined.map(d => d.denticion).filter(Boolean))];
const dentInput = Inputs.select(dentOptions, {value: "Todos", label: "Dentición"});
const dentFilter = Generators.input(dentInput);

// Boolean toggles
const fdiOnlyInput = Inputs.toggle({label: "FDI completo", value: false});
const fdiOnly = Generators.input(fdiOnlyInput);

const lmOnlyInput = Inputs.toggle({label: "LM completos", value: false});
const lmOnly = Generators.input(lmOnlyInput);

const cariesOnlyInput = Inputs.toggle({label: "Con caries", value: false});
const cariesOnly = Generators.input(cariesOnlyInput);

const endoOnlyInput = Inputs.toggle({label: "Con endodoncia", value: false});
const endoOnly = Generators.input(endoOnlyInput);
```

```js
display(html`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.6rem 1.2rem;background:#f9f9fb;border:1px solid #e5e5ec;border-radius:8px;padding:0.9rem 1rem;margin-bottom:1rem;">
  <div>${zmMaxInput}</div>
  <div>${zxMaxInput}</div>
  <div>${ntMinInput}</div>
  <div>${sexInput}</div>
  <div>${origInput}</div>
  <div>${dentInput}</div>
  <div style="display:flex;flex-direction:column;gap:4px;padding-top:4px;">${fdiOnlyInput}${lmOnlyInput}${cariesOnlyInput}${endoOnlyInput}</div>
</div>`);
```

```js
const filtered = joined.filter(d => {
  if (d.z_mean  == null || d.z_mean  > zmMaxFilter) return false;
  if (d.z_max   == null || d.z_max   > zxMaxFilter) return false;
  if (d.n_teeth == null || d.n_teeth < ntMinFilter)  return false;
  if (sexFilter  !== "Todos" && d.sex       !== sexFilter)  return false;
  if (origFilter !== "Todos" && d.origin    !== origFilter) return false;
  if (dentFilter !== "Todos" && d.denticion !== dentFilter) return false;
  if (fdiOnly  && !d.fdi_completo) return false;
  if (lmOnly   && !d.lm_completo)  return false;
  if (cariesOnly && d.n_caries === 0) return false;
  if (endoOnly   && d.n_endo   === 0) return false;
  return true;
});
```

```js
display(html`<div style="font-size:12px;color:#888;margin:0.2rem 0 0.5rem;">
  Mostrando <strong>${filtered.length.toLocaleString("es-AR")}</strong> de ${joined.length.toLocaleString("es-AR")} muestras.
</div>`);
```

<!-- ═══════ TABLA PRINCIPAL ═══════ -->

```js
const tableEl = Inputs.table(filtered, {
  columns: ["id","n_teeth","z_mean","z_max","z_pos","z_ang","symmetry","overjet","overbite","bolton_ant","bolton_ov","sex","origin","denticion","fdi_completo","n_caries","n_endo","n_resto"],
  header: {
    id:"Archivo", n_teeth:"N°", z_mean:"z̄", z_max:"z_max",
    z_pos:"z_pos", z_ang:"z_ang", symmetry:"Asimetría",
    overjet:"Overjet", overbite:"Overbite",
    bolton_ant:"Bolton ant", bolton_ov:"Bolton total",
    sex:"Sexo", origin:"Origen", denticion:"Dentición",
    fdi_completo:"FDI", n_caries:"Caries", n_endo:"Endo", n_resto:"Resto",
  },
  format: {
    z_mean:    v => v != null ? fmt1(v) : "—",
    z_max:     v => v != null ? fmt1(v) : "—",
    z_pos:     v => v != null ? fmt1(v) : "—",
    z_ang:     v => v != null ? fmt1(v) : "—",
    symmetry:  v => v != null ? fmt3(v) : "—",
    overjet:   v => v != null ? fmt3(v) : "—",
    overbite:  v => v != null ? fmt3(v) : "—",
    bolton_ant: v => v != null ? fmt1(v)+"%" : "—",
    bolton_ov:  v => v != null ? fmt1(v)+"%" : "—",
    fdi_completo: v => v ? "✓" : "—",
    sex:    v => v ?? "—",
    origin: v => v ?? "—",
    denticion: v => v ?? "—",
  },
  width: {id: 160, n_teeth: 45, z_mean:55, z_max:55, z_pos:55, z_ang:55, symmetry:75, overjet:70, overbite:70, bolton_ant:85, bolton_ov:85},
  rows: 20,
  sort: "z_mean",
  reverse: true,
  multiple: false,
});
display(tableEl);
```

<!-- ═══════ PANEL DE DETALLE ═══════ -->

```js
const selectedRow = Generators.input(tableEl);
```

```js
{
  const row = selectedRow;
  if (!row) {
    display(html`<p style="color:#aaa;font-size:13px;margin-top:1rem;">Clic en una fila para ver el detalle del individuo.</p>`);
  } else {
    const d = row;

    // Mini summary bar
    display(html`<div style="border:1px solid #dde3f0;border-radius:8px;padding:1rem 1.2rem;margin-top:1rem;background:#fafbfd;">
      <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.7rem;color:#333;">${d.id}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;">
        ${[
          ["Dientes",   d.n_teeth],
          ["z̄",         d.z_mean  != null ? d.z_mean.toFixed(2)  : "—"],
          ["z_max",     d.z_max   != null ? d.z_max.toFixed(2)   : "—"],
          ["z_pos",     d.z_pos   != null ? d.z_pos.toFixed(2)   : "—"],
          ["z_ang",     d.z_ang   != null ? d.z_ang.toFixed(2)   : "—"],
          ["Asimetría", d.symmetry!= null ? d.symmetry.toFixed(3): "—"],
          ["Overjet",   d.overjet != null ? d.overjet.toFixed(4) : "—"],
          ["Overbite",  d.overbite!= null ? d.overbite.toFixed(4): "—"],
          ["Bolton ant",d.bolton_ant != null ? d.bolton_ant.toFixed(1)+"%" : "—"],
          ["Bolton tot",d.bolton_ov  != null ? d.bolton_ov.toFixed(1)+"%"  : "—"],
          ["Caries",    d.n_caries],
          ["Endo",      d.n_endo],
          ["Origen",    d.origin ?? "—"],
          ["Sexo",      d.sex ?? "—"],
        ].map(([k,v]) => html`<span style="background:#f0f4fa;border:1px solid #dde3f0;border-radius:4px;padding:3px 8px;"><strong>${k}:</strong> ${v}</span>`)}
      </div>
    </div>`);

    // Fetch and display pantomography
    const geom = await fetch(`_file/data/pantos_geometry/${d.id}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (geom) {
      const {pantoSchematic} = await import("./components/panto-schematic.js");
      const c = document.createElement("div");
      c.style.cssText = "border:1px solid #dde3f0;border-radius:8px;padding:6px;background:#fafafa;margin:0.8rem 0;overflow:hidden;";
      pantoSchematic(c, geom, {showBbox:false,showPolygon:true,showCentroids:true,showLabels:true,showDividers:true,showLandmarks:false});
      display(c);
    }

    // Mini scatter showing position vs population
    const {default: d3_} = await import("npm:d3");
    const indivFull = individualsRaw.find(dd => cleanArchivo(dd.json_filename) === d.id);
    if (indivFull) {
      const W = Math.min(width, 520), H = 260;
      const margin = {top:14,right:20,bottom:38,left:46};
      const iW = W-margin.left-margin.right, iH = H-margin.top-margin.bottom;
      const pop = joined.filter(dd => dd.z_mean != null && dd.z_max != null);
      const p99x = d3_.quantile(pop.map(dd => dd.z_mean).sort(d3_.ascending), 0.99);
      const p99y = d3_.quantile(pop.map(dd => dd.z_max).sort(d3_.ascending), 0.99);
      const xS = d3_.scaleLinear().domain([0,p99x]).range([0,iW]);
      const yS = d3_.scaleLinear().domain([0,p99y]).range([iH,0]);
      const svg = d3_.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("font-family","var(--sans-serif, system-ui)");
      svg.append("defs").append("clipPath").attr("id","expl-clip").append("rect").attr("width",iW).attr("height",iH);
      const gO = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);
      gO.append("g").attr("transform",`translate(0,${iH})`).call(d3_.axisBottom(xS).ticks(5)).append("text").attr("x",iW/2).attr("y",32).attr("fill","#555").attr("text-anchor","middle").attr("font-size",10).text("z̄");
      gO.append("g").call(d3_.axisLeft(yS).ticks(4)).append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-36).attr("fill","#555").attr("text-anchor","middle").attr("font-size",10).text("z_max");
      const gc = gO.append("g").attr("clip-path","url(#expl-clip)");
      gc.selectAll("circle.p").data(pop.filter(dd => dd.z_mean<=p99x&&dd.z_max<=p99y)).join("circle")
        .attr("cx",dd=>xS(dd.z_mean)).attr("cy",dd=>yS(dd.z_max)).attr("r",1.8).attr("fill","#4e79a7").attr("opacity",0.15);
      if (d.z_mean<=p99x && d.z_max<=p99y) {
        gc.append("circle").attr("cx",xS(d.z_mean)).attr("cy",yS(d.z_max)).attr("r",8).attr("fill","none").attr("stroke","#e15759").attr("stroke-width",2);
        gc.append("circle").attr("cx",xS(d.z_mean)).attr("cy",yS(d.z_max)).attr("r",3.5).attr("fill","#e15759");
      }
      display(svg.node());
    }
  }
}
```

<div style="border-left:4px solid #f58518;background:#fff9f0;padding:0.8rem 1rem;margin:2rem 0 0.5rem;border-radius:0 4px 4px 0;font-size:0.9rem;line-height:1.6;">
<strong>Guía de columnas</strong> — <strong>z̄</strong>: atipicidad geométrica media · <strong>z_max</strong>: diente más atípico · <strong>z_pos</strong>: componente posicional · <strong>z_ang</strong>: componente angular · <strong>Asimetría</strong>: media de distancias entre pares homólogos (≈0 = simétrico) · <strong>Overjet/Overbite</strong>: en coordenadas LM-normalized · <strong>Bolton</strong>: razón maxilar/mandibular (%).
</div>
