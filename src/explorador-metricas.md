---
title: Explorador de muestras
---

# Explorador de muestras

Tabla completa de todas las pantomografías con sus métricas geométricas, morfométricas y de patología. Usá los controles para filtrar y ordenar. Clic en una fila para ver el detalle del individuo.

```js
import {cleanArchivo} from "./components/panto-table.js";
import {rangeSlider} from "./components/range-slider.js";
import * as d3 from "d3";
```

```js
const individualsRaw = await FileAttachment("data/individual_scores.json").json();
const browserData    = await FileAttachment("data/pantos_browser.json").json();
const occIndividuals = await FileAttachment("data/occlusion_individuals.json").json();
const boltonData     = await FileAttachment("data/bolton.json").json();

const allPb  = browserData.pantos;
const pbMap  = new Map(allPb.map(p => [p.archivo, p]));
const occMap = new Map(occIndividuals.map(d => [cleanArchivo(d.json_filename), d]));
const bolMap = new Map(boltonData.individuals.map(d => [d.short_filename, d]));

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

const joined = individualsRaw.map(d => {
  const sid = cleanArchivo(d.json_filename);
  const pb  = pbMap.get(sid) ?? {};
  const occ = occMap.get(sid) ?? {};
  const bol = bolMap.get(sid) ?? {};
  return {
    id:           sid,
    n_teeth:      d.n_teeth,
    z_mean:       d.z_mean,
    z_max:        d.z_max,
    z_pos:        d.z_pos,
    z_ang:        d.z_ang,
    sex:          d.sex ?? null,
    origin:       d.data_origin ?? null,
    denticion:    pb.denticion ?? null,
    fdi_completo: pb.fdi_completo ?? false,
    lm_completo:  pb.lm_completo  ?? false,
    overjet:      occ.overjet  ?? null,
    overbite:     occ.overbite ?? null,
    bolton_ant:   bol.anterior_ratio ?? null,
    bolton_ov:    bol.overall_ratio  ?? null,
    symmetry:     computeSymmetry(d.teeth),
    n_caries:     pb.flags?.Caries               ?? 0,
    n_endo:       pb.flags?.Endodoncia           ?? 0,
    n_resto:      pb.flags?.Restauracion         ?? 0,
    n_retenido:   pb.flags?.Retenido             ?? 0,
    n_raiz:       pb.flags?.["Raiz remanente"]   ?? 0,
  };
});
```

```js
// ── Filter elements (created once; no reactive deps beyond static `joined`) ──
const fmt3 = d3.format(".3f"), fmt1 = d3.format(".1f");

function sliderFor(field, label, step, fmtFn) {
  const vals = joined.map(d => d[field]).filter(v => v != null);
  if (!vals.length) return null;
  const mn = d3.min(vals), mx = d3.max(vals);
  return rangeSlider({label, min: mn, max: mx, value: [mn, mx], step,
    format: fmtFn ?? (v => String(v))});
}

const zmSlider  = sliderFor("z_mean",    "z̄",           0.05,  v => v.toFixed(2));
const zxSlider  = sliderFor("z_max",     "z_max",       0.05,  v => v.toFixed(2));
const ntSlider  = sliderFor("n_teeth",   "Dientes",     1,     null);
const symSlider = sliderFor("symmetry",  "Asimetría",   0.005, v => v.toFixed(3));
const ojSlider  = sliderFor("overjet",   "Overjet",     0.005, v => v.toFixed(3));
const obSlider  = sliderFor("overbite",  "Overbite",    0.005, v => v.toFixed(3));
const baSlider  = sliderFor("bolton_ant","Bolton ant",  0.5,   v => v.toFixed(1)+"%");
const boSlider  = sliderFor("bolton_ov", "Bolton total",0.5,   v => v.toFixed(1)+"%");

const sexOptions  = ["Todos", ...new Set(joined.map(d => d.sex).filter(Boolean))];
const origOptions = ["Todos", ...new Set(joined.map(d => d.origin).filter(Boolean))];
const dentOptions = ["Todos", ...new Set(joined.map(d => d.denticion).filter(Boolean))];
const sexInput    = Inputs.select(sexOptions,  {value: "Todos", label: "Sexo"});
const origInput   = Inputs.select(origOptions, {value: "Todos", label: "Origen"});
const dentInput   = Inputs.select(dentOptions, {value: "Todos", label: "Dentición"});

const fdiOnlyInput    = Inputs.toggle({label: "FDI completo",   value: false});
const lmOnlyInput     = Inputs.toggle({label: "LM completos",   value: false});
const cariesOnlyInput = Inputs.toggle({label: "Con caries",     value: false});
const endoOnlyInput   = Inputs.toggle({label: "Con endodoncia", value: false});
```

