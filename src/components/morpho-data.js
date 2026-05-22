/**
 * Construye un Map de datos morfométricos per-individual indexado por geo_id,
 * para uso del tab "Morfometría" del panto-modal.
 *
 * Inputs (todos opcionales — se reportan sólo los disponibles):
 *   - bolton:    JSON cargado desde data/bolton.json (campo .individuals)
 *   - occlusion: JSON cargado desde data/occlusion_individuals.json (lista)
 *   - archCurve: JSON cargado desde data/arch_curve_corpus.json (.pantos)
 *
 * Output: Map<geo_id, morphoData> con el shape esperado por panto-modal:
 *   { bolton: {anteriorRatio, overallRatio, anteriorZ, overallZ,
 *              anteriorComplete, overallComplete},
 *     occlusion: {overjet, overbite},
 *     archForm:  {maxDepth, maxWidth, manDepth, manWidth,
 *                 depthScore, depthCluster} }
 */

// Mismo regex usado en tipicidad.md / geo-patologia.md.
function extractGeoId(fn) {
  if (!fn) return null;
  const m = fn.match(/database_original__(.+?)__json_url\.json/);
  return m?.[1] ?? null;
}

export function buildMorphoMap({ bolton, occlusion, archCurve } = {}) {
  const map = new Map();

  const ensure = (geoId) => {
    if (!map.has(geoId)) map.set(geoId, {});
    return map.get(geoId);
  };

  // Bolton individuals
  if (bolton?.individuals && Array.isArray(bolton.individuals)) {
    for (const row of bolton.individuals) {
      const geoId = row.short_filename || extractGeoId(row.json_filename);
      if (!geoId) continue;
      ensure(geoId).bolton = {
        anteriorRatio:    row.anterior_ratio,
        overallRatio:     row.overall_ratio,
        anteriorZ:        row.anterior_z,
        overallZ:         row.overall_z,
        anteriorComplete: row.anterior_complete,
        overallComplete:  row.overall_complete,
      };
    }
  }

  // Occlusión individuals
  if (Array.isArray(occlusion)) {
    for (const row of occlusion) {
      const geoId = extractGeoId(row.json_filename);
      if (!geoId) continue;
      ensure(geoId).occlusion = {
        overjet:  row.overjet,
        overbite: row.overbite,
      };
    }
  }

  // Arch curve corpus (per-panto)
  if (archCurve?.pantos && Array.isArray(archCurve.pantos)) {
    for (const row of archCurve.pantos) {
      const geoId = row.archivo;
      if (!geoId) continue;
      ensure(geoId).archForm = {
        maxDepth:     row.max_arch_depth,
        maxWidth:     row.max_arch_width,
        manDepth:     row.man_arch_depth,
        manWidth:     row.man_arch_width,
        depthScore:   row.arch_depth_score,
        depthCluster: row.arch_depth_cluster,
      };
    }
  }

  return map;
}
