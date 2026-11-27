# Arquitectura de INDAPO

[Volver al SDD](README.md) · [Especificación funcional](funcional.md)

## Aplicación y límites

Una aplicación modular en Next.js App Router y TypeScript, ejecutada en Vercel. Las rutas componen pantallas y validan entradas. Los módulos concentran reglas de negocio y operaciones de datos. Supabase aporta Postgres, Auth, Storage privado y procesamiento de boletas con Queues. El OCR se integra desde servidor con un modelo de visión y salida estructurada, detrás de un adaptador que aísla al proveedor (hoy Gemini API). Los comandos financieros se confirman en Postgres dentro de transacciones. [Next.js App Router](https://nextjs.org/docs/app) · [Supabase Queues](https://supabase.com/docs/guides/queues) · [Gemini API: salida estructurada](https://ai.google.dev/gemini-api/docs/structured-output)

| Módulo | Responsabilidad | Interfaces principales previstas |
| --- | --- | --- |
| Acceso y catálogos | Usuarios, roles, alcance por unidad, campañas, emisores, productos y unidades. | Resolver actor y alcance. Consultar catálogos vigentes. |
| Recepción | Proveedor, escaneo, extracción, revisión y aprobación de boleta. | Registrar captura. Confirmar boleta revisada. Consultar elegibilidad con compras. |
| Compras | Condiciones comerciales, liquidaciones, pagos y asignaciones. | Previsualizar liquidación. Confirmar pago. Consultar saldo. |
| Ventas | Clientes, despachos, cuenta por cobrar y abonos FIFO. | Confirmar despacho. Previsualizar y confirmar abono. Consultar saldo. |
| Reportes | Lecturas de compras y ventas y exportaciones. | Consultas y exportación con los mismos filtros y permisos. |

### Interfaz

La primera versión del design system está en `src/shared/ui/` y se muestra en la ruta `/design-system`. Define tokens de color derivados de la web de INDAPO (verde bosque, oliva, papel y dorados), tipografía Geist y componentes base de pantalla, formulario, toolbar y tabla. Las pantallas de cada módulo se construyen con esos componentes y no definen colores propios. Incluye un visor de documentos para imagen y PDF (pdf.js) con zoom, rotación y paginación. Ticket: IND-00.04.

La recepción de boletas (`src/modules/intake`) tiene la interfaz completa con datos sintéticos: inicio, listado con filtros (IND-02.11), carga y bandeja con huella SHA-256 y duplicados (IND-02.03, IND-02.04), revisión con documento al lado, confianza por campo y validación aritmética (IND-02.05), datos de oficina (IND-02.10) y envío a revisión con historial (IND-02.06). El estado vive en memoria del navegador y se pierde al recargar. El OCR es real y corre sin persistencia para validar con el cliente: el navegador separa cada PDF en una imagen por página (IND-02.08) y `POST /api/intake/extract` la envía al proveedor configurado, que devuelve formato (INDAPO o Cargill), campos y confianza (IND-00.07, IND-02.09). Solo `ocr/providers/` conoce al proveedor; se elige con `OCR_PROVIDER` y `OCR_MODEL`. Las cuentas de pesos que no cierran disparan un reintento con `OCR_MODEL_FALLBACK` y bajan la confianza de los campos involucrados. Una boleta del mismo emisor y número que otra ya cargada queda como duplicada. Las reglas puras están en `domain/` con pruebas (`npm test`).

### Backend

Sin servicio aparte: el backend son Server Actions y Route Handlers de Next.js en Vercel. Las transacciones financieras son funciones SQL en Postgres, y el consumidor de OCR es un Route Handler disparado por cron de Supabase.

### Modelo lógico inicial

| Conjunto | Entidades y relaciones previstas |
| --- | --- |
| Organización | Usuario interno, rol y ámbito. Campaña, acopio, emisor, producto y unidad de negocio. |
| Recepción | Proveedor con vínculos de agrupación. Boleta aprobable con fechas de camión y oficina. Documento con huella, tipo y trazabilidad. Extracción versionada y decisiones de revisión. |
| Compras | Condición comercial versionada, liquidación, pago y aplicación de pago a boleta. Beneficiario y unidad definidos para cada pago. |
| Ventas | Cliente, despacho con líneas, cobro y aplicación de cobro a despacho. |
| Auditoría | Actor, acción, entidad, fecha, motivo cuando corresponda e identificador de correlación. |

Diseñar el esquema físico al implementar cada módulo. Usar tipos decimales para moneda y peso, fechas de negocio en `America/La_Paz` e instantes de auditoría con zona horaria. Guardar la moneda junto a cada importe y validar precisión y redondeo con Contabilidad.

## Procesamiento de boletas

1. La aplicación autoriza la carga directa de PDF o imagen a Storage privado y reserva una ruta única. El servidor comprueba la carga y el tipo y tamaño permitidos antes de encolar el trabajo.
2. Una operación en Postgres registra el estado y encola la referencia al documento. Cada trabajo representa un documento y una versión de extracción.
3. Un consumidor interno procesa lotes acotados y envía el archivo permitido a OpenAI. La salida estructurada contiene valores extraídos o campos ausentes. Un validador comprueba esquema, formato y coherencia. Se guardan fuente y versión de modelo y esquema junto con el resultado.
4. El consumidor confirma el mensaje después de persistir el resultado. Los reintentos recuperan el trabajo con una clave idempotente. Los fallos definitivos quedan visibles en la bandeja de revisión para reintento autorizado o carga manual. El flujo de OCR carece de permisos para aprobar boletas o confirmar pagos.
5. El operador compara documento y sugerencias. La huella identifica archivos idénticos. El control de identidad documental detecta una misma boleta en archivos diferentes. Un caso ambiguo queda sujeto a revisión antes de liquidarse.

Propuesta para el MVP. Usar Supabase Queues con un consumidor interno disparado por cron de Supabase. Definir el tamaño de lote, el intervalo y la política de reintentos al medir con archivos reales. Autorizar el tratamiento, la retención y el acceso a los documentos con INDAPO antes del OCR con muestras reales. [Consumir mensajes de Supabase Queues](https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions) · [Gemini API: facturación](https://ai.google.dev/gemini-api/docs/billing) · [Gemini API: uso de datos](https://ai.google.dev/gemini-api/docs/logs-policy)

## Integridad financiera

En cada confirmación, registrar la clave de idempotencia y cotejar su contenido. Dentro de la misma transacción, validar actor, permisos y versión de las reglas, bloquear los saldos afectados en orden estable, recalcular aplicaciones y persistir el movimiento con su auditoría. Adquisición de bloqueos y restricciones de unicidad deben impedir duplicaciones y sobreaplicaciones bajo concurrencia. El resultado de la vista previa puede cambiar si otro usuario confirma un movimiento antes.

Los pagos a proveedores se asignan a boletas seleccionadas. En ventas se aplica FIFO por cliente con orden determinista. Reportes y estados se derivan de aplicaciones y reversiones confirmadas, con los montos históricos de cada operación.

## Acceso y entornos

- Invitación de cuentas internas y alcance por unidad. Las decisiones de acceso usan autorizaciones del servidor y políticas de base de datos. Mantener tablas y objetos bajo mínimo privilegio, con RLS en esquemas expuestos y acceso explícito por operación. [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Storage privado con acceso por autorización y enlaces de vigencia acotada donde corresponda. Credenciales de OpenAI y Supabase privilegiadas solo en los procesos de servidor que las usan.
- Entornos de desarrollo y producción independientes. Los datos de prueba versionados son sintéticos. Logs de OCR y operaciones usan identificadores técnicos y omiten el contenido de boletas y comprobantes.
- Migraciones versionadas y verificación de acceso con cuentas autorizadas y denegadas. Definir respaldo, restauración y conciliación operativa antes del corte a producción.
