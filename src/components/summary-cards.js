import {html} from "npm:htl";
import * as d3 from "npm:d3";

/**
 * Computes population-level summary metrics from the loaded datasets.
 * Pure JS — no DOM. Returns a structured object consumed by `summaryCards`.
 */
export function computeSummary({metadata, prevalenceData, symmetryData, occlusionData, toothStats}) {
  // Top-3 pathologies by global prevalence (any tooth in dentition affected).
  // Aggregate across teeth: a dentition is "affected" if any tooth has the flag.
  // Since the per-tooth prevalence already counts dentitions, we approximate
  // global prevalence as the max across teeth (upper bound) per pathology.
  // For a cleaner global, we use mean across teeth (representative per-tooth).
  const pathologies = prevalenceData.pathologies;
  const teeth = prevalenceData.teeth;
  const nDent = prevalenceData.n_dentitions;

  const pathGlobal = pathologies.map((p) => {
    const vals = teeth.map((t) => t[p]?.prevalence ?? 0);
    const counts = teeth.map((t) => t[p]?.count ?? 0);
    return {
      name: p,
      maxPrev: d3.max(vals),
      meanPrev: d3.mean(vals),
      maxTooth: teeth[d3.maxIndex(vals)]?.fdi,
      totalCount: d3.sum(counts),
    };
  });
  const topPath = [...pathGlobal].sort((a, b) => d3.descending(a.maxPrev, b.maxPrev)).slice(0, 3);

  // Bilateral asymmetry: median across pairs of the median pair-distance.
  const pairDists = symmetryData.pairs.map((p) => p.stats.distance.median);
  const asymMedian = d3.median(pairDists);
  const asymWorstPair = symmetryData.pairs.reduce(
    (acc, p) => (p.stats.distance.median > acc.val ? {val: p.stats.distance.median, pair: p} : acc),
    {val: -Infinity, pair: null}
  );

  // Arch form (population): use mean intercanine/intermolar from toothStats.
  function meanXY(fdi) {
    const t = toothStats.find((x) => x.fdi === fdi);
    return t ? {x: t.mean_x, y: t.mean_y} : null;
  }
  function dist(a, b) {
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  }
  const upperIC = dist(meanXY(13), meanXY(23));
  const upperIM = dist(meanXY(16), meanXY(26));
  const lowerIC = dist(meanXY(43), meanXY(33));
  const lowerIM = dist(meanXY(46), meanXY(36));

  function shapeFromRatio(ic, im) {
    if (!ic || !im) return null;
    const r = ic / im;
    if (r > 0.85) return "Triangular";
    if (r < 0.7) return "Cuadrada";
    return "Ovalada";
  }
  const upperShape = shapeFromRatio(upperIC, upperIM);
  const lowerShape = shapeFromRatio(lowerIC, lowerIM);

  return {
    nDent,
    nDentKDE: metadata.unique_pantos,
    nTeeth: metadata.total_teeth,
    topPath,
    asymMedian,
    asymWorstPair: asymWorstPair.pair,
    upperShape,
    lowerShape,
    upperIC,
    upperIM,
    lowerIC,
    lowerIM,
    overjetMed: occlusionData.stats.overjet.median,
    overjetIQR: [occlusionData.stats.overjet.q1, occlusionData.stats.overjet.q3],
    overbiteMed: occlusionData.stats.overbite.median,
    overbiteIQR: [occlusionData.stats.overbite.q1, occlusionData.stats.overbite.q3],
    nOcclusion: occlusionData.n_dentitions,
  };
}

const fmtPct = d3.format(".1%");
const fmt3 = d3.format(".3f");
const fmtInt = d3.format(",");

function card({title, value, hint, color = "#2c3e50"}) {
  return html`<div style="
    background: white;
    border-left: 4px solid ${color};
    border-radius: 6px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    min-width: 180px;
    flex: 1 1 200px;
  ">
    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#666; font-weight:600; margin-bottom:6px;">${title}</div>
    <div style="font-size:22px; font-weight:700; color:${color}; line-height:1.1;">${value}</div>
    <div style="font-size:11px; color:#777; margin-top:6px; line-height:1.3;">${hint}</div>
  </div>`;
}

/**
 * Renders the executive-summary card grid.
 * Pass the result of `computeSummary` as `summary`.
 */
export function summaryCards({summary}) {
  const s = summary;
  const top = s.topPath;

  const arch =
    s.upperShape && s.lowerShape
      ? s.upperShape === s.lowerShape
        ? s.upperShape
        : `${s.upperShape} / ${s.lowerShape}`
      : "—";

  return html`<div style="
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 12px 0 8px 0;
  ">
    ${card({
      title: "Población",
      value: `${fmtInt(s.nDent)} dentaduras`,
      hint: `${fmtInt(s.nTeeth)} dientes anotados (FDI 11–48)`,
      color: "#2c3e50",
    })}
    ${card({
      title: "Patología más prevalente",
      value: top[0]?.name ?? "—",
      hint: top[0]
        ? `máx ${fmtPct(top[0].maxPrev)} en FDI ${top[0].maxTooth} · top-3: ${top
            .map((p) => p.name)
            .join(", ")}`
        : "",
      color: "#e15759",
    })}
    ${card({
      title: "Asimetría bilateral",
      value: `${fmt3(s.asymMedian)}`,
      hint: `mediana de distancia entre pares homólogos · peor par: ${
        s.asymWorstPair ? `${s.asymWorstPair.fdi_r}↔${s.asymWorstPair.fdi_l}` : "—"
      }`,
      color: "#f28e2b",
    })}
    ${card({
      title: "Forma de arcada",
      value: arch,
      hint: `sup ratio IC/IM = ${s.upperIC && s.upperIM ? fmt3(s.upperIC / s.upperIM) : "—"} · inf = ${
        s.lowerIC && s.lowerIM ? fmt3(s.lowerIC / s.lowerIM) : "—"
      }`,
      color: "#4e79a7",
    })}
    ${card({
      title: "Overjet (mediana)",
      value: fmt3(s.overjetMed),
      hint: `IQR [${fmt3(s.overjetIQR[0])}, ${fmt3(s.overjetIQR[1])}] · n=${fmtInt(s.nOcclusion)}`,
      color: "#59a14f",
    })}
    ${card({
      title: "Overbite (mediana)",
      value: fmt3(s.overbiteMed),
      hint: `IQR [${fmt3(s.overbiteIQR[0])}, ${fmt3(s.overbiteIQR[1])}] · n=${fmtInt(s.nOcclusion)}`,
      color: "#76b7b2",
    })}
  </div>`;
}

/**
 * Renders an inline TOC (navigable index) of the page sections.
 * `sections`: array of {id, label, emoji?}
 */
export function tocNav({sections}) {
  return html`<nav style="
    background: #f7f7f9;
    border: 1px solid #e5e5ea;
    border-radius: 6px;
    padding: 10px 14px;
    margin: 8px 0 18px 0;
    font-size: 13px;
    line-height: 1.7;
  ">
    <strong style="color:#444;">Índice — </strong>
    ${sections.map(
      (s, i) => html`${i > 0 ? " · " : ""}<a href="#${s.id}" style="color:#2c3e50; text-decoration:none; font-weight:500;">${s.label}</a>`
    )}
  </nav>`;
}
