/**
 * Componente reutilizable de selección de pantomografías.
 *
 * Proporciona:
 * - cleanArchivo(): normaliza nombres de archivo
 * - pantoTable(): renderiza tabla paginada con selección simple o dual,
 *                 paginación abajo-derecha y sort por click en columna
 */
import * as d3 from "d3";

/**
 * Strip prefix "database_original__" and suffix "__json_url.json" / ".json"
 */
export function cleanArchivo(name) {
  if (!name) return "";
  return name
    .replace(/^database_original__/, "")
    .replace(/__json_url\.json$/, "")
    .replace(/\.json$/, "");
}

/**
 * Render the paginated table of pantos.
 *
 * @param {Object} opts
 * @param {Array} opts.pantos - filtered list of pantos
 * @param {number} opts.page - current page (0-indexed)
 * @param {number} opts.pageSize - rows per page (default 15)
 * @param {string|null} opts.selectedA - archivo of primary selection
 * @param {string|null} opts.selectedB - archivo of secondary selection (dual mode)
 * @param {Function} opts.onSelectA - callback(archivo)
 * @param {Function|null} opts.onSelectB - callback(archivo), null = single selection mode
 * @param {Function} opts.onPage - callback(pageNumber)
 * @param {Array<Object>} opts.extraColumns - [{key, header, format, sortKey?}] additional columns
 * @param {string|null} opts.sortKey - active sort key
 * @param {"asc"|"desc"} opts.sortDir - sort direction
 * @param {Function|null} opts.onSortChange - callback({key, dir}) on column header click
 * @returns {HTMLElement}
 */
