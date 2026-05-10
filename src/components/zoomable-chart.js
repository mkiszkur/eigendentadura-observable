/**
 * ZoomableChart — agrega zoom (scroll) + pan (drag) + doble-clic reset a un SVG.
 *
 * Estrategia: inyecta un <g class="zoom-layer"> y aplica d3.zoom() sobre
 * un rect de captura invisible superpuesto al SVG.
 *
 * Uso:
 *   import { zoomableChart } from "./components/zoomable-chart.js";
 *   import * as Plot from "@observablehq/plot";
 *
 *   const chart = Plot.plot({ ... });
 *   display(zoomableChart(chart));
 *
 * También funciona con SVGs creados con d3.create("svg") o SVGElement.
 *
 * @param {SVGElement|HTMLElement} svgOrEl
 *   - Si es un <svg>, se añade zoom directamente.
 *   - Si es un contenedor HTML con un <svg> hijo, se usa ese <svg>.
 * @param {Object} [opts]
 * @param {number[]} [opts.scaleExtent=[1, 20]] - [min, max] factor de zoom
 * @returns {HTMLElement|SVGElement} el mismo elemento (modificado in-place)
 */
import * as d3 from "d3";

export function zoomableChart(svgOrEl, { scaleExtent = [1, 20] } = {}) {
  // Locate the actual SVG
  let svg = svgOrEl;
  if (!(svg instanceof SVGElement)) {
    svg = svgOrEl.querySelector("svg") ?? svgOrEl;
  }
  if (!(svg instanceof SVGElement)) return svgOrEl;

  // Get viewBox dimensions (fallback to width/height attributes or 100%)
  const vb = svg.viewBox?.baseVal;
  const vbW = vb?.width  || parseFloat(svg.getAttribute("width"))  || 800;
  const vbH = vb?.height || parseFloat(svg.getAttribute("height")) || 500;

  // Wrap all existing children in a zoom layer
  const zoomLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  zoomLayer.setAttribute("class", "zoom-layer");

  // Move all current children into zoomLayer
  while (svg.firstChild) zoomLayer.appendChild(svg.firstChild);
  svg.appendChild(zoomLayer);

  // Invisible overlay rect to capture pointer events
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  overlay.setAttribute("x", 0); overlay.setAttribute("y", 0);
  overlay.setAttribute("width",  vbW); overlay.setAttribute("height", vbH);
  overlay.setAttribute("fill", "none"); overlay.setAttribute("pointer-events", "all");
  svg.appendChild(overlay);

  // Zoom hint text (bottom right of viewBox)
  const hint = document.createElementNS("http://www.w3.org/2000/svg", "text");
  hint.setAttribute("x", vbW - 4); hint.setAttribute("y", vbH - 4);
  hint.setAttribute("text-anchor", "end");
  hint.setAttribute("font-size", Math.max(9, vbH * 0.015));
  hint.setAttribute("fill", "#bbb");
  hint.setAttribute("pointer-events", "none");
  hint.textContent = "Scroll zoom · Drag pan · Doble-clic reset";
  svg.appendChild(hint);

  // Apply d3 zoom
  const zoom = d3.zoom()
    .scaleExtent(scaleExtent)
    .on("zoom", (event) => {
      zoomLayer.setAttribute("transform", event.transform.toString());
    });

  d3.select(svg).call(zoom);
  d3.select(svg).on("dblclick.zoom", () => {
    d3.select(svg).transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  });

  return svgOrEl;
}
