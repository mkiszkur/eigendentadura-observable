#!/usr/bin/env python3
"""
Regenera los datos pre-computados para el dashboard Observable.

Ejecutar desde la raíz del proyecto con el venv activado:
    python3 observable/generate_data.py

Genera:
    observable/src/data/tooth_stats.json
    observable/src/data/kde_grids.json
    observable/src/data/metadata.json
    observable/src/data/pantos_browser.json
"""
import ast
import json
import sys
from pathlib import Path

import numpy as np

# Asegurar que lib/ sea importable
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
from lib.kde_por_pieza import exportar_para_observable

output_dir = project_root / "observable" / "src" / "data"

# ============================================================
# 1. KDE por pieza
# ============================================================
print("Cargando shapes.csv...")
shapes = pd.read_csv(project_root / "data" / "csv" / "shapes.csv", low_memory=False)

print("Calculando KDE por pieza (100×100)...")
result = exportar_para_observable(shapes, grid_size=100, output_dir=str(output_dir))

print(f"\nKDE generada:")
print(f"  Dientes: {result['metadata']['total_teeth']:,}")
print(f"  Pantos:  {result['metadata']['unique_pantos']:,}")
print(f"  Grillas: {len(result['kde_grids']['teeth'])} dientes")

# ============================================================
# 2. Pantos browser data
# ============================================================
print("\nGenerando pantos_browser.json...")
pantos = pd.read_csv(project_root / "data" / "csv" / "pantos.csv", low_memory=False)

# Parsear tooth_numbers de string a lista de ints
def parse_tooth_numbers(val):
    if pd.isna(val) or val == '[]':
        return []
    try:
        return [int(x) for x in ast.literal_eval(str(val))]
    except (ValueError, SyntaxError):
        return []

pantos['tooth_numbers_parsed'] = pantos['tooth_numbers'].apply(parse_tooth_numbers)

# Clasificar tipo de dentición
def clasificar_denticion(row):
    if row.get('json_flag_mixed', False):
        return 'Mixta'
    if row.get('json_flag_permanent_complete', False):
        return 'Permanente completa'
    if row.get('json_flag_permanent_incomplete', False):
        return 'Permanente incompleta'
    if row.get('json_flag_temporal', False):
        return 'Temporal'
    return 'Sin clasificar'

pantos['denticion'] = pantos.apply(clasificar_denticion, axis=1)

# Columnas a exportar
CANT_FLAGS = [
    'cant_flags_caries', 'cant_flags_treatments', 'cant_flags_metal',
    'cant_flags_restoration', 'cant_flags_root_canal', 'cant_flags_root_remains',
    'cant_flags_retained', 'cant_flags_radiolucency', 'cant_flags_neoformation',
    'cant_flags_agenesis', 'cant_flags_dental_implant', 'cant_flags_bridge_pillar',
    'cant_flags_orthodontic_brackets',
]

# Nombres cortos para la UI
FLAG_LABELS = {
    'cant_flags_caries': 'Caries',
    'cant_flags_treatments': 'Tratamientos',
    'cant_flags_metal': 'Metal',
    'cant_flags_restoration': 'Restauración',
    'cant_flags_root_canal': 'Endodoncia',
    'cant_flags_root_remains': 'Raíz remanente',
    'cant_flags_retained': 'Retenido',
    'cant_flags_radiolucency': 'Radiolucidez',
    'cant_flags_neoformation': 'Neoformación',
    'cant_flags_agenesis': 'Agenesia',
    'cant_flags_dental_implant': 'Implante',
    'cant_flags_bridge_pillar': 'Puente',
    'cant_flags_orthodontic_brackets': 'Ortodoncia',
}

# Filtrar solo pantos con status ok
pantos_ok = pantos[pantos['status'] == 'ok'].copy()

records = []
for _, row in pantos_ok.iterrows():
    rec = {
        'archivo': row['short_filename'],
        'dientes': int(row['total_teeth']),
        'con_fdi': int(row.get('cant_teeth_con_fdi', 0)),
        'sin_fdi': int(row.get('cant_teeth_sin_fdi', 0)),
        'categoria': row.get('calidad_categoria', 'X'),
        'score': round(float(row.get('calidad_score', 0)), 2) if pd.notna(row.get('calidad_score')) else None,
        'denticion': row['denticion'],
        'fdi_completo': bool(row.get('fdi_32_complete', False)),
        'lm_completo': bool(row.get('lm_norm_complete', False)),
        'tooth_numbers': row['tooth_numbers_parsed'],
        'q1': int(row.get('cant_teeth_q1', 0)),
        'q2': int(row.get('cant_teeth_q2', 0)),
        'q3': int(row.get('cant_teeth_q3', 0)),
        'q4': int(row.get('cant_teeth_q4', 0)),
        'img_w': int(row.get('json_image_width', 0)),
        'img_h': int(row.get('json_image_height', 0)),
    }
    # Flag counts (solo los > 0 para ahorrar espacio)
    flags = {}
    for col in CANT_FLAGS:
        val = int(row.get(col, 0))
        if val > 0:
            flags[FLAG_LABELS[col]] = val
    rec['flags'] = flags
    records.append(rec)

