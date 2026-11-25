# Módulos de la aplicación

La estructura prevista refleja los límites definidos en la [arquitectura](../../docs/sdd/arquitectura.md).

| Directorio al incorporar el módulo | Alcance |
| --- | --- |
| `access/` | Identidad, roles y permisos. |
| `catalogs/` | Campañas, unidades, emisores, acopios y productos. |
| `intake/` | Proveedores, boletas, documentos y revisión. |
| `purchasing/` | Liquidaciones, pagos y saldos por boleta. |
| `sales/` | Clientes, despachos y cobros FIFO. |
| `reports/` | Consultas y exportación. |

Las rutas en `src/app/` llaman a las operaciones públicas del módulo. Colocar las reglas, adaptadores y pruebas junto al flujo que los usa. Las funciones de cálculo pueden probarse con entradas sintéticas. Las operaciones con datos reales verifican su contrato y autorización en servidor y Postgres.