```js
// ── Reactive generators (one per slider/input) ──
const zmRange  = Generators.input(zmSlider);
const zxRange  = Generators.input(zxSlider);
const ntRange  = Generators.input(ntSlider);
const symRange = symSlider ? Generators.input(symSlider) : null;
const ojRange  = ojSlider  ? Generators.input(ojSlider)  : null;
const obRange  = obSlider  ? Generators.input(obSlider)  : null;
const baRange  = baSlider  ? Generators.input(baSlider)  : null;
const boRange  = boSlider  ? Generators.input(boSlider)  : null;
const sexFilter  = Generators.input(sexInput);
const origFilter = Generators.input(origInput);
const dentFilter = Generators.input(dentInput);
const fdiOnly    = Generators.input(fdiOnlyInput);
const lmOnly     = Generators.input(lmOnlyInput);
const cariesOnly = Generators.input(cariesOnlyInput);
const endoOnly   = Generators.input(endoOnlyInput);
```

```js
// ── Display filters ──
{
  const filtersDiv = document.createElement("details");
  filtersDiv.style.cssText = "border:1px solid #e5e5ec;border-radius:8px;background:#f9f9fb;margin-bottom:0.8rem;";
  const sum = document.createElement("summary");
  sum.style.cssText = "padding:8px 12px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;cursor:pointer;user-select:none;";
  sum.textContent = "Filtros";
  filtersDiv.appendChild(sum);
  const inner = document.createElement("div");
  inner.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.6rem 1.2rem;padding:0.9rem 1rem;border-top:1px solid #e5e5ec;";
  for (const sl of [zmSlider, zxSlider, ntSlider, symSlider, ojSlider, obSlider, baSlider, boSlider]) {
    if (sl) inner.appendChild(sl);
  }
  for (const inp of [sexInput, origInput, dentInput]) {
    const d = document.createElement("div"); d.appendChild(inp); inner.appendChild(d);
  }
  const togDiv = document.createElement("div");
  togDiv.style.cssText = "display:flex;flex-direction:column;gap:4px;padding-top:4px;";
  for (const t of [fdiOnlyInput, lmOnlyInput, cariesOnlyInput, endoOnlyInput]) togDiv.appendChild(t);
  inner.appendChild(togDiv);
  filtersDiv.appendChild(inner);
  display(filtersDiv);
}
```

```js
// ── Filter (lo/hi inlined as local vars) ──
const filtered = joined.filter(d => {
  const [zmLo, zmHi] = zmRange;
  const [zxLo, zxHi] = zxRange;
  const [ntLo, ntHi] = ntRange;
  if (d.z_mean  < zmLo || d.z_mean  > zmHi) return false;
  if (d.z_max   < zxLo || d.z_max   > zxHi) return false;
  if (d.n_teeth < ntLo || d.n_teeth > ntHi)  return false;
  if (symRange && d.symmetry  != null && (d.symmetry  < symRange[0] || d.symmetry  > symRange[1])) return false;
  if (ojRange  && d.overjet   != null && (d.overjet   < ojRange[0]  || d.overjet   > ojRange[1]))  return false;
  if (obRange  && d.overbite  != null && (d.overbite  < obRange[0]  || d.overbite  > obRange[1]))  return false;
  if (baRange  && d.bolton_ant!= null && (d.bolton_ant< baRange[0]  || d.bolton_ant> baRange[1]))  return false;
  if (boRange  && d.bolton_ov != null && (d.bolton_ov < boRange[0]  || d.bolton_ov > boRange[1]))  return false;
  if (sexFilter  !== "Todos" && d.sex       !== sexFilter)  return false;
  if (origFilter !== "Todos" && d.origin    !== origFilter) return false;
  if (dentFilter !== "Todos" && d.denticion !== dentFilter) return false;
  if (fdiOnly    && !d.fdi_completo) return false;
  if (lmOnly     && !d.lm_completo)  return false;
  if (cariesOnly && d.n_caries === 0) return false;
  if (endoOnly   && d.n_endo   === 0) return false;
  return true;
});
```

