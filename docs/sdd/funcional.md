# Especificación funcional del MVP

[Volver al SDD](README.md) · [Validaciones pendientes](validacion.md)

## IND-01 Acceso y catálogos

Perfiles propuestos para revisión. Una persona puede ejercer más de una función si Administración lo aprueba. La matriz final debe establecer quién puede aprobar sus propios registros y qué unidades puede consultar o modificar.

| Función | Permisos previstos |
| --- | --- |
| Operación | Registrar proveedores y clientes según permisos, cargar documentos y preparar boletas y despachos. |
| Supervisión | Revisar, aprobar, observar o rechazar registros de su ámbito. |
| Administración | Gestionar usuarios y catálogos, ejecutar operaciones financieras autorizadas y resolver excepciones documentales con motivo. |
| Consulta | Leer y exportar los datos permitidos. |

Las cuentas se crean por invitación. El sistema valida los permisos en servidor y base de datos. Campañas, productos, emisores, acopios y unidades de negocio tienen identificadores propios. Mientras INDAPO confirma su relación (D02), cada emisor pertenece a una unidad de negocio y la boleta toma la unidad de su emisor: San Julián, Cuatro Cañadas o Proléa. Se desactivan registros referenciados para preservar el histórico. Los cambios de permisos y operaciones sensibles quedan auditados.

**Aceptación**. Un usuario dado de baja pierde el acceso operativo. Una cuenta de consulta puede leer y exportar en su ámbito. Solo las funciones autorizadas pueden mutar datos y consultar documentos de la unidad correspondiente.

## IND-02 Proveedores y boletas

1. Oficina registra la llegada del documento físico y adjunta el escaneo. La fecha de ingreso del camión y la fecha de llegada a oficina se conservan en campos distintos.
2. La carga asistida acepta PDF e imágenes. Un PDF de varias páginas se separa en un documento por página, con el supuesto de una boleta por página. Si una boleta ocupa más de una página, el operador las une y se leen como un solo documento. Cada página conserva su propia huella y la del archivo original. El OCR sugiere campos de la boleta, muestra campos pendientes y permite corregirlos con el documento a la vista. El operador puede cargar manualmente cuando el OCR está indisponible o la boleta es ilegible.
3. Se captura el emisor, la unidad, el acopio, la campaña, el producto y los identificadores impresos disponibles. Se distinguen números de ingreso, balanza, análisis y folio según el formato. Se conservan bruto, tara, neto, descuentos, neto comercial y análisis de calidad cuando estén disponibles. Los factores de calidad sin fila propia se suman en «Otros» para que el total coincida con el impreso. Al registrar la boleta se definen además la carga a pagar, su unidad de medida (toneladas o kilogramos), el precio por unidad y la moneda (BOB o USD). La carga puede tomarse del peso líquido. El importe es carga × precio, redondeado a centavos.
4. Los datos de boleta se validan con aritmética y tolerancias aprobadas. El operador identifica al proveedor aplicable y registra discrepancias entre titular impreso y beneficiario cuando corresponda. El proveedor conserva su historial y la relación de agrupación que confirme INDAPO.
5. Una boleta pasa de borrador a revisión y luego a aprobada, observada o rechazada. Observar y rechazar exigen motivo. Una observación puede corregirse y reenviarse. Mientras se valida la matriz de permisos, Administración resuelve las boletas en revisión. Anulaciones y excepciones requieren autorización y motivo. La elegibilidad de pago se evalúa aparte con la política de RUA, original, copia y reimpresión.

San Julián y Cuatro Cañadas comparten formato según la llamada. Proléa/Cargill requiere un mapeo propio. El diccionario por formato y la clave documental serán validados con los originales vigentes. Ante una coincidencia ambigua, la boleta queda en revisión.

**Aceptación**. Una boleta de cada formato puede completarse y consultarse, incluso si un campo crítico se ingresó manualmente. El sistema identifica el mismo archivo por huella y somete una posible reimpresión o captura de la misma boleta a revisión sin crear otra obligación de pago.

## IND-03 Liquidaciones y pagos

### Pagos por boleta

Reglas definidas por Orvix el 28 de noviembre de 2026, a validar con Administración y Contabilidad.

- Cada boleta aprobada genera una obligación por su importe, en la moneda de la boleta. Admite pagos totales o parciales en fechas distintas. Su estado de pago es **abierta** mientras tenga saldo, sin pagos o con pago parcial, y **cerrada** cuando queda pagada. Este estado es distinto de la modalidad de precio abierta o cerrada del relevamiento.
- Un pago registra fecha, importe y moneda (BOB o USD), tipo de cambio en bolivianos por dólar vigente en la fecha del pago, método (transferencia bancaria, QR, cheque, depósito u otro), banco, cuenta bancaria, responsable y comprobante adjunto. Todos son obligatorios.
- Cada pago conserva su propio tipo de cambio. Si su moneda difiere de la de la boleta, el importe se convierte con esa tasa y se redondea a centavos. Se conservan el importe original, la tasa y el importe aplicado. Un pago no puede superar el saldo.
- La boleta muestra importe, pagado, saldo, estado e historial de pagos. La página de pagos lista las boletas aprobadas con filtros por estado y proveedor y totales por moneda, sin mezclarlas. La ficha de cada proveedor muestra todas sus boletas, sus pagos y su saldo y lo pagado por moneda.

