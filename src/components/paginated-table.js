/**
 * PaginatedTable — tabla paginada con ordenamiento y filtros.
 *
 * Uso:
 *   import { paginatedTable } from "./components/paginated-table.js";
 *
 *   display(paginatedTable({
 *     data: rows,
 *     columns: [
 *       { key: "id",      header: "ID",       type: "string" },
 *       { key: "z_mean",  header: "z̄",        type: "number", format: d => d.toFixed(3) },
 *       { key: "origin",  header: "Centro",   type: "category" },
 *     ],
 *     pageSize: 10,
 *     onRowClick: row => openPantoModal({ id: row.id, ... }),
 *   }));
 *
 * @param {Object} opts
 * @param {Array}    opts.data       - Filas de datos
 * @param {Array}    opts.columns    - Definición de columnas:
 *                                     { key, header, type: "string"|"number"|"category",
 *                                       format?, sortable? = true }
 * @param {number}   [opts.pageSize=10]   - Filas por página inicial
 * @param {boolean}  [opts.filterable=false] - Mostrar filtros por columna
 * @param {Function} [opts.onRowClick]    - callback(row) al hacer clic en fila
 * @returns {HTMLElement}
 */
export function paginatedTable({
  data = [],
  columns = [],
  pageSize: initialPageSize = 10,
  filterable = false,
  onRowClick = null,
} = {}) {
  // ── State ──────────────────────────────────────────────────────────────
  let sortKey = null;
  let sortDir = 0; // 0 = none, 1 = asc, -1 = desc
  let currentPage = 0;
  let pageSize = initialPageSize;
  let filters = {};

  const root = document.createElement("div");
  root.style.fontFamily = "var(--sans-serif, system-ui, sans-serif)";

  // ── Filters ────────────────────────────────────────────────────────────
  const filtersDiv = document.createElement("div");
  filtersDiv.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;padding:6px 0 10px;";

  if (filterable) {
    for (const col of columns) {
      if (col.type === "category") {
        const vals = [...new Set(data.map(r => r[col.key]).filter(v => v != null))].sort();
        if (vals.length < 2) continue;
        const sel = document.createElement("select");
        sel.style.cssText =
          "border:1px solid #ccc;border-radius:4px;padding:3px 6px;font-size:12px;";
        const opt0 = document.createElement("option");
        opt0.value = ""; opt0.textContent = `${col.header}: todas`;
        sel.appendChild(opt0);
        for (const v of vals) {
          const opt = document.createElement("option");
          opt.value = v; opt.textContent = v;
          sel.appendChild(opt);
        }
        sel.addEventListener("change", () => {
          filters[col.key] = sel.value || null;
          currentPage = 0; render();
        });
        filtersDiv.appendChild(sel);
      }
    }
    root.appendChild(filtersDiv);
  }

  // ── Table ──────────────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;";

  const table = document.createElement("table");
  table.style.cssText =
    "border-collapse:collapse;font-size:12px;width:100%;";

  // ── Header ─────────────────────────────────────────────────────────────
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.style.borderBottom = "2px solid #eee";

  for (const col of columns) {
    const th = document.createElement("th");
    th.style.cssText =
      "text-align:left;padding:5px 8px;color:#666;font-weight:600;" +
      "white-space:nowrap;font-size:11px;user-select:none;";

    const sortable = col.sortable !== false;
    if (sortable) th.style.cursor = "pointer";

    function updateThLabel() {
      const arrow = col.key === sortKey
        ? (sortDir === 1 ? " ▲" : sortDir === -1 ? " ▼" : "")
        : "";
      th.textContent = col.header + arrow;
      th.style.color = col.key === sortKey ? "#4c78a8" : "#666";
    }
    updateThLabel();

    if (sortable) {
      th.addEventListener("click", () => {
        if (sortKey === col.key) {
          sortDir = sortDir === 1 ? -1 : sortDir === -1 ? 0 : 1;
          if (sortDir === 0) sortKey = null;
        } else {
          sortKey = col.key; sortDir = 1;
        }
        // Reset all other headers
        headerRow.querySelectorAll("th").forEach(t => {
          t.style.color = "#666";
        });
        updateThLabel();
        currentPage = 0; render();
      });
    }

    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ── Body ───────────────────────────────────────────────────────────────
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  root.appendChild(tableWrap);

  // ── Pagination bar ──────────────────────────────────────────────────────
  const paginBar = document.createElement("div");
  paginBar.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;" +
    "padding:8px 2px 2px;font-size:12px;color:#666;flex-wrap:wrap;gap:6px;";
  root.appendChild(paginBar);

  // ── Render ──────────────────────────────────────────────────────────────
  function getFiltered() {
    let rows = data;
    for (const [key, val] of Object.entries(filters)) {
      if (val == null) continue;
      rows = rows.filter(r => r[key] === val);
    }
    return rows;
  }

  function getSorted(rows) {
    if (!sortKey || sortDir === 0) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return cmp * sortDir;
    });
  }

  function render() {
    const filtered = getFiltered();
    const sorted   = getSorted(filtered);
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    currentPage = Math.min(currentPage, totalPages - 1);
    const start = currentPage * pageSize;
    const end   = Math.min(start + pageSize, sorted.length);
    const pageRows = sorted.slice(start, end);

    // Body
    tbody.innerHTML = "";
    for (const row of pageRows) {
      const tr = document.createElement("tr");
      tr.style.cssText =
        "border-bottom:1px solid #f5f5f5;" +
        (onRowClick ? "cursor:pointer;" : "");
      tr.addEventListener("mouseover", () => {
        tr.style.background = onRowClick ? "#f0f5ff" : "#fafafa";
      });
      tr.addEventListener("mouseout",  () => { tr.style.background = ""; });
      if (onRowClick) tr.addEventListener("click", () => onRowClick(row));

      for (const col of columns) {
        const td = document.createElement("td");
        td.style.cssText = "padding:4px 8px;";
        if (col.align === "right" || col.type === "number") td.style.textAlign = "right";
        const val = row[col.key];
        td.textContent = val == null ? "–" : col.format ? col.format(val) : val;
        if (col.cellStyle) Object.assign(td.style, col.cellStyle(val));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    // Pagination bar
    paginBar.innerHTML = "";

    // Left: count + page size selector
    const leftDiv = document.createElement("div");
    leftDiv.style.cssText = "display:flex;align-items:center;gap:8px;";

    const countSpan = document.createElement("span");
    countSpan.textContent = sorted.length === data.length
      ? `${sorted.length} registros`
      : `${sorted.length} de ${data.length}`;
    leftDiv.appendChild(countSpan);

    const sizeLabel = document.createElement("label");
    sizeLabel.style.cssText = "display:flex;align-items:center;gap:4px;";
    sizeLabel.innerHTML = `Mostrar: `;
    const sizeSelect = document.createElement("select");
    sizeSelect.style.cssText =
      "border:1px solid #ccc;border-radius:4px;padding:2px 4px;font-size:12px;";
    for (const s of [10, 25, 50, 100]) {
      const opt = document.createElement("option");
      opt.value = s; opt.textContent = s;
      if (s === pageSize) opt.selected = true;
      sizeSelect.appendChild(opt);
    }
    sizeSelect.addEventListener("change", () => {
      pageSize = Number(sizeSelect.value); currentPage = 0; render();
    });
    sizeLabel.appendChild(sizeSelect);
    leftDiv.appendChild(sizeLabel);
    paginBar.appendChild(leftDiv);

    if (totalPages <= 1) return;

    // Right: prev / page numbers / next
    const rightDiv = document.createElement("div");
    rightDiv.style.cssText = "display:flex;align-items:center;gap:4px;";

    const btnStyle =
      "padding:3px 8px;border:1px solid #ddd;border-radius:4px;cursor:pointer;" +
      "font-size:12px;background:#fafafa;";
    const btnActiveStyle =
      "padding:3px 8px;border:1px solid #4c78a8;border-radius:4px;cursor:pointer;" +
      "font-size:12px;background:#4c78a8;color:#fff;font-weight:600;";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "‹";
    prevBtn.style.cssText = btnStyle;
    prevBtn.disabled = currentPage === 0;
    prevBtn.addEventListener("click", () => { currentPage--; render(); });
    rightDiv.appendChild(prevBtn);

    // Show up to 5 page buttons
    const maxBtns = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxBtns / 2));
    let endPage   = Math.min(totalPages, startPage + maxBtns);
    if (endPage - startPage < maxBtns) startPage = Math.max(0, endPage - maxBtns);

    for (let p = startPage; p < endPage; p++) {
      const btn = document.createElement("button");
      btn.textContent = p + 1;
      btn.style.cssText = p === currentPage ? btnActiveStyle : btnStyle;
      btn.addEventListener("click", () => { currentPage = p; render(); });
      rightDiv.appendChild(btn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "›";
    nextBtn.style.cssText = btnStyle;
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.addEventListener("click", () => { currentPage++; render(); });
    rightDiv.appendChild(nextBtn);

    paginBar.appendChild(rightDiv);
  }

  render();
  return root;
}
