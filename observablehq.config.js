export default {
  title: "Eigendentadura — Visualización Interactiva",
  root: "src",
  output: "dist",
  theme: "light",
  head: '<link rel="stylesheet" href="/style.css">',
  pages: [
    {path: "/intro", name: "Introducción"},
    {
      name: "Población",
      open: true,
      pages: [
        {name: "Universo de datos",    path: "/dataset"},
        {name: "Geometría Dental",     path: "/"},
        {name: "Morfometría clínica",  path: "/morfometria"},
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