# Metadata del browser
browser_meta = {
    'total_pantos': len(records),
    'categorias': sorted(pantos_ok['calidad_categoria'].dropna().unique().tolist()),
    'denticiones': sorted(pantos_ok['denticion'].unique().tolist()),
    'flag_names': list(FLAG_LABELS.values()),
}

browser_data = {
    'metadata': browser_meta,
    'pantos': records,
}

out_path = output_dir / "pantos_browser.json"
with open(out_path, 'w') as f:
    json.dump(browser_data, f, ensure_ascii=False)

print(f"  Pantos exportadas: {len(records):,}")
print(f"  Categorías: {browser_meta['categorias']}")
print(f"  Denticiones: {browser_meta['denticiones']}")

# ============================================================
# 3. Per-panto geometry files
# ============================================================
print("\nGenerando geometría por pantomografía...")
geom_dir = output_dir / "pantos_geometry"
geom_dir.mkdir(exist_ok=True)

# Columnas de flags por shape
SHAPE_FLAG_COLS = {
    'json_flag_caries': 'caries',
    'json_flag_advanced_caries': 'caries_avanzada',
    'json_flag_moderate_caries': 'caries_moderada',
    'json_flag_incipient_caries': 'caries_incipiente',
    'json_flag_uncertained_caries': 'caries_incierta',
    'json_flag_metal': 'metal',
    'json_flag_restoration': 'restauración',
    'json_flag_root_canal_treatment': 'endodoncia',
    'json_flag_dental_implant': 'implante',
    'json_flag_post_implant': 'post_implante',
    'json_flag_crown_implant': 'corona_implante',
    'json_flag_bridge_pillar': 'puente',
    'json_flag_orthodontic_brackets': 'brackets',
    'json_flag_orthodontic_retainers': 'retenedores',
    'json_flag_orthodontic_appliances': 'aparatos',
    'json_flag_radiolucency': 'radiolucidez',
    'json_flag_neoformation': 'neoformación',
    'json_flag_root_remains': 'raíz_remanente',
    'json_flag_retained': 'retenido',
    'json_flag_agenesis': 'agenesia',
}

def safe_parse(val):
    """Parse a string repr of a list, return None on failure."""
    if pd.isna(val) or val in ('', '[]', 'nan'):
        return None
    try:
        result = ast.literal_eval(str(val))
        if isinstance(result, list) and len(result) > 0:
            return result
        return None
    except (ValueError, SyntaxError):
        return None


def safe_int(val):
    if pd.isna(val):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def safe_float(val):
    if pd.isna(val):
        return None
    try:
        v = float(val)
        return round(v, 2) if abs(v) < 1e6 else None
    except (ValueError, TypeError):
        return None


def reconstruct_minbbox_corners(cx, cy, w, h, angle_deg):
    """Reconstruct 4 corners of a rotated rectangle from center/dims/angle."""
    if any(pd.isna(v) for v in [cx, cy, w, h, angle_deg]):
        return None
    angle_rad = np.radians(float(angle_deg))
    cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
    hw, hh = float(w) / 2, float(h) / 2
    corners = []
    for lx, ly in [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]:
        rx = float(cx) + lx * cos_a - ly * sin_a
        ry = float(cy) + lx * sin_a + ly * cos_a
        corners.append([round(rx, 1), round(ry, 1)])
    return corners


# Columnas necesarias de shapes
SHAPES_COLS = [
    'json_filename', 'json_order', 'entity_type', 'entity_sub_type',
    'json_label', 'json_tooth_number', 'tooth_quadrant',
    'json_bbox_x', 'json_bbox_y', 'json_bbox_width', 'json_bbox_height',
    'json_centroid_x', 'json_centroid_y',
    'json_minbbox', 'json_points',
] + list(SHAPE_FLAG_COLS.keys())

shapes_geom = shapes[SHAPES_COLS].copy()

# Indexar pantos por json_filename
pantos_idx = pantos_ok.set_index('json_filename')

