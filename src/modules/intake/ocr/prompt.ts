export const EXTRACTION_PROMPT = `Lees boletas de recepción de granos (soya) de Bolivia. Recibes la imagen de UNA página escaneada o fotografiada. Puede estar rotada o cabeza abajo, tener resaltador, sellos, firmas y notas escritas a mano. Devuelve solo lo que se lee en la página, con el esquema JSON indicado.

Formatos conocidos:

1. "indapo": título "INGRESO DE GRANOS", encabezado "BALANZA - INDAPO", hoja horizontal.
- site: "Centro Acopio" (si falta, la balanza del encabezado, p. ej. SAN JULIAN).
- campaign: "Campaña" (p. ej. VER-26). product: "Producto".
- analysisNumber: "Análisis Nro.". entryNumber: "Nro. Ingreso". scaleTicket: "Tiquete Balanza". folio: número impreso en rojo junto a "Nº", abajo a la derecha.
- weighedAt: "Fecha" (y hora si figura).
- owner: "Propietario". supplierName: "Proveedor". supplierTaxId: NIT o CI del proveedor o propietario si está impreso (no el C.I. del conductor). origin: "Procedencia". driver: "Conductor". driverId: "C.I.". vehicle: "Vehículo". plate: "Placa".
- grossKg: "Peso Bruto". tareKg: "Peso Tara". netKg: "Peso Neto". discountKg: "Descuentos". liquidKg: "Peso Líquido".
- quality: una fila por factor de "Control de Calidad": name = factor, value = columna "Análisis", discountPercent = "Descto. %", discountKg = "Descto. Kg".

2. "cargill": logo Cargill, título "[Nota de Recepção]", hoja vertical, etiquetas en portugués entre corchetes.
- site: "". campaign: "[Safra]". product: "[Produtos]".
- scaleTicket: "[Número do Documento]". entryNumber: "[Nro Turno]". folio: "Comprobante". analysisNumber: "".
- weighedAt: "[Data de Emissão]".
- owner: nombre de "Remitente". supplierName: nombre de persona escrito a mano en la página, si lo hay. supplierTaxId: NIT o CI escrito junto a ese nombre, si lo hay. origin: "Procedencia". driver: "[Nome Condutor]". driverId: "[CUIL]". vehicle: "". plate: "[Placa Chassi]".
- grossKg: "[Peso Bruto]". tareKg: "[Peso Tara]". netKg: "[Peso Líquido Balança]". discountKg: "[Total Descontos]" sin signo. liquidKg: "[Líquido Comercial]".
- quality: una fila por "[Item]": name, value = "[Valor]", discountPercent = "[Desconto]", discountKg = "[Quilos Dto]". Incluye filas sin valores con null.

3. "unknown": cualquier otro documento. Completa lo que puedas.

Reglas:
- Pesos y porcentajes como número JSON, sin separadores de miles. Las boletas usan separadores distintos: "68,430" y "55.540" en un peso de camión son 68430 y 55540 kg; "1,606.77" es 1606.77. Un camión pesa entre 10000 y 80000 kg.
- No corrijas ningún valor para que las cuentas cierren: transcribe lo impreso.
- Fechas como "YYYY-MM-DDTHH:mm" (o "YYYY-MM-DD" si no hay hora). Las boletas usan día/mes/año.
- Texto tal como está impreso, sin inventar. Campo ausente o ilegible: "" o null.
- Notas a mano: transcríbelas en notes, separadas por " · ". Si indican modalidad y precio ("cerrado 402$", "precio abierto"), completa modality (closed u open), price (número) y currency (USD con "$" o "Sus", BOB con "Bs"). Si no hay: modality "none", price null, currency "none".
- uncertain: campos que no pudiste leer con seguridad (borrosos, tapados, escritos a mano o dudosos).`;
