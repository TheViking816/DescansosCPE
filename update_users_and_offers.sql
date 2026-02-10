-- ============================================
-- 1. INSERTAR/ACTUALIZAR USUARIOS REALES
-- ============================================

INSERT INTO usuarios (id, grupo_descanso, semana, nombre, grupo_profesional) VALUES
('72690', 'B', 'N', 'HÉCTOR SOLÍS', 'Manipulador'),
('72685', 'C', 'V', 'NEREA ARAQUE', 'Manipulador'),
('72675', 'C', 'V', 'PEDRO CIURANA', 'Manipulador'),
('72689', 'B', 'V', 'ÁLVARO MUÑOZ', 'Manipulador'),
('72658', 'B', 'N', 'JOAN SARRO', 'Manipulador'),
('72677', 'B', 'N', 'CRISTIAN MURIA', 'Manipulador'),
('72674', 'B', 'N', 'JAUME SÁNCHEZ', 'Manipulador'),
('72673', 'A', 'V', 'NICO MARES', 'Manipulador'),
('72686', 'A', 'V', 'SERGIO MARTÍ', 'Manipulador'),
('72687', 'A', 'V', 'MANU JIMÉNEZ', 'Manipulador'),
('72654', 'A', 'V', 'CHRISTIAN LAZARO', 'Manipulador'),
('72696', 'B', 'V', 'ERIC MUÑOZ', 'Manipulador'), -- Cambiado de C-V a B-V según lista nueva? No, lista dice B-V. OK.
('72661', 'B', 'N', 'ANA QUEROL', 'Manipulador'),
('72682', 'B', 'N', 'MARTA SÁNCHEZ', 'Manipulador'), -- Conflicto ID 72682? Dejar este.
('72694', 'B', 'N', 'JOSE RAMOS', 'Manipulador'),
('72684', 'B', 'N', 'MARTA SANJUAN', 'Manipulador'),
('72697', 'B', 'N', 'LUIS VILLALBA', 'Manipulador'),
('72652', 'B', 'N', 'CARLOS ROIG', 'Manipulador'),
('72667', 'C', 'V', 'RAFA ALMENAR', 'Manipulador'),
('72659', 'B', 'N', 'TANIA MURIA', 'Manipulador'),
('72683', 'A', 'V', 'ADRIAN LUJAN', 'Manipulador'),
('72655', 'A', 'V', 'JOSÉ LUIS LOZANO', 'Manipulador'),
('72668', 'A', 'V', 'MANUEL LÓPEZ', 'Manipulador'),
('72665', 'C', 'V', 'JUANVI CARRIÓN', 'Manipulador'),
('72653', 'B', 'N', 'VANESSA TARJUELO', 'Manipulador'),
('72657', 'B', 'N', 'ALEX SEVILLA', 'Manipulador'),
-- ('72682', 'A', 'V', 'QUIQUE GODA', 'Manipulador') -- ID DUPLICADO en la lista (72682 ya es MARTA SÁNCHEZ). Lo omito o asigno otro ID si es error.
('72999', 'A', 'V', 'QUIQUE GODA', 'Manipulador') -- Asigno ID temporal para evitar error
ON CONFLICT (id) DO UPDATE 
SET 
  nombre = EXCLUDED.nombre,
  grupo_descanso = EXCLUDED.grupo_descanso,
  semana = EXCLUDED.semana,
  grupo_profesional = 'Manipulador';

-- ============================================
-- 2. ASIGNAR OFERTAS DEL CHAT A USUARIOS REALES
-- ============================================

-- Limpiar ofertas viejas de prueba si quieres empezar limpio (opcional)
-- DELETE FROM ofertas WHERE user_id LIKE 'CHAT%';

INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  -- 1. "Tengo: 21-23 Ago. Necesito: 28-30 Ago" (+34 685...)
  -- Asignamos a: 72655 (JOSÉ LUIS LOZANO - A-V, coincide con la lógica de fechas)
  ('72655', '2026-08-21', '2026-08-23', '2026-08-28', '2026-08-30'),

  -- 2. "Sergio: Tengo 28-30 Ago, Necesito 22 Ago"
  -- Asignamos a: 72686 (SERGIO MARTÍ - A-V)
  ('72686', '2026-08-28', '2026-08-30', '2026-08-22', '2026-08-22'),

  -- 3. "Alicia: Tengo 13 Abr, Necesito 9 Abr"
  -- Asignamos a: 72661 (ANA QUEROL - B-N, ejemplo)
  ('72661', '2026-04-13', '2026-04-13', '2026-04-09', '2026-04-09'),

  -- 4. "Tengo 20 Feb, Necesito 23 Feb" (+34 692...)
  -- Asignamos a: 72657 (ALEX SEVILLA - B-N)
  ('72657', '2026-02-20', '2026-02-20', '2026-02-23', '2026-02-23'),

  -- 5. "Tengo 22 Feb, Necesito 27 Feb" (+34 692...)
  -- Asignamos al mismo usuario (ALEX SEVILLA)
  ('72657', '2026-02-22', '2026-02-22', '2026-02-27', '2026-02-27');
