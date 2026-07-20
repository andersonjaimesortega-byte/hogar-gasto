# HogarGasto

PWA para registrar ingresos y gastos del hogar en pesos colombianos. Supabase es la fuente compartida de datos; IndexedDB funciona únicamente como caché offline para que la app siga disponible sin Internet.

## Uso local

Requiere Node.js. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Sincronización con Supabase

Configura únicamente la URL del proyecto y una **anon key** en el modal de sincronización. Nunca uses una clave `service_role` en esta aplicación: cualquier persona con acceso al navegador podría verla.

La tabla `transactions` debe tener políticas RLS que limiten el acceso a los usuarios autorizados. La aplicación conserva registros locales solo mientras no pueda confirmar los cambios en la nube.

Para compartir los presupuestos por categoría, ejecuta [supabase-schema.sql](supabase-schema.sql) en el SQL Editor del mismo proyecto y crea políticas RLS para `app_settings` equivalentes a las de `transactions`.
