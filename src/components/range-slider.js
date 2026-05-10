/**
 * RangeSlider — slider de dos extremos (min/max).
 *
 * Compatible con Observable Inputs: dispara evento "input" y expone `.value`
 * como array [lo, hi].
 *
 * Uso:
 *   import { rangeSlider } from "./components/range-slider.js";
 *
 *   const slider = rangeSlider({ label: "Cantidad de dientes", min: 1, max: 32, value: [10, 32] });
 *   const [lo, hi] = Generators.input(slider);
 *
 * @param {Object} opts
 * @param {string}   opts.label       - Etiqueta visible
 * @param {number}   opts.min         - Mínimo absoluto
 * @param {number}   opts.max         - Máximo absoluto
 * @param {number[]} [opts.value]     - Valor inicial [lo, hi]. Default: [min, max]
 * @param {number}   [opts.step=1]    - Paso del slider
 * @param {Function} [opts.format]    - Formateador de valores. Default: Number.toLocaleString
 * @param {number}   [opts.width=240] - Ancho en px del track
 * @returns {HTMLElement} — elemento con .value = [lo, hi]
 */
export function rangeSlider({
  label,
  min,
  max,
  value,
  step = 1,
  format = null,
  width = 240,
} = {}) {
  const fmt = format ?? (v => Number.isInteger(step) ? String(Math.round(v)) : v.toFixed(2));
  let lo = value?.[0] ?? min;
  let hi = value?.[1] ?? max;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:inline-flex;flex-direction:column;gap:4px;" +
    "font-family:var(--sans-serif,system-ui,sans-serif);font-size:13px;";

  // ── Label + display ──────────────────────────────────────────────────
  const topRow = document.createElement("div");
  topRow.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;";

  const labelEl = document.createElement("span");
  labelEl.style.cssText = "color:#444;font-weight:600;margin-right:8px;";
  labelEl.textContent = label ?? "";

  const displayEl = document.createElement("span");
  displayEl.style.cssText = "color:#666;font-size:12px;font-variant-numeric:tabular-nums;";

  topRow.append(labelEl, displayEl);
  wrapper.appendChild(topRow);

  // ── Track + thumbs ──────────────────────────────────────────────────
  const trackWrap = document.createElement("div");
  trackWrap.style.cssText = `position:relative;width:${width}px;height:20px;`;

  // Shared attributes for both range inputs
  const inputStyle =
    "position:absolute;top:50%;transform:translateY(-50%);" +
    "width:100%;height:4px;appearance:none;-webkit-appearance:none;" +
    "background:transparent;outline:none;cursor:pointer;margin:0;padding:0;pointer-events:none;";

  const CSS_THUMB =
    "[type=range]::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;" +
    "width:14px;height:14px;border-radius:50%;background:#4c78a8;border:2px solid #fff;" +
    "box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:grab;}" +
    "[type=range]::-moz-range-thumb{pointer-events:auto;width:14px;height:14px;" +
    "border-radius:50%;background:#4c78a8;border:2px solid #fff;cursor:grab;}";

  if (!document.getElementById("range-slider-css")) {
    const style = document.createElement("style");
    style.id = "range-slider-css";
    style.textContent = CSS_THUMB;
    document.head.appendChild(style);
  }

  // Track fill
  const trackFill = document.createElement("div");
  trackFill.style.cssText =
    "position:absolute;top:50%;transform:translateY(-50%);" +
    "height:4px;border-radius:2px;background:#4c78a8;pointer-events:none;";

  // Background track
  const trackBg = document.createElement("div");
  trackBg.style.cssText =
    "position:absolute;top:50%;transform:translateY(-50%);" +
    `width:100%;height:4px;border-radius:2px;background:#e0e0e0;pointer-events:none;`;

  const inputLo = document.createElement("input");
  inputLo.type = "range";
  inputLo.min = min; inputLo.max = max; inputLo.step = step;
  inputLo.value = lo;
  inputLo.style.cssText = inputStyle + "z-index:3;";

  const inputHi = document.createElement("input");
  inputHi.type = "range";
  inputHi.min = min; inputHi.max = max; inputHi.step = step;
  inputHi.value = hi;
  inputHi.style.cssText = inputStyle + "z-index:4;";

  trackWrap.append(trackBg, trackFill, inputLo, inputHi);
  wrapper.appendChild(trackWrap);

  function updateFill() {
    const range = max - min;
    const leftPct  = ((lo - min) / range) * 100;
    const rightPct = ((hi - min) / range) * 100;
    trackFill.style.left  = `${leftPct}%`;
    trackFill.style.width = `${rightPct - leftPct}%`;
    displayEl.textContent = `${fmt(lo)} – ${fmt(hi)}`;
  }

  inputLo.addEventListener("input", () => {
    lo = Math.min(Number(inputLo.value), hi - step);
    inputLo.value = lo;
    updateFill();
    wrapper.dispatchEvent(new Event("input", { bubbles: true }));
  });

  inputHi.addEventListener("input", () => {
    hi = Math.max(Number(inputHi.value), lo + step);
    inputHi.value = hi;
    updateFill();
    wrapper.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Observable Inputs protocol
  Object.defineProperty(wrapper, "value", {
    get: () => [lo, hi],
    set: ([newLo, newHi]) => {
      lo = newLo; hi = newHi;
      inputLo.value = lo; inputHi.value = hi;
      updateFill();
    },
  });

  updateFill();
  return wrapper;
}