```js
// ── Pagination state ──
const pageSizeInput = Inputs.select([10, 25, 50, 100], {value: 10, label: "Filas por página"});
const pageSize = Generators.input(pageSizeInput);
const currentPage = Mutable(0);
function goToPage(p) { currentPage.value = p; }
```

```js
{ filtered; pageSize; goToPage(0); }
```

```js
const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
const safePage   = Math.min(currentPage, totalPages - 1);
const pageSlice  = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
```

```js
{
  display(html`<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:0.4rem;">
    <div style="font-size:12px;color:#888;">
      Mostrando <strong>${pageSlice.length}</strong> de <strong>${filtered.length.toLocaleString("es-AR")}</strong> muestras
      (${joined.length.toLocaleString("es-AR")} total)
    </div>
    <div>${pageSizeInput}</div>
  </div>`);
}
```

```js
// ── Tabla — view() muestra y suscribe en una sola celda; sin `rows` para evitar paginación nativa ──
const selectedRow = view(Inputs.table(pageSlice, {
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
    z_mean:     v => v != null ? fmt1(v) : "—",
    z_max:      v => v != null ? fmt1(v) : "—",
    z_pos:      v => v != null ? fmt1(v) : "—",
    z_ang:      v => v != null ? fmt1(v) : "—",
    symmetry:   v => v != null ? fmt3(v) : "—",
    overjet:    v => v != null ? fmt3(v) : "—",
    overbite:   v => v != null ? fmt3(v) : "—",
    bolton_ant: v => v != null ? fmt1(v)+"%" : "—",
    bolton_ov:  v => v != null ? fmt1(v)+"%" : "—",
    fdi_completo: v => v ? "✓" : "—",
    sex:      v => v ?? "—",
    origin:   v => v ?? "—",
    denticion:v => v ?? "—",
  },
  width: {id:160, n_teeth:45, z_mean:55, z_max:55, z_pos:55, z_ang:55, symmetry:75, overjet:70, overbite:70, bolton_ant:85, bolton_ov:85},
  sort: "z_mean",
  reverse: true,
  multiple: false,
}));
```

```js
{
  display(html`<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:4px;font-size:12px;color:#666;">
    <button onclick=${() => goToPage(0)} style="padding:3px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer;" ${safePage===0?"disabled":""}>⏮</button>
    <button onclick=${() => goToPage(Math.max(0,safePage-1))} style="padding:3px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer;" ${safePage===0?"disabled":""}>◀</button>
    <span>Pág. ${safePage+1} / ${totalPages}</span>
    <button onclick=${() => goToPage(Math.min(totalPages-1,safePage+1))} style="padding:3px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer;" ${safePage>=totalPages-1?"disabled":""}>▶</button>
    <button onclick=${() => goToPage(totalPages-1)} style="padding:3px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer;" ${safePage>=totalPages-1?"disabled":""}>⏭</button>
  </div>`);
}
```

<!-- ═══════ PANEL DE DETALLE ═══════ -->