n_exported = 0
for json_filename, group in shapes_geom.groupby('json_filename'):
    if json_filename not in pantos_idx.index:
        continue
    prow = pantos_idx.loc[json_filename]

    # Panto-level geometry
    panto_geom = {
        'archivo': prow.get('short_filename', json_filename),
        'img_w': safe_int(prow.get('json_image_width')),
        'img_h': safe_int(prow.get('json_image_height')),
        'div_x': safe_float(prow.get('quadrant_division_x')),
        'div_y': safe_float(prow.get('quadrant_division_y')),
        'curve': None,
        'dent_bbox': None,
        'reg_minbbox': {},
    }

    # Maxillary curve: y = ax² + bx + c (need high precision for 'a')
    a_raw = prow.get('maxillar_separation_a')
    b_raw = prow.get('maxillar_separation_b')
    c_raw = prow.get('maxillar_separation_c')
    if all(pd.notna(v) for v in [a_raw, b_raw, c_raw]):
        panto_geom['curve'] = [float(a_raw), round(float(b_raw), 6), round(float(c_raw), 2)]

    # Dentition bbox
    dx, dy, dw, dh = (safe_float(prow.get(k)) for k in [
        'bbox_dentition_x_min', 'bbox_dentition_y_min',
        'bbox_dentition_width', 'bbox_dentition_height'])
    if all(v is not None for v in [dx, dy, dw, dh]):
        panto_geom['dent_bbox'] = [dx, dy, dw, dh]

    # Regional minbboxes
    for region in ['upper', 'lower', 'q1', 'q2', 'q3', 'q4']:
        cx = prow.get(f'minbbox_{region}_cx')
        cy = prow.get(f'minbbox_{region}_cy')
        w = prow.get(f'minbbox_{region}_width')
        h = prow.get(f'minbbox_{region}_height')
        angle = prow.get(f'minbbox_{region}_angle')
        corners = reconstruct_minbbox_corners(cx, cy, w, h, angle)
        if corners:
            panto_geom['reg_minbbox'][region] = {
                'points': corners,
                'angle': round(float(angle), 1),
                'cx': round(float(cx), 1),
                'cy': round(float(cy), 1),
            }

    # Per-shape geometry
    shape_list = []
    for _, srow in group.iterrows():
        et = srow['entity_type']
        # Skip atheromas and unknowns
        if et in ('atheroma', 'unknown'):
            continue

        shape = {
            'tn': safe_int(srow['json_tooth_number']),
            'et': et,
            'es': srow['entity_sub_type'] if pd.notna(srow['entity_sub_type']) else None,
            'q': safe_int(srow['tooth_quadrant']),
            'l': srow['json_label'] if pd.notna(srow['json_label']) else None,
        }

        # Bbox
        bx, by, bw, bh = srow['json_bbox_x'], srow['json_bbox_y'], srow['json_bbox_width'], srow['json_bbox_height']
        if all(pd.notna(v) for v in [bx, by, bw, bh]):
            shape['b'] = [int(bx), int(by), int(bw), int(bh)]

        # Centroid
        cx, cy = srow['json_centroid_x'], srow['json_centroid_y']
        if all(pd.notna(v) for v in [cx, cy]):
            shape['c'] = [round(float(cx), 1), round(float(cy), 1)]

        # MinBbox (4 corners)
        mb = safe_parse(srow['json_minbbox'])
        if mb and len(mb) == 4:
            # Check it's not all zeros
            if any(p[0] != 0 or p[1] != 0 for p in mb):
                shape['mb'] = [[int(p[0]), int(p[1])] for p in mb]

        # Polygon (only for teeth and metal, skip for points/landmarks with no polygon)
        if et in ('tooth', 'metal'):
            pg = safe_parse(srow['json_points'])
            if pg and len(pg) >= 3:
                shape['pg'] = [[int(p[0]), int(p[1])] for p in pg]

        # Flags (only include those that are True)
        flags = []
        for col, label in SHAPE_FLAG_COLS.items():
            if col in srow.index and srow[col] is True:
                flags.append(label)
        if flags:
            shape['fl'] = flags

        shape_list.append(shape)

    panto_geom['shapes'] = shape_list

    # Write per-panto file
    # Use short_filename without extension as key
    safe_name = str(prow.get('short_filename', json_filename)).replace('.json', '')
    out_file = geom_dir / f"{safe_name}.json"
    with open(out_file, 'w') as f:
        json.dump(panto_geom, f, ensure_ascii=False, separators=(',', ':'))

    n_exported += 1
    if n_exported % 500 == 0:
        print(f"  ... {n_exported:,} pantos exportadas")

print(f"  Total: {n_exported:,} archivos en {geom_dir}/")

# Calcular tamaño total
total_bytes = sum(f.stat().st_size for f in geom_dir.glob("*.json"))
print(f"  Tamaño total: {total_bytes / (1024*1024):.1f} MB")
avg_bytes = total_bytes / n_exported if n_exported else 0
print(f"  Promedio por archivo: {avg_bytes / 1024:.1f} KB")

# ============================================================
# Summary
# ============================================================
print(f"\nDatos generados en {output_dir}/")
for f in sorted(output_dir.glob("*.json")):
    print(f"  {f.name}: {f.stat().st_size / 1024:.1f} KB")
print(f"  pantos_geometry/: {n_exported} archivos, {total_bytes / (1024*1024):.1f} MB")
