-- ============================================
-- LIMPIEZA Y CORRECCIÓN DE NOMBRES/OFERTAS
-- ============================================

-- 1. ELIMINAR LOS USUARIOS "CHAT" ANTIGUOS
-- Al borrar el usuario, se borran automáticamente sus ofertas por el ON DELETE CASCADE
DELETE FROM usuarios WHERE id IN ('CHAT01', 'CHAT02', 'CHAT03', 'CHAT04');

-- 2. ASEGURAR QUE LOS USUARIOS REALES EXISTEN (Actualizar datos si ya existen)
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
('72696', 'B', 'V', 'ERIC MUÑOZ', 'Manipulador'),
('72661', 'B', 'N', 'ANA QUEROL', 'Manipulador'),
('72682', 'B', 'N', 'MARTA SÁNCHEZ', 'Manipulador'),
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
('72999', 'A', 'V', 'QUIQUE GODA', 'Manipulador') -- ID temporal para Quique Goda por conflicto con 72682
ON CONFLICT (id) DO UPDATE 
SET nombre = EXCLUDED.nombre, grupo_descanso = EXCLUDED.grupo_descanso, semana = EXCLUDED.semana, grupo_profesional = 'Manipulador';

-- 3. RE-INSERTAR LAS OFERTAS ASIGNADAS A LOS USUARIOS REALES
-- (El ON CONFLICT DO NOTHING evita duplicados si ya ejecutaste el anterior sin limpiar)

-- Oferta 1: (Era CHAT01 "21-23 Ago") -> Asignada a 72655 (JOSÉ LUIS LOZANO)
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) 
SELECT '72655', '2026-08-21', '2026-08-23', '2026-08-28', '2026-08-30'
WHERE NOT EXISTS (
    SELECT 1 FROM ofertas WHERE user_id = '72655' AND tengo_desde = '2026-08-21' AND necesito_desde = '2026-08-28'
);

-- Oferta 2: (Era CHAT02 "Sergio") -> Asignada a 72686 (SERGIO MARTÍ)
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta)
SELECT '72686', '2026-08-28', '2026-08-30', '2026-08-22', '2026-08-22'
WHERE NOT EXISTS (
    SELECT 1 FROM ofertas WHERE user_id = '72686' AND tengo_desde = '2026-08-28'
);

-- Oferta 3: (Era CHAT03 "Alicia") -> Asignada a 72661 (ANA QUEROL - Ejemplo)
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta)
SELECT '72661', '2026-04-13', '2026-04-13', '2026-04-09', '2026-04-09'
WHERE NOT EXISTS (
    SELECT 1 FROM ofertas WHERE user_id = '72661' AND tengo_desde = '2026-04-13'
);

-- Oferta 4: (Era CHAT04 "20 feb") -> Asignada a 72657 (ALEX SEVILLA)
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta)
SELECT '72657', '2026-02-20', '2026-02-20', '2026-02-23', '2026-02-23'
WHERE NOT EXISTS (
    SELECT 1 FROM ofertas WHERE user_id = '72657' AND tengo_desde = '2026-02-20'
);

-- Oferta 5: (Era CHAT04 "22 feb") -> Asignada a 72657 (ALEX SEVILLA)
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta)
SELECT '72657', '2026-02-22', '2026-02-22', '2026-02-27', '2026-02-27'
WHERE NOT EXISTS (
    SELECT 1 FROM ofertas WHERE user_id = '72657' AND tengo_desde = '2026-02-22'
);
