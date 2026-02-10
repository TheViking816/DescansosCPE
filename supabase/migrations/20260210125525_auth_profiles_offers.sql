-- ============================================
-- DESCANSOS CPE - Supabase Auth + RLS Setup
-- ============================================
-- Objetivo:
-- - Login/registro con contraseÃ±a usando Supabase Auth
-- - Perfil de usuario en `public.usuarios` ligado a `auth.users`
-- - Ofertas en `public.ofertas` ligadas al usuario autenticado
-- - Selector de grupo desde `public.grupos_descanso`
--
-- IMPORTANTE:
-- 1) Ejecuta este SQL en el editor SQL de Supabase (proyecto xwouicfsrljxdeihpzll).
-- 2) Si ya tienes tablas `usuarios/ofertas` antiguas, revisa la secciÃ³n "LEGACY".

-- Necesario para gen_random_uuid() en algunos proyectos
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- 0) Tablas LEGACY (opcional)
-- =========================
-- Si ya existe un esquema anterior incompatible, puedes renombrar:
-- ALTER TABLE IF EXISTS public.ofertas RENAME TO ofertas_legacy;
-- ALTER TABLE IF EXISTS public.usuarios RENAME TO usuarios_legacy;

-- Auto-renombrado si existen tablas previas incompatibles (no borra datos)
DO $$
DECLARE
  suffix text := to_char(now(), 'YYYYMMDDHH24MISS');
  has_usuarios boolean;
  has_ofertas boolean;
  usuarios_id_type text;
  ofertas_user_id_type text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'usuarios'
  ) INTO has_usuarios;

  IF has_usuarios THEN
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usuarios' AND column_name='id'
    INTO usuarios_id_type;

    -- Queremos `public.usuarios.id` = uuid
    IF usuarios_id_type IS DISTINCT FROM 'uuid' THEN
      EXECUTE format('ALTER TABLE public.usuarios RENAME TO %I', 'usuarios_legacy_' || suffix);
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ofertas'
  ) INTO has_ofertas;

  IF has_ofertas THEN
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ofertas' AND column_name='user_id'
    INTO ofertas_user_id_type;

    -- Queremos `public.ofertas.user_id` = uuid
    IF ofertas_user_id_type IS DISTINCT FROM 'uuid' THEN
      EXECUTE format('ALTER TABLE public.ofertas RENAME TO %I', 'ofertas_legacy_' || suffix);
    END IF;
  END IF;
END $$;

-- =========================
-- 1) CatÃ¡logo de grupos
-- =========================
CREATE TABLE IF NOT EXISTS public.grupos_descanso (
  codigo text PRIMARY KEY,
  nombre text NOT NULL
);

INSERT INTO public.grupos_descanso (codigo, nombre)
VALUES
  ('A', 'Grupo A'),
  ('B', 'Grupo B'),
  ('C', 'Grupo C')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- =========================
-- 1b) CatÃ¡logo de especialidades
-- =========================
CREATE TABLE IF NOT EXISTS public.especialidades (
  codigo text PRIMARY KEY,
  nombre text NOT NULL
);

-- Seed inicial (pÃ¡same el resto y lo aÃ±adimos aquÃ­)
INSERT INTO public.especialidades (codigo, nombre)
VALUES
  ('01', 'CAPATAZ'),
  ('02', 'CLASIFICADOR'),
  ('03', 'ESPECIALISTA'),
  ('15', 'MAFIS'),
  ('18', 'GRUAS'),
  ('19', 'CONTAINERa'),
  ('20', 'ELEVADORAS'),
  ('22', 'TRASTAINERS'),
  ('23', 'SOBORDISTA'),
  ('27', 'GRUA MOVIL'),
  ('30', 'FURGONETERO'),
  ('40', 'APOYO VEHICULOS'),
  ('11', 'CONDUCTOR 1a'),
  ('12', 'CONDUCTOR 2a')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- =========================
