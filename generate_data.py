#!/usr/bin/env python3
"""
Regenera los datos pre-computados para el dashboard Observable.

Ejecutar desde la raíz del proyecto con el venv activado:
    python3 observable/generate_data.py

Genera:
    observable/src/data/tooth_stats.json
    observable/src/data/kde_grids.json
    observable/src/data/metadata.json
"""
import json
import sys
from pathlib import Path

# Asegurar que lib/ sea importable
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
from lib.kde_por_pieza import exportar_para_observable

output_dir = project_root / "observable" / "src" / "data"

print("Cargando shapes.csv...")
shapes = pd.read_csv(project_root / "data" / "csv" / "shapes.csv", low_memory=False)

print("Calculando KDE por pieza (100×100)...")
result = exportar_para_observable(shapes, grid_size=100, output_dir=str(output_dir))

print(f"\nDatos generados en {output_dir}/")
print(f"  Dientes: {result['metadata']['total_teeth']:,}")
print(f"  Pantos:  {result['metadata']['unique_pantos']:,}")
print(f"  Grillas: {len(result['kde_grids']['teeth'])} dientes")
for f in sorted(output_dir.glob("*.json")):
    print(f"  {f.name}: {f.stat().st_size / 1024:.1f} KB")
