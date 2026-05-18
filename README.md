# eigendentadura-observable

Sitio Observable Framework del proyecto de tesis **"Analíticos visuales en
odontología (eigendentadura)"** — Lic. Eduardo Miguel Kiszkurno.

> 🚨 **Este repo es un mirror de solo-lectura.** El código vive en el repo
> principal de la tesis y se sincroniza vía `git subtree push` desde la
> carpeta `observable/` de ese repo. Cualquier PR o commit hecho acá puede
> perderse en la próxima publicación. Cambios reales: en el repo origen.

## Publicación

El sitio se despliega automáticamente a **GitHub Pages** en cada push a `main`
(ver [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

URL pública: <https://mkiszkur.github.io/eigendentadura-observable/>

## Desarrollo local

```bash
npm ci
npm run dev          # http://localhost:3000
```

## Stack

- [Observable Framework](https://observablehq.com/framework) v1.13
- D3 v7 para visualizaciones custom
- Datos pre-procesados en `src/data/` como JSON (generados por el pipeline
  de la tesis y por `utils/anexo_directores/build_data.py`).