**Aceptación**. Una boleta de Bs 10.000 con un pago de Bs 4.000 queda abierta con Bs 6.000 de saldo. Una boleta en USD pagada en bolivianos aplica el importe convertido con la tasa de ese pago, y dos pagos en fechas distintas conservan tasas distintas. Un pago mayor al saldo se rechaza. Al cubrir el saldo, la boleta queda cerrada.

### Pendiente de validar (D04)

- La modalidad comercial es abierta o cerrada. La abierta admite anticipos y cierre posterior según reglas de Administración. Bonos y ajustes se registran como conceptos explícitos. La moneda, tasa aplicada, valor, fecha y versión de la regla quedan asociados a la liquidación o pago que los usa.
- Una boleta puede recibir varios pagos y un pago puede asignarse a varias boletas del mismo beneficiario y unidad de negocio. Se registra el importe aplicado por boleta. El flujo de selección previsualiza totales, toneladas, saldos y glosa. El confirmado registra el comprobante bancario, la fecha y las asignaciones.
- La elegibilidad se comprueba al confirmar, incluyendo las restricciones de documento, RUA y beneficiario que Administración valide. El sistema distingue monto estimado, saldo exigible, pago solicitado si se aprueba ese paso y pago confirmado. Un cambio posterior en una tasa o precio de catálogo deja trazables los valores originales de operaciones ya registradas.
- La corrección de un movimiento confirmado se registra mediante una reversión o ajuste autorizado con referencia al original. Los arqueos y exportaciones reflejan la operación y su corrección.

**Aceptación**. Un anticipo y su cierre producen el saldo acordado con Contabilidad. Una selección que combina unidades requiere liquidaciones separadas. Dos confirmaciones simultáneas sobre el mismo saldo aplican únicamente lo disponible. El mismo envío con idéntica clave de reintento devuelve el resultado previo. Una clave reutilizada con otro contenido se rechaza.

## IND-04 Clientes y despachos

Cliente y proveedor son registros comerciales independientes. Un despacho confirmado tiene cliente, fecha, número de documento, destino y las líneas de producto requeridas. Cada línea conserva cantidad, unidad y precio, y el despacho conserva los totales y el respaldo que correspondan. La confirmación genera la cuenta por cobrar. Las correcciones de despachos con abonos requieren una operación auditada que preserve las aplicaciones existentes o revertidas según la política aprobada.

**Aceptación**. Un despacho con varias líneas cambia a pendiente de cobro al confirmar. El saldo de la ficha del cliente y el documento de respaldo corresponden a ese despacho. Repetir la confirmación conserva una sola cuenta por cobrar.

## IND-05 Cobros

Se registra el comprobante de un abono y se previsualiza su distribución a los despachos pendientes del cliente, empezando por el de mayor antigüedad. La fecha que ordena el FIFO, el desempate y el tratamiento de excedentes se validan con Administración. La confirmación recalcula la distribución con saldos vigentes. Si la vista previa quedó desactualizada, se devuelve la nueva distribución para revisión. El historial conserva cobros, aplicaciones y anulaciones.

**Aceptación**. Con saldos de Bs 5.000, Bs 12.000 y Bs 6.500 en orden de antigüedad, un abono de Bs 10.000 aplica Bs 5.000 a cada uno de los dos primeros y deja Bs 13.500 pendientes. El ejemplo reproduce el relevamiento histórico. Se validará con un caso operativo de INDAPO.

## IND-06 Reportes

Consultas internas de boletas recibidas, reportes por proveedor, pagos y saldos, despachos y cuentas por cobrar. Las vistas diferencian fecha de camión, llegada y operación financiera cuando sean aplicables. Los importes se agregan en su moneda o mediante una conversión aprobada visible. Las exportaciones XLSX usan los mismos filtros, permisos y definiciones que la vista. Desde la ficha del proveedor se genera su historial en PDF para enviárselo: boletas aprobadas con pesos y descuentos por calidad, pagos, y saldo por moneda, filtrable por campaña y fechas de pesaje. El portal de autoservicio para proveedores queda fuera del MVP.

**Aceptación**. Un reporte filtrado reconcilia con sus registros operativos, muestra qué saldos son estimados o exigibles, diferencia monedas y conserva en la exportación el mismo ámbito de datos que en pantalla.
