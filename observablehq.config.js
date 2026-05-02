export default {
  title: "Eigendentadura — Visualización Interactiva",
  root: "src",
  output: "dist",
  theme: "light",
  head: '<link rel="stylesheet" href="/style.css">',
  pages: [
    {
      name: "Población",
      open: true,
      pages: [
        {name: "Universo de datos",    path: "/dataset"},
        {name: "KDE / Eigendentadura", path: "/"},
        {name: "Patologías",           path: "/patologias"},
      ],
    },
    {
      name: "Población vs Población",
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
        {name: "Clusters",  path: "/clusters"},
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
  ],
};
