# SDD de INDAPO

**Estado:** borrador para revisión de Orvix. **Validación operativa:** Administración de INDAPO.

INDAPO necesita reemplazar el registro manual en Excel con un sistema interno que permita seguir el recorrido de cada boleta hasta su pago, y el de cada despacho hasta su cobro. Se propone una sola primera versión operativa con flujos completos en el alcance histórico y entregas internas que Claudio y Leandro puedan revisar durante el desarrollo.

## Alcance del MVP

| ID | Flujo | Resultado en la primera entrega |
| --- | --- | --- |
| IND-01 | Acceso y configuración | Personal autorizado ingresa con su rol. Administración gestiona usuarios, campañas, productos, acopios y unidades de negocio. |
| IND-02 | Proveedores y boletas | Oficina registra la boleta al recibir el papel, conserva el escaneo, usa OCR asistido y revisa los datos antes de confirmar. Consulta historial por proveedor, campaña y unidad. |
| IND-03 | Liquidaciones y pagos | Administración calcula según reglas validadas, selecciona boletas, registra anticipos o pagos y consulta saldo, comprobante y glosa. |
| IND-04 | Clientes y despachos | Oficina registra clientes y salidas de producto, conserva respaldo y genera el saldo por cobrar del despacho confirmado. |
| IND-05 | Cobros | Oficina registra un abono de cliente, revisa su distribución FIFO y consulta el estado de cuenta. |
| IND-06 | Reportes | Administración consulta y exporta los estados de compras, pagos, despachos y cobros por los filtros pertinentes. |

La inclusión de clientes, despachos y cobros en la misma primera versión es una propuesta de Orvix para el MVP general. La digitalización de compras tiene prioridad de construcción. El registro de transferencias es documental y contable, con el desembolso en la operación bancaria habitual.

## Material para revisión

1. [Especificación funcional](funcional.md) con permisos, estados, reglas y aceptación por flujo.
2. [Arquitectura](arquitectura.md) con límites de módulos, datos, procesos de OCR y seguridad.
3. [Decisiones y validación](validacion.md) con datos esperados de Andrés, escenarios de prueba y orden de construcción.

## Trazabilidad

| Base | Aplicación |
| --- | --- |
| Cotización comercial INDAPO Web de mayo de 2026, secciones 3 a 7 y anexos | Alcance histórico, roles y ejemplos referenciales de boletas, Excel y despachos. |
| Relevamientos INDAPO Web en PDF y Word, secciones 3 a 6 | Reglas y referencias `RF-AU`, `RF-CF`, `RF-PR`, `RF-BO`, `RF-PA`, `RF-CL`, `RF-DE`, `RF-CO` y `RF-TA`. |
| Relevamiento del 18 de noviembre, 08:40–19:58, 22:32–27:49, 28:24–41:12 | Recepción en oficina, formatos, precio abierto y cerrado, tasa variable, unidades, comprobante y control de boletas físicas. |
| Definición de Orvix para la retomada | MVP general, Administración como contraparte y revisión posterior con Excel y boletas facilitados por Andrés. |

Las referencias históricas identifican la procedencia de las reglas. Las decisiones de negocio y los criterios aprobados se incorporarán al SDD a medida que Administración los confirme.