export function pantoTable({
  pantos,
  page = 0,
  pageSize = 15,
  selectedA = null,
  selectedB = null,
  onSelectA,
  onSelectB = null,
  onPage,
  extraColumns = [],
  sortKey = null,
  sortDir = "asc",
  onSortChange = null,
} = {}) {
  const html = (strings, ...values) => {
    const template = document.createElement("template");
    template.innerHTML = String.raw(strings, ...values);
    return template.content;
  };

  const dualMode = onSelectB != null;
  const totalPages = Math.max(1, Math.ceil(pantos.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, pantos.length);
  const pagePantos = pantos.slice(start, end);

  const container = document.createElement("div");

  // ── Table ──
  const table = document.createElement("table");
  table.style.cssText = "width: 100%; border-collapse: collapse; font-size: 12px;";

  // Header — sortable columns
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.style.cssText = "border-bottom: 2px solid #ddd; text-align: left;";

  // Base column definitions: [label, dataKey, width, align]
  const baseCols = dualMode
    ? [
        ["", null, "30px", "center"],
        ["", null, "30px", "center"],
        ["Archivo", "archivo", "", "left"],
        ["Dientes", "dientes", "60px", "center"],
        ["FDI", "con_fdi", "40px", "center"],
        ["FDI \u2714", "fdi_completo", "40px", "center"],
        ["Cat", "categoria", "40px", "center"],
        ["Dentici\u00f3n", "denticion", "", "left"],
      ]
    : [
        ["Archivo", "archivo", "", "left"],
        ["Dientes", "dientes", "60px", "center"],
        ["FDI", "con_fdi", "40px", "center"],
        ["FDI \u2714", "fdi_completo", "40px", "center"],
        ["Cat", "categoria", "40px", "center"],
        ["Dentición", "denticion", "", "left"],
      ];

  function makeSortTh(label, key, width, align) {
    const th = document.createElement("th");
    const isSorted = key && sortKey === key;
    const arrow = isSorted ? (sortDir === "asc" ? " ↑" : " ↓") : (key ? " ⇅" : "");
    th.textContent = label + arrow;
    th.style.cssText = `padding:6px 4px;text-align:${align};${width ? `width:${width};` : ""}${key && onSortChange ? "cursor:pointer;user-select:none;" : ""}${isSorted ? "color:#4e79a7;" : ""}`;
    if (key && onSortChange) {
      th.addEventListener("click", () => {
        const newDir = (sortKey === key && sortDir === "asc") ? "desc" : "asc";
        onSortChange({key, dir: newDir});
      });
    }
    return th;
  }

  for (const [label, key, width, align] of baseCols) {
    headerRow.append(makeSortTh(label, key, width, align));
  }
  for (const ec of extraColumns) {
    headerRow.append(makeSortTh(ec.header, ec.sortKey ?? ec.key, ec.width || "60px", ec.align || "center"));
  }

  thead.append(headerRow);
  table.append(thead);

  // Body
  const tbody = document.createElement("tbody");
  for (const p of pagePantos) {
    const isA = p.archivo === selectedA;
    const isB = p.archivo === selectedB;
    const tr = document.createElement("tr");
    tr.style.cssText = `border-bottom: 1px solid #eee; cursor: pointer; background: ${isA ? "#dbeafe" : isB ? "#fde8e8" : "transparent"};`;
    tr.onmouseenter = () => { if (!isA && !isB) tr.style.background = "#f5f5f5"; };
    tr.onmouseleave = () => { if (!isA && !isB) tr.style.background = "transparent"; };

    if (dualMode) {
      // Radio for A
      const tdA = document.createElement("td");
      tdA.style.cssText = "padding: 4px; text-align: center;";
      const radioA = document.createElement("input");
      radioA.type = "radio";
      radioA.name = "pantoA";
      radioA.checked = isA;
      radioA.onchange = () => onSelectA(p.archivo);
      tdA.append(radioA);
      tr.append(tdA);

      // Checkbox for B
      const tdB = document.createElement("td");
      tdB.style.cssText = "padding: 4px; text-align: center;";
      const checkB = document.createElement("input");
      checkB.type = "checkbox";
      checkB.checked = isB;
      checkB.onchange = () => onSelectB(p.archivo);
      tdB.append(checkB);
      tr.append(tdB);
    } else {
      // Click entire row for single selection
      tr.onclick = () => onSelectA(p.archivo);
    }

    // Archivo
    const tdArch = document.createElement("td");
    tdArch.style.cssText = "padding: 4px; font-family: monospace; font-size: 11px;";
    tdArch.textContent = cleanArchivo(p.archivo);
    tr.append(tdArch);

    // Dientes
    const tdD = document.createElement("td");
    tdD.style.cssText = "padding: 4px; text-align: center;";
    tdD.textContent = p.dientes;
    tr.append(tdD);

    // FDI (count)
    const tdFdi = document.createElement("td");
    tdFdi.style.cssText = "padding: 4px; text-align: center;";
    tdFdi.textContent = p.con_fdi > 0 ? p.con_fdi : "—";
    tr.append(tdFdi);

    // FDI completo
    const tdFdiC = document.createElement("td");
    tdFdiC.style.cssText = "padding: 4px; text-align: center;";
    tdFdiC.textContent = p.fdi_completo ? "✓" : "—";
    tr.append(tdFdiC);

    // Categoría
    const tdCat = document.createElement("td");
    tdCat.style.cssText = "padding: 4px; text-align: center; font-weight: bold;";
    tdCat.textContent = p.categoria;
    tr.append(tdCat);

    // Dentición
    const tdDent = document.createElement("td");
    tdDent.style.cssText = "padding: 4px; font-size: 11px;";
    tdDent.textContent = p.denticion;
    tr.append(tdDent);

    // Extra columns
    for (const ec of extraColumns) {
      const td = document.createElement("td");
      td.style.cssText = `padding: 4px; text-align: ${ec.align || "center"}; font-size: 11px;`;
      const val = p[ec.key];
      td.textContent = ec.format ? ec.format(val, p) : (val ?? "");
      tr.append(td);
    }

    tbody.append(tr);
  }
  table.append(tbody);
  container.append(table);

  // ── Pagination — below table, right-aligned ──
  const pagDiv = document.createElement("div");
  pagDiv.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:12px;padding:4px 0 2px;color:#666;";

  const btnFirst = document.createElement("button");
  btnFirst.textContent = "⏮";
  btnFirst.style.cssText = "padding:2px 8px;cursor:pointer;border:1px solid #ddd;border-radius:3px;";
  btnFirst.disabled = safePage === 0;
  btnFirst.onclick = () => onPage(0);

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "◀";
  btnPrev.style.cssText = "padding:2px 8px;cursor:pointer;border:1px solid #ddd;border-radius:3px;";
  btnPrev.disabled = safePage === 0;
  btnPrev.onclick = () => onPage(Math.max(0, safePage - 1));

  const span = document.createElement("span");
  span.textContent = `${start + 1}–${end} de ${pantos.length}`;

  const btnNext = document.createElement("button");
  btnNext.textContent = "▶";
  btnNext.style.cssText = "padding:2px 8px;cursor:pointer;border:1px solid #ddd;border-radius:3px;";
  btnNext.disabled = safePage >= totalPages - 1;
  btnNext.onclick = () => onPage(safePage + 1);

  const btnLast = document.createElement("button");
  btnLast.textContent = "⏭";
  btnLast.style.cssText = "padding:2px 8px;cursor:pointer;border:1px solid #ddd;border-radius:3px;";
  btnLast.disabled = safePage >= totalPages - 1;
  btnLast.onclick = () => onPage(totalPages - 1);

  pagDiv.append(btnFirst, btnPrev, span, btnNext, btnLast);
  container.append(pagDiv);

  return container;
}
