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
# Summary
# ============================================================
print(f"\nDatos generados en {output_dir}/")
for f in sorted(output_dir.glob("*.json")):
    print(f"  {f.name}: {f.stat().st_size / 1024:.1f} KB")
