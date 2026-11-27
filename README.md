# INDAPO

Sistema interno de Orvix para la administración de compras de granos y ventas de producto procesado de INDAPO.

El MVP se plantea como una sola entrega operativa. Cubre recepción de boletas, proveedores y pagos, clientes y despachos, cobros y reportes internos. El repositorio contiene el [SDD para revisión](docs/sdd/README.md) y la base ejecutable en Next.js. Las reglas operativas pendientes de Administración se registran en [Decisiones y validación](docs/sdd/validacion.md).

La gestión del proyecto se lleva en el [tablero de Trello](https://trello.com/b/IGg8UKRV/indapo). Los tickets usan el formato `IND-XX.YY`.

## Arranque local

Se usa Node.js 24 y npm. Desde la raíz:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abrir [localhost:3000](http://localhost:3000). La primera versión del design system se ve en [localhost:3000/design-system](http://localhost:3000/design-system).

```sh
npm run check
npm run build
```

## Entornos

| Entorno | Vercel | Supabase |
| --- | --- | --- |
| Prod | [indaposist.vercel.app](https://indaposist.vercel.app), desde `main` | `wurgvqcgxkxssireklni` |
| Dev | Previews por PR y local | Provisionalmente sin proyecto propio: no hay cupo libre en Supabase. Usa el de prod. |

Equipo de Vercel: [orvix-one/indaposist](https://vercel.com/orvix-one/indaposist). Las variables están en [`.env.example`](.env.example). `SUPABASE_SECRET_KEY` es solo de servidor y en Vercel va marcada como *Sensitive*.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| [`docs/sdd/`](docs/sdd/README.md) | Alcance, especificación, arquitectura y criterios de aceptación. |
| [`src/app/`](src/app/page.tsx) | Solo rutas: validan la entrada y llaman a los módulos. |
| [`src/modules/`](src/modules/README.md) | Reglas de negocio por módulo. |
| `src/shared/` | Código transversal. No importa de `modules` ni de `app`. |
| [`src/shared/ui/`](src/shared/ui/index.ts) | Design system: tokens y componentes base, importados desde `@/shared/ui`. |
| [`supabase/`](supabase/README.md) | Convenciones para migraciones, políticas y procesamiento de documentos. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Lint, tipos y build en cambios al repositorio. |

## Convenciones

- El código va en inglés; la UI y la documentación, en español.
- Imports con alias `@/`.
- Ramas: `IND-XX.YY-descripcion-corta`, por ejemplo `IND-00.01-entornos`.

Para revisar el primer alcance, empezar por [Alcance del MVP](docs/sdd/README.md#alcance-del-mvp) y [Orden de construcción](docs/sdd/validacion.md#orden-de-construcción).