```js
{
  if (!selectedRow) {
    display(html`<p style="color:#aaa;font-size:13px;margin-top:1rem;">Clic en una fila para ver el detalle del individuo.</p>`);
  } else {
    const d = selectedRow;
    display(html`<div style="border:1px solid #dde3f0;border-radius:8px;padding:1rem 1.2rem;margin-top:1rem;background:#fafbfd;">
      <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.7rem;color:#333;">${d.id}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;">
        ${[
          ["Dientes",   d.n_teeth],
          ["z̄",         d.z_mean   != null ? d.z_mean.toFixed(2)   : "—"],
          ["z_max",     d.z_max    != null ? d.z_max.toFixed(2)    : "—"],
          ["z_pos",     d.z_pos    != null ? d.z_pos.toFixed(2)    : "—"],
          ["z_ang",     d.z_ang    != null ? d.z_ang.toFixed(2)    : "—"],
          ["Asimetría", d.symmetry != null ? d.symmetry.toFixed(3) : "—"],
          ["Overjet",   d.overjet  != null ? d.overjet.toFixed(4)  : "—"],
          ["Overbite",  d.overbite != null ? d.overbite.toFixed(4) : "—"],
          ["Bolton ant",d.bolton_ant != null ? d.bolton_ant.toFixed(1)+"%" : "—"],
          ["Bolton tot",d.bolton_ov  != null ? d.bolton_ov.toFixed(1)+"%"  : "—"],
          ["Caries",    d.n_caries],
          ["Endo",      d.n_endo],
          ["Origen",    d.origin ?? "—"],
          ["Sexo",      d.sex    ?? "—"],
        ].map(([k,v]) => html`<span style="background:#f0f4fa;border:1px solid #dde3f0;border-radius:4px;padding:3px 8px;"><strong>${k}:</strong> ${v}</span>`)}
      </div>
    </div>`);

    const geom = await fetch(`_file/data/pantos_geometry/${d.id}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (geom) {
      const {pantoSchematic} = await import("./components/panto-schematic.js");
      const c = document.createElement("div");
      c.style.cssText = "border:1px solid #dde3f0;border-radius:8px;padding:6px;background:#fafafa;margin:0.8rem 0;overflow:hidden;";
      pantoSchematic(c, geom, {showBbox:false,showPolygon:true,showCentroids:true,showLabels:true,showDividers:true,showLandmarks:false});
      display(c);
    }

    const pop = joined.filter(dd => dd.z_pos != null && dd.z_ang != null);
    if (pop.length > 0) {
      const p99x = d3.quantile(pop.map(dd => dd.z_pos).sort(d3.ascending), 0.99);
      const p99y = d3.quantile(pop.map(dd => dd.z_ang).sort(d3.ascending), 0.99);
      const W = Math.min(width, 520), H = 260;
      const margin = {top:14,right:20,bottom:38,left:46};
      const iW = W-margin.left-margin.right, iH = H-margin.top-margin.bottom;
      const xS = d3.scaleLinear().domain([0,p99x]).range([0,iW]);
      const yS = d3.scaleLinear().domain([0,p99y]).range([iH,0]);
      const svg = d3.create("svg").attr("viewBox",[0,0,W,H]).attr("width",W).style("font-family","var(--sans-serif,system-ui)");
      svg.append("defs").append("clipPath").attr("id","expl-clip").append("rect").attr("width",iW).attr("height",iH);
      const gO = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);
      gO.append("g").attr("transform",`translate(0,${iH})`).call(d3.axisBottom(xS).ticks(5))
        .append("text").attr("x",iW/2).attr("y",32).attr("fill","#555").attr("text-anchor","middle").attr("font-size",10).text("z_pos (atipicidad posicional)");
      gO.append("g").call(d3.axisLeft(yS).ticks(4))
        .append("text").attr("transform","rotate(-90)").attr("x",-iH/2).attr("y",-36).attr("fill","#555").attr("text-anchor","middle").attr("font-size",10).text("z_ang (atipicidad angular)");
      const gc = gO.append("g").attr("clip-path","url(#expl-clip)");
      gc.selectAll("circle.p").data(pop.filter(dd => dd.z_pos<=p99x&&dd.z_ang<=p99y)).join("circle")
        .attr("cx",dd=>xS(dd.z_pos)).attr("cy",dd=>yS(dd.z_ang)).attr("r",1.8).attr("fill","#4e79a7").attr("opacity",0.15);
      if (d.z_pos != null && d.z_ang != null && d.z_pos<=p99x && d.z_ang<=p99y) {
        gc.append("circle").attr("cx",xS(d.z_pos)).attr("cy",yS(d.z_ang)).attr("r",8).attr("fill","none").attr("stroke","#e15759").attr("stroke-width",2);
        gc.append("circle").attr("cx",xS(d.z_pos)).attr("cy",yS(d.z_ang)).attr("r",3.5).attr("fill","#e15759");
      }
      display(svg.node());
    }
  }
}
```

<div style="border-left:4px solid #f58518;background:#fff9f0;padding:0.8rem 1rem;margin:2rem 0 0.5rem;border-radius:0 4px 4px 0;font-size:0.9rem;line-height:1.6;">
<strong>Guía de columnas</strong> — <strong>z̄</strong>: atipicidad geométrica media · <strong>z_max</strong>: diente más atípico · <strong>z_pos</strong>: componente posicional · <strong>z_ang</strong>: componente angular · <strong>Asimetría</strong>: media de distancias entre pares homólogos (≈0 = simétrico) · <strong>Overjet/Overbite</strong>: en coordenadas LM-normalized · <strong>Bolton</strong>: razón maxilar/mandibular (%).
</div>
