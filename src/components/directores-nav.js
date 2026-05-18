import {html} from "npm:htl";

// Navegación lateral propia para la vista interna de directores.
// Se usa con `sidebar: false` en el frontmatter de cada página, para
// reemplazar el sidebar público (que lista las páginas para odontólogos)
// por una TOC dedicada a los capítulos de la tesis.

const CHAPTERS = [
  {key: "index", num: null, title: "Índice del documento", href: "./"},
  {key: "01",    num: "1",  title: "Introducción",          href: "./01-introduccion"},
  {key: "02",    num: "2",  title: "Marco teórico",         href: "./02-marco-teorico"},
  {key: "03",    num: "3",  title: "Dataset",               href: "./03-dataset",         star: true},
  {key: "04",    num: "4",  title: "Metodología",           href: "./04-metodologia"},
  {key: "05",    num: "5",  title: "EDA",                   href: "./05-eda",             star: true},
  {key: "06",    num: "6",  title: "Normalización",         href: "./06-normalizacion",   star: true},
  {key: "07",    num: "7",  title: "Eigendentadura",        href: "./07-eigendentadura"},
  {key: "08",    num: "8",  title: "Análisis por pieza",    href: "./08-analisis-por-pieza"},
  {key: "09",    num: "9",  title: "Subpoblaciones",        href: "./09-subpoblaciones"},
  {key: "10",    num: "10", title: "Herramienta",           href: "./10-herramienta"},
  {key: "11",    num: "11", title: "Conclusiones",          href: "./11-conclusiones"},
  {key: "12",    num: "12", title: "Anexo · Experimentos",  href: "./12-experimentos"},
];

const CSS = `
  /* Sidebar fija a la izquierda en directores/* */
  body.dir-mode #observablehq-main,
  body.dir-mode #observablehq-footer,
  body.dir-mode #observablehq-header {
    margin-left: 240px;
  }
  body.dir-mode #observablehq-main { max-width: 1100px; }
  .dir-sidebar {
    position: fixed;
    top: 0; left: 0;
    width: 240px;
    height: 100vh;
    overflow-y: auto;
    background: #f7f7f7;
    border-right: 1px solid #e0e0e0;
    padding: 1.1rem 0.7rem 1.5rem;
    font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    z-index: 1000;
    box-sizing: border-box;
  }
  .dir-sidebar .dir-brand {
    display: block;
    padding: 0 0.5rem 0.8rem;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 0.6rem;
  }
  .dir-sidebar .dir-brand b { color: #1f2937; font-size: 0.92rem; }
  .dir-sidebar .dir-brand small { color: #777; font-size: 0.72rem; display: block; margin-top: 2px; }
  .dir-sidebar h3 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #888;
    margin: 0.8rem 0.4rem 0.3rem;
    font-weight: 600;
  }
  .dir-sidebar a.dir-link {
    display: block;
    padding: 0.32rem 0.55rem;
    margin: 1px 0;
    color: #333;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.86rem;
    line-height: 1.3;
  }
  .dir-sidebar a.dir-link:hover {
    background: #e8e8e8;
    color: #111;
  }
  .dir-sidebar a.dir-link.active {
    background: #1f2937;
    color: #fff;
    font-weight: 600;
  }
  .dir-sidebar a.dir-link .num {
    display: inline-block;
    width: 22px;
    color: #888;
    font-variant-numeric: tabular-nums;
  }
  .dir-sidebar a.dir-link.active .num { color: #cbd5e1; }
  .dir-sidebar a.dir-link .star { color: #f5a623; font-size: 0.7rem; margin-left: 4px; }
  .dir-sidebar hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0.9rem 0.4rem;
  }
  .dir-sidebar a.dir-back {
    display: block;
    padding: 0.32rem 0.55rem;
    color: #888;
    text-decoration: none;
    font-size: 0.78rem;
  }
  .dir-sidebar a.dir-back:hover { color: #1f2937; }
  @media (max-width: 900px) {
    body.dir-mode #observablehq-main,
    body.dir-mode #observablehq-footer,
    body.dir-mode #observablehq-header {
      margin-left: 0;
    }
    .dir-sidebar {
      position: relative;
      width: 100%;
      height: auto;
      border-right: none;
      border-bottom: 1px solid #e0e0e0;
    }
  }
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("dir-nav-styles")) return;
  const style = document.createElement("style");
  style.id = "dir-nav-styles";
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.classList.add("dir-mode");
}

export function directoresNav(activeKey) {
  ensureStyles();
  return html`<aside class="dir-sidebar">
    <a class="dir-brand" href="./">
      <b>Tesis · Vista directores</b>
      <small>documento iterativo (interna)</small>
    </a>
    <h3>Capítulos</h3>
    ${CHAPTERS.map(c => html`<a class="dir-link ${c.key === activeKey ? "active" : ""}" href="${c.href}"><span class="num">${c.num != null ? c.num + "." : ""}</span>${c.title}${c.star ? html`<span class="star">★</span>` : ""}</a>`)}
    <hr>
    <a class="dir-back" href="../">← Sitio público (odontólogos)</a>
  </aside>`;
}
