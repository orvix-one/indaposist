# Supabase

La [arquitectura](../docs/sdd/arquitectura.md) describe Auth, Postgres, archivos y OCR.

Al incorporar la primera operación con datos, versionar la configuración local y las migraciones en este directorio. Mantener las migraciones en `migrations/` y las funciones desplegables en `functions/`. Usar versiones revisadas de la CLI y fixtures sintéticos. Cada migración de acceso debe incluir casos de permiso concedido y denegado.

El arranque de Next.js es autónomo. Los proyectos de Supabase y los secretos por entorno se configuran al incorporar las integraciones.
