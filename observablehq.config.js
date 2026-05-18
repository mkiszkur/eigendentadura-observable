// `base` define el sub-path donde se sirve el sitio. En `npm run dev` queda en "/"
// (preview local), y en deploy a GitHub Pages se setea via env var.
const base = process.env.OBSERVABLE_BASE || "/";

import katex from "@vscode/markdown-it-katex";

export default {
  title: "Analíticos visuales en odontología",
  root: "src",
  output: "dist",
  base,
  theme: "light",
  head: '<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+" crossorigin="anonymous">',
  markdownIt: (md) => md.use(katex.default ?? katex),
  header: '<div style="font-size:0.8rem;color:#777;text-align:right;padding:6px 1.2rem;border-bottom:1px solid #ececec;background:#fafafa;line-height:1.4;">Autor: Lic. Eduardo Miguel Kiszkurno &nbsp;·&nbsp; Directores: Dr. Claudio Delrieux, Dra. Debora Pollicelli</div>',
  footer: '<div style="font-size:0.78rem;color:#aaa;text-align:center;padding:10px 1rem 16px;border-top:1px solid #f0f0f0;margin-top:3rem;">Maestría en Explotación de Datos y Descubrimiento del Conocimiento — UBA FCEN</div>',
  pages: [
    {
      name: "Introducción",
      open: true,
      pages: [
        {name: "Introducción",         path: "/intro"},
        {name: "Resumen ejecutivo",    path: "/resumen"},
        {name: "Tabla de contenidos",  path: "/tabla-contenidos"},
      ],
    },
    {
      name: "Población",
      open: true,
      pages: [
        {name: "Universo de datos",    path: "/dataset"},
        {name: "Geometría Dental",     path: "/geometria-dental"},
        {name: "Análisis de casos atípicos",  path: "/tipicidad"},
        {name: "Morfometría clínica",  path: "/morfometria"},
        {name: "Forma del arco",       path: "/arch_form"},
        {name: "Patologías",           path: "/patologias"},
        {name: "Geometría × Patología", path: "/geo-patologia"},
        {name: "¿Existen subtipos?",   path: "/clusters"},
      ],
    },
    {
      name: "Subpoblaciones",
      open: true,
      pages: [
        {name: "Origen clínico",  path: "/subpoblacion-origen"},
        {name: "Sexo biológico",  path: "/subpoblacion-genero"},
      ],
    },
    {
      name: "Individuo vs Población",
      open: true,
      pages: [
        {name: "Explorador de muestras", path: "/explorador-metricas"},
        {name: "Individuo",              path: "/individuo"},
      ],
    },
    {
      name: "Exploradores",
      open: true,
      pages: [
        {name: "Pantos",              path: "/pantos"},
        {name: "Pantos normalizadas", path: "/pantos-norm"},
      ],
    },
    {path: "/conclusiones", name: "Conclusiones y síntesis"},
    {
      name: "Anexo: Experimentos metodológicos",
      open: false,
      pages: [
        {name: "Resumen del anexo",                        path: "/anexo-experimentos"},
        {name: "exp01 — LLM visual vs prior geométrico",   path: "/anexo-exp01-llm"},
        {name: "exp02 — Landmarks por CV híbrida",          path: "/anexo-exp02-cv"},
        {name: "exp03 — Preprocesamiento + re-anchor",      path: "/anexo-exp03-preproc"},
        {name: "exp04 — Detector aprendido (SmallUNet)",    path: "/anexo-exp04-nn"},
        {name: "exp05 — Propagación + imputación FDI",      path: "/anexo-exp05-propagacion"},
        {name: "exp11 — Forma del diente (Uso B)",          path: "/anexo-exp11-forma"},
      ],
    },
  ],
};
