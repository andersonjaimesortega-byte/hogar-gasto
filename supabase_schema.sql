-- ==============================================================================
-- SCHEMA PMO DASHBOARD - TABLA Y SINCRONIZACIÓN EN TIEMPO REAL
-- Copia y pega todo este código en el SQL Editor de tu proyecto en Supabase
-- ==============================================================================

-- 1. Crear la tabla de portafolios y proyectos
CREATE TABLE IF NOT EXISTS public.pmo_portfolios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT 'PORT-01',
    atc TEXT DEFAULT 'Sin Asignar',
    description TEXT DEFAULT '',
    projects JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna atc si la tabla ya existía previamente
ALTER TABLE public.pmo_portfolios ADD COLUMN IF NOT EXISTS atc TEXT DEFAULT 'Sin Asignar';

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.pmo_portfolios ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para permitir lectura y escritura pública / anónima
DROP POLICY IF EXISTS "Permitir lectura publica" ON public.pmo_portfolios;
CREATE POLICY "Permitir lectura publica" 
ON public.pmo_portfolios FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion publica" ON public.pmo_portfolios;
CREATE POLICY "Permitir insercion y actualizacion publica" 
ON public.pmo_portfolios FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Habilitar Supabase Realtime para que los cambios se transmitan en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.pmo_portfolios;

-- 5. Trigger automático para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at ON public.pmo_portfolios;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.pmo_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.pmo_portfolios IS 'Tabla principal de portafolios y proyectos del PMO Dashboard con soporte Realtime y rol ATC';
