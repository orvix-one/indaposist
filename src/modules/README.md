# Módulos

| Módulo | Alcance |
| --- | --- |
| `access/` | Identidad, roles y permisos. |
| `catalogs/` | Campañas, unidades, emisores, acopios y productos. |
| `intake/` | Proveedores, boletas, documentos y revisión. |
| `purchasing/` | Liquidaciones, pagos y saldos por boleta. |
| `sales/` | Clientes, despachos y cobros FIFO. |
| `reports/` | Consultas y exportación. |

Cada módulo se crea con su primer ticket.

```
<modulo>/
  index.ts      API pública
  domain/       reglas puras, sin IO, con *.test.ts al lado
  server/       actions, queries y repositorios ("server-only")
  ui/           componentes del módulo
  schemas.ts    contratos zod
```

## Reglas

- Dependencias: `app → modules → shared`. ESLint lo controla.
- Desde fuera solo se importa `@/modules/<modulo>`.
- `domain/` y `server/` no importan `next/*`.
- Cada módulo es dueño de sus tablas. Los demás acceden por su API.
