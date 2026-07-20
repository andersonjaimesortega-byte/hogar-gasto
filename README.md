# HogarGasto

PWA local-first para registrar ingresos y gastos del hogar en pesos colombianos. Los datos se guardan en el navegador mediante IndexedDB y la sincronización con Supabase es opcional.

## Uso local

Requiere Node.js. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Sincronización con Supabase

Configura únicamente la URL del proyecto y una **anon key** en el modal de sincronización. Nunca uses una clave `service_role` en esta aplicación: cualquier persona con acceso al navegador podría verla.

La tabla `transactions` debe tener políticas RLS que limiten el acceso a los usuarios autorizados. La aplicación conserva los registros locales que aún no hayan sido confirmados en la nube para evitar pérdidas de datos cuando se trabaja sin conexión.
