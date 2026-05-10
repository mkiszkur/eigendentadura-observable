/**
 * Collapsible — wrapper reutilizable sobre <details>/<summary>.
 *
 * @param {Object} opts
 * @param {string} opts.title - Texto del summary
 * @param {HTMLElement|Node|string} opts.content - Contenido del panel
 * @param {boolean} [opts.open=false] - Abierto por defecto
 * @returns {HTMLDetailsElement}
 */
export function collapsible({ title, content, open = false } = {}) {
  const details = document.createElement("details");
  if (open) details.open = true;

  const summary = document.createElement("summary");
  summary.style.cssText =
    "cursor:pointer;font-size:13px;color:#444;font-weight:600;user-select:none;";
  summary.textContent = title;

  details.appendChild(summary);

  if (content instanceof Node) {
    details.appendChild(content);
  } else if (content != null) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "padding:6px 0 4px;";
    if (typeof content === "string") {
      wrap.innerHTML = content;
    } else {
      wrap.appendChild(content);
    }
    details.appendChild(wrap);
  }

  return details;
}
