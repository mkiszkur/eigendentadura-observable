export default {
  title: "Analíticos visuales en odontología",
  root: "src",
  output: "dist",
  theme: "light",
  head: '<link rel="stylesheet" href="/style.css">',
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
        {name: "Morfometría clínica",  path: "/morfometria"},
        {name: "Patologías",           path: "/patologias"},
        {name: "Geometría × Patología", path: "/geo-patologia"},
        {name: "Tipicidad y outliers",  path: "/tipicidad"},
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
        {name: "Individuo", path: "/individuo"},
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
    {path: "/conclusiones", name: "Conclusiones"},
  ],
};
