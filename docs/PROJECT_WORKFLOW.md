# Procedimiento del proyecto INDAPO

**Estado:** propuesta del 28 de noviembre de 2026, pendiente de revisión de Claudio y Leandro. Rige solo INDAPO. Regula gestión, trazabilidad y autorizaciones; el producto y sus reglas viven en el [SDD](sdd/README.md). Los puntos marcados **(nuevo)** agregan reglas que el SDD, el README y la guía del tablero no fijan.

Este documento no autoriza iniciar tareas, publicar, desplegar, migrar, borrar ni cambiar la estructura del tablero.

## Fuentes

| Fuente | Contiene |
| --- | --- |
| [SDD](sdd/README.md) | Alcance, [especificación](sdd/funcional.md), [arquitectura](sdd/arquitectura.md) y [decisiones abiertas](sdd/validacion.md). |
| [README](../README.md) | Arranque local, entornos, estructura y convenciones. |
| [Módulos](../src/modules/README.md) y [Supabase](../supabase/README.md) | Límites de código y reglas de base de datos. |
| [Tablero de Trello](https://trello.com/b/IGg8UKRV/indapo) | Tarjetas, estado, responsable, dependencias y bloqueos. |
| GitHub `orvix-one/indaposist` | Ramas, PR, CI y evidencia de entrega. El repositorio es **público**. |

Ante una contradicción entre fuentes, señalarla y resolverla en el SDD antes de implementar lo afectado **(nuevo)**. Si una fuente no está disponible, decirlo.

## Tablero

Un solo tablero operativo: `Indapo`, configurado en [`pm-trello.json`](../pm-trello.json). Su tarjeta «Cómo usar el tablero» es la guía de uso.

| Lista | Significado |
| --- | --- |
| Inbox | Pedidos, errores e ideas. Más arriba, más importante. |
| Por hacer | Priorizado por el encargado del tablero. |
| En progreso | Quien desarrolla se asigna la tarjeta al moverla. |
| Hecho | Trabajo terminado. Al cerrar la iteración se renombra y archiva. |

- Etiqueta de tipo, una por tarjeta: `funcionalidad`, `bicho`, `épica`, `tech`. De estado: `urgente`, `bloqueado` (con el motivo en un comentario).
- Numeración `IND-XX.YY`.
- La tarjeta declara criterios de aceptación y, en comentario, claridad (C1–C5), dependencias, bloqueos y sección del SDD.
- **(nuevo)** Un agente no crea tarjetas, no las toma de otra persona ni cambia listas o etiquetas sin pedido expreso.
- **(nuevo)** Una tarjeta pasa a Hecho cuando su PR está revisado e integrado, cumple todos sus criterios y quien dirige el trabajo lo aprueba. Hecho no equivale a validación de Administración.
- **(nuevo)** Comentarios breves y solo ante un cambio de estado, bloqueo, decisión o resultado. El detalle técnico va en el PR o en el SDD.

## Antes de empezar una tarjeta

1. Leer la tarjeta, la sección del SDD que cita y el estado de Git.
2. Revisar dependencias (`Depende de`) y bloqueos (`Bloqueado por`).
3. Con una decisión D01–D08 abierta, avanzar solo en la conducta ya descrita, con datos sintéticos y la aprobación pendiente a la vista. No inventar reglas de negocio ni cálculos financieros.
4. Asignarse la tarjeta y moverla a «En progreso».

## Desarrollo

- **Spec primero (nuevo):** si cambia un comportamiento o una decisión, actualizar el SDD antes del código y entregarlo en el mismo PR.
- Rama `IND-XX.YY-descripcion-corta` desde `main` actualizado. Una rama por tarjeta **(nuevo)**.
- Código en inglés; UI y documentación en español. Imports con alias `@/`.
- Dependencias `app → modules → shared`. Desde fuera de un módulo se importa solo `@/modules/<modulo>`. `domain/` y `server/` no importan `next/*`.
- Pantallas construidas con `@/shared/ui`, sin colores propios.
- Montos y pesos en tipos decimales, con la moneda junto al importe; fechas de negocio en `America/La_Paz`.
- Pruebas de reglas de dominio junto al código (`*.test.ts`).
- Migraciones versionadas; cada migración de acceso incluye un caso permitido y uno denegado.

## OCR y documentos

- El proveedor es **Gemini API**, desde servidor y detrás del adaptador. Solo `src/modules/intake/ocr/providers/` lo conoce. Se configura con las variables `OCR_*` y `GEMINI_API_KEY` de [`.env.example`](../.env.example).
- El tratamiento de documentos reales requiere autorización de INDAPO (D07) antes de procesarlos con OCR.
- El OCR sugiere; una persona revisa. No aprueba boletas ni confirma pagos.
- Al repositorio, las tarjetas y los PR no van claves, boletas, comprobantes ni datos personales. Fixtures solo sintéticos. Los logs usan identificadores técnicos.
- **(nuevo)** Mientras `/api/intake/extract` no tenga autenticación, la clave se usa solo en local o en despliegues con protección de acceso.

## Entrega

1. Ejecutar `npm run check` y `npm run build`.
2. Abrir el PR con el ticket en el título y: **Qué cambia**, **Spec** (requisito del SDD), **Evidencia**, **Pendiente** y **Probar**.
3. Revisa la otra persona: flujo, permisos y evidencia. Los cálculos de negocio remiten al ejemplo validado por Administración o Contabilidad.
4. Integrar con CI en verde y revisión aprobada **(nuevo)**.

Informar solo lo verificado. Un criterio sin cumplir se declara como pendiente y la tarjeta sigue en «En progreso».

## Autorizaciones y entornos

`main` despliega a producción. El entorno de desarrollo usa provisionalmente el proyecto de Supabase de producción ([entornos](../README.md#entornos)).

**(nuevo)** Un agente necesita autorización expresa para cada una de estas acciones: commit, push, abrir o integrar un PR, aplicar migraciones, cargar o borrar datos remotos, cambiar variables o configuración de Vercel y Supabase, y desplegar. Mientras dev comparta base con producción, toda escritura en esa base se trata como producción. La autorización vale para el alcance indicado.

## Iteraciones, horas y reportes

- Iteraciones de 14 días según `pm-trello`. El cierre archiva tarjetas: se simula primero y se ejecuta con autorización.
- Los reportes se generan con `pm-trello`, fuera de los comentarios.
- **(nuevo)** No inventar horas ni deducirlas de fechas de tarjetas, commits o PR. Sin medición, «sin medir». No van en comentarios.

## Por decidir

| Tema | Pregunta |
| --- | --- |
| Reglas **(nuevo)** | ¿Leandro las acepta o cambia alguna? |
| Tablero | ¿Quién es el encargado que prioriza «Por hacer»? |
| Revisión | Al 28 de noviembre, `main` no tiene protección de rama y los PR #1 a #4 se integraron sin revisión registrada. ¿Se exige en GitHub? |
| Cambios sin tarjeta | ¿Se crea una tarjeta o se admite una rama `docs/…`? |
| Horas | ¿Se registran? ¿Dónde? |
| Entornos | ¿Cuándo habrá un proyecto de Supabase propio para desarrollo? |
