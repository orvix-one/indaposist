# INDAPO

Sistema interno de Orvix para la administración de compras de granos y ventas de producto procesado de INDAPO.

El MVP se plantea como una sola entrega operativa. Cubre recepción de boletas, proveedores y pagos, clientes y despachos, cobros y reportes internos. El repositorio contiene el [SDD para revisión](docs/sdd/README.md) y la base ejecutable en Next.js. Las reglas operativas pendientes de Administración se registran en [Decisiones y validación](docs/sdd/validacion.md).

## Arranque local

Se usa Node.js 24 y npm. Desde la raíz:

```sh
npm ci
npm run dev
```

Abrir [localhost:3000](http://localhost:3000). El arranque base funciona con el repositorio y las dependencias del lockfile.

```sh
npm run check
npm run build
```

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| [`docs/sdd/`](docs/sdd/README.md) | Alcance, especificación, arquitectura y criterios de aceptación. |
| [`src/app/`](src/app/page.tsx) | Rutas y composición de la aplicación web. |
| [`src/modules/`](src/modules/README.md) | Límites de los módulos y ubicación de futuras reglas de negocio. |
| [`supabase/`](supabase/README.md) | Convenciones para migraciones, políticas y procesamiento de documentos. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Lint, tipos y build en cambios al repositorio. |

Para revisar el primer alcance, empezar por [Alcance del MVP](docs/sdd/README.md#alcance-del-mvp) y [Orden de construcción](docs/sdd/validacion.md#orden-de-construcción).
