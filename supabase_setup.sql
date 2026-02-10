-- ============================================
-- DESCANSOS CPE - Supabase SQL Setup (CORREGIDO)
-- Puerto de Valencia
-- ============================================

-- IMPORTANTE: Si ya ejecutaste el anterior, primero borra la tabla usuarios vieja:
-- DROP TABLE IF EXISTS usuarios CASCADE;
-- DROP TABLE IF EXISTS ofertas CASCADE;

-- 1. TABLA DE USUARIOS (trabajadores)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,                -- Chapa (ej: '72683')
  nombre TEXT NOT NULL,
  grupo_descanso TEXT NOT NULL CHECK (grupo_descanso IN ('A', 'B', 'C')),
  semana TEXT NOT NULL CHECK (semana IN ('V', 'N')),
  grupo_profesional TEXT NOT NULL DEFAULT 'Manipulador', -- Todos son Manipuladores
  telefono TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE OFERTAS DE CAMBIO
CREATE TABLE IF NOT EXISTS ofertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tengo_desde DATE NOT NULL,
  tengo_hasta DATE NOT NULL,
  necesito_desde DATE NOT NULL,
  necesito_hasta DATE NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tengo_fechas_validas CHECK (tengo_hasta >= tengo_desde),
  CONSTRAINT necesito_fechas_validas CHECK (necesito_hasta >= necesito_desde)
);

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO
CREATE POLICY "Usuarios visibles para todos" ON usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "Usuario puede actualizar su teléfono" ON usuarios FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Ofertas visibles para todos" ON ofertas FOR SELECT TO anon USING (true);
CREATE POLICY "Cualquiera puede crear ofertas" ON ofertas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Cualquiera puede borrar ofertas" ON ofertas FOR DELETE TO anon USING (true);
CREATE POLICY "Cualquiera puede actualizar ofertas" ON ofertas FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. DATOS INICIALES (Todos 'Manipulador')
INSERT INTO usuarios (id, nombre, grupo_descanso, semana, grupo_profesional) VALUES
  ('72690', 'HÉCTOR SOLÍS', 'B', 'N', 'Manipulador'),
  ('72685', 'NEREA ARAQUE', 'C', 'V', 'Manipulador'),
  ('72683', 'ADRIÁN LUJÁN', 'A', 'V', 'Manipulador'),
  ('72691', 'CARLOS MARTÍNEZ', 'A', 'N', 'Manipulador'),
  ('72692', 'LAURA GARCÍA', 'B', 'V', 'Manipulador'),
  ('72693', 'MIGUEL TORRES', 'C', 'N', 'Manipulador'),
  ('72694', 'ANA BELÉN RUIZ', 'A', 'V', 'Manipulador'),
  ('72695', 'PABLO HERRERO', 'B', 'N', 'Manipulador'),
  ('72696', 'MARTA LÓPEZ', 'C', 'V', 'Manipulador'),
  ('72697', 'DAVID SÁNCHEZ', 'A', 'N', 'Manipulador'),
  ('72698', 'ELENA MORENO', 'B', 'V', 'Manipulador'),
  ('72699', 'JORGE NAVARRO', 'C', 'N', 'Manipulador'),
  ('72700', 'SOFÍA DÍAZ', 'A', 'V', 'Manipulador'),
  ('72701', 'RAÚL FERNÁNDEZ', 'B', 'N', 'Manipulador'),
  ('72702', 'LUCÍA ROMERO', 'C', 'V', 'Manipulador'),
  ('72703', 'FERNANDO GIL', 'A', 'N', 'Manipulador'),
  ('72704', 'CARMEN VEGA', 'B', 'V', 'Manipulador'),
  ('72705', 'SERGIO MOLINA', 'C', 'N', 'Manipulador'),
  ('72706', 'ROSA JIMÉNEZ', 'A', 'V', 'Manipulador'),
  ('72707', 'ALBERTO CASTRO', 'B', 'N', 'Manipulador')
ON CONFLICT (id) DO UPDATE 
SET grupo_profesional = 'Manipulador'; -- Actualiza a 'Manipulador' si ya existen