-- 2) Perfiles (ligados a auth.users)
-- =========================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chapa text NOT NULL UNIQUE CHECK (chapa ~ '^[0-9]{5}$'),
  nombre text NOT NULL,
  telefono text NOT NULL,
  grupo_descanso text NOT NULL REFERENCES public.grupos_descanso(codigo),
  semana text NOT NULL CHECK (semana IN ('V','N')),
  especialidad_codigo text NOT NULL DEFAULT '01' REFERENCES public.especialidades(codigo),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_chapa ON public.usuarios(chapa);

-- Backfill/upgrade si la tabla ya existÃ­a sin la columna
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS especialidad_codigo text;

UPDATE public.usuarios
SET especialidad_codigo = COALESCE(especialidad_codigo, '01')
WHERE especialidad_codigo IS NULL;

ALTER TABLE public.usuarios
  ALTER COLUMN especialidad_codigo SET DEFAULT '01';

-- Intentar aÃ±adir FK si no existe (si falla por datos, corrige y reintenta)
DO $$
BEGIN
  ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_especialidad_fk
    FOREIGN KEY (especialidad_codigo) REFERENCES public.especialidades(codigo);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Mantener updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_set_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_set_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- 3) Ofertas
-- =========================
CREATE TABLE IF NOT EXISTS public.ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tengo_desde date NOT NULL,
  tengo_hasta date NOT NULL,
  necesito_desde date NOT NULL,
  necesito_hasta date NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tengo_fechas_validas CHECK (tengo_hasta >= tengo_desde),
  CONSTRAINT necesito_fechas_validas CHECK (necesito_hasta >= necesito_desde)
);

CREATE INDEX IF NOT EXISTS idx_ofertas_user_id ON public.ofertas(user_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_created_at ON public.ofertas(created_at DESC);

-- =========================
-- 4) Trigger: crear perfil al registrar usuario
-- =========================
-- El frontend hace: signUp(email/password) con options.data:
-- { nombre, chapa, telefono, grupo_descanso, semana }
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, chapa, nombre, telefono, grupo_descanso, semana, especialidad_codigo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'chapa', ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    COALESCE(NEW.raw_user_meta_data->>'grupo_descanso', 'A'),
    COALESCE(NEW.raw_user_meta_data->>'semana', 'V'),
    COALESCE(NEW.raw_user_meta_data->>'especialidad_codigo', '01')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- 5) RLS
-- =========================
ALTER TABLE public.grupos_descanso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;

-- Grupos: visibles para cualquiera (sirve para el selector en registro sin login)
DROP POLICY IF EXISTS grupos_select_authenticated ON public.grupos_descanso;
CREATE POLICY grupos_select_authenticated
ON public.grupos_descanso
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS especialidades_select ON public.especialidades;
CREATE POLICY especialidades_select
ON public.especialidades
FOR SELECT
TO anon, authenticated
USING (true);

-- Usuarios: lectura para autenticados; escritura solo sobre tu propio perfil
DROP POLICY IF EXISTS usuarios_select_authenticated ON public.usuarios;
CREATE POLICY usuarios_select_authenticated
ON public.usuarios
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS usuarios_insert_self ON public.usuarios;
CREATE POLICY usuarios_insert_self
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS usuarios_update_self ON public.usuarios;
CREATE POLICY usuarios_update_self
ON public.usuarios
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Ofertas: lectura para autenticados; mutaciÃ³n solo propias
DROP POLICY IF EXISTS ofertas_select_authenticated ON public.ofertas;
CREATE POLICY ofertas_select_authenticated
ON public.ofertas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS ofertas_insert_self ON public.ofertas;
CREATE POLICY ofertas_insert_self
ON public.ofertas
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ofertas_update_self ON public.ofertas;
CREATE POLICY ofertas_update_self
ON public.ofertas
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ofertas_delete_self ON public.ofertas;
CREATE POLICY ofertas_delete_self
ON public.ofertas
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
