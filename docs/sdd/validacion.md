# Decisiones y validación del MVP

[Volver al SDD](README.md) · [Especificación funcional](funcional.md)

Administración es la contraparte de validación. Andrés compartirá las boletas y el Excel vigente posteriormente. El diseño marca las decisiones que requieren ese material y permite avanzar con datos sintéticos en los flujos cuya conducta ya está descrita.

## Decisiones abiertas

| ID | Responsable de validar | Evidencia o decisión | Afecta |
| --- | --- | --- | --- |
| D01 | Orvix y Administración | Aceptación del alcance del MVP general y de los flujos históricos de ventas. | IND-04 a IND-06 |
| D02 | Andrés y Administración | Excel actual con fórmulas, boletas recientes de los tres acopios, ejemplos ilegibles, catálogos y significado de los identificadores por formato. | IND-01, IND-02 |
| D03 | Administración | Fecha que inicia el plazo, reglas por campaña y proveedor, clave documental, tratamiento de copias y reimpresiones, titular y beneficiario, agrupadores y exigencia de RUA. | IND-02, IND-03 |
| D04 | Administración y Contabilidad | Fórmulas y casos de precio abierto y cerrado, anticipos, bonos, ajustes, fecha y fuente de tasa, moneda, redondeo, liquidación por unidad, glosa y reversión. | IND-03, IND-06 |
| D05 | Administración | Responsables por rol, aprobación propia o separada, excepciones, anulaciones y acceso por unidad. | IND-01 a IND-06 |
| D06 | Administración y Contabilidad | Documento de salida, reglas de confirmación, orden FIFO con desempate, abonos excedentes y reversión. | IND-04 a IND-06 |
| D07 | Administración y Orvix | Titularidad y tratamiento de documentos, muestras autorizadas, tolerancias, mediciones de OCR y volumen a validar. | IND-02 |
| D08 | Administración y Orvix | Campaña de arranque, saldos de apertura, importación acordada y conciliación de corte. | IND-01 a IND-06 |

El 28 de noviembre Orvix definió de forma provisional dos partes de estas decisiones, a validar con Administración. Para D05, un único usuario de Administración puede hacer todo mientras se valida la matriz de permisos. Para D04, el registro de pagos por boleta con tipo de cambio por pago descrito en [Pagos por boleta](funcional.md#pagos-por-boleta). Siguen abiertos anticipo y cierre, bonos y ajustes, pago de varias boletas con glosa, redondeo y reversión. Estas pantallas se construyen en memoria, como la recepción, antes de la persistencia.

Mientras se aprueba D07, la validación aritmética de pesos tolera 1 kg para absorber el redondeo de los descuentos de calidad impresos con decimales.

## Orden de construcción

| Tramo | Cambios previstos | Evidencia de revisión |
| --- | --- | --- |
| 1. Acceso y captura | Incorporar Auth, catálogos, proveedores, carga privada, borrador y revisión manual. | Recorrido con una cuenta operadora y otra de lectura. Escaneo visible solo para el ámbito autorizado. |
| 2. OCR y preparación de pagos | Procesar el lote en cola, guardar sugerencias y facilitar revisión, duplicados y aprobación. Desarrollar liquidaciones con casos sintéticos acordados. | Reintento del consumidor sin otro borrador ni otro resultado persistido. Boleta duplicada queda sin obligación adicional. |
| 3. Saldos, despachos y cobros | Cerrar reglas verificadas para pagos, completar flujos de ventas y sumar consultas y exportaciones. | Pago parcial, confirmaciones concurrentes y flujo despacho → cobro FIFO reproducibles. Reportes conciliados con las operaciones. |
| 4. Validación operativa | Ejecutar pruebas con Administración y Contabilidad cuando compartan archivos, conciliar datos iniciales y preparar la entrega. | Acta o registro de aceptación con los casos ejecutados, resultados y pendientes. |

Los tramos son incrementos internos del mismo MVP. El punto de partida para revisar con Leandro es cerrar el tramo 1 y registrar quién valida cada decisión de negocio. Las partes con reglas financieras pendientes pueden usar fixtures sintéticos y mantener explícita la condición de aprobación operativa.

## Casos para la prueba con INDAPO

- Capturar una boleta legible y una difícil por formato. Comparar el neto, folio, unidad y demás campos críticos con lectura humana. Medir correcciones y tiempo por boleta.
- Procesar una carga representativa del pico descrito de 200 boletas en un día. Medir cola, reintentos y tiempo de oficina. Acordar el criterio de aceptación al obtener la muestra y el volumen actual.
- Verificar duplicado, reimpresión, copia y un titular impreso distinto del beneficiario, con el resultado documental y financiero esperado.
- Conciliar boleta cerrada, anticipo y cierre, tipo de cambio variable, bono o ajuste y pago selectivo de varias boletas. Comparar asignaciones, saldo, comprobante y glosa con Contabilidad.
- Confirmar un despacho, registrar un cobro FIFO y revertir un movimiento autorizado. Conciliar la ficha del cliente y el reporte exportado.

## Revisión entre Claudio y Leandro

Propuesta de colaboración. Cada PR vincula el requisito del SDD, explica los cambios de comportamiento y adjunta evidencia de los casos relevantes. La otra persona revisa el flujo, sus permisos y la evidencia. Los cálculos de negocio remiten al ejemplo validado por Administración o Contabilidad. Una decisión cambiada se actualiza en el mismo PR que modifica el comportamiento.
