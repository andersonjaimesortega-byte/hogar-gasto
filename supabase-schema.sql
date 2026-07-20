-- Ejecuta este script en Supabase SQL Editor antes de usar presupuestos
-- compartidos entre dispositivos.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint app_settings_allowed_keys check (key in ('category_budgets'))
);

-- Mantén estas políticas alineadas con las de public.transactions.
-- Si usas Supabase Auth, reemplaza la condición por una que restrinja el
-- hogar o el usuario autenticado antes de activar RLS.
alter table public.app_settings enable row level security;
