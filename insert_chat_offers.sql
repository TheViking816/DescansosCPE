-- ============================================
-- INSERTAR OFERTAS DEL CHAT
-- ============================================

-- IMPORTANTE:
-- Asumimos que el año es 2026.
-- Generamos IDs temporales para usuarios nuevos si no existen.

-- 1. INSERTAR USUARIOS (con teléfonos reales del chat)
INSERT INTO usuarios (id, nombre, grupo_descanso, semana, grupo_profesional, telefono) VALUES
  ('CHAT01', 'Usuario Chat 1 (+34 685...)', 'A', 'V', 'Manipulador', '34685136941'),
  ('CHAT02', 'Sergio (+34 686...)', 'B', 'N', 'Manipulador', '34686005668'),
  ('CHAT03', 'Alicia Omar', 'C', 'V', 'Manipulador', NULL),
  ('CHAT04', 'Usuario Chat 4 (+34 692...)', 'A', 'N', 'Manipulador', '34692628543')
ON CONFLICT (id) DO NOTHING;

-- 2. INSERTAR OFERTAS

-- Chat 1 (+34 685...): Tengo 21-23 Ago, Necesito 28-30 Ago
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  ('CHAT01', '2026-08-21', '2026-08-23', '2026-08-28', '2026-08-30');

-- Chat 2 (Sergio): Tengo 28-30 Ago, Necesito 22 Ago (solo un día)
-- Asumimos rango 22-22
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  ('CHAT02', '2026-08-28', '2026-08-30', '2026-08-22', '2026-08-22');

-- Chat 3 (Alicia): Tengo 13 de abril, Necesito 9 de abril
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  ('CHAT03', '2026-04-13', '2026-04-13', '2026-04-09', '2026-04-09');

-- Chat 4 (+34 692...): 
-- Oferta 1: Tengo Vie 20 Feb, Necesito Lun 23 Feb
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  ('CHAT04', '2026-02-20', '2026-02-20', '2026-02-23', '2026-02-23');

-- Oferta 2: Tengo Dom 22 Feb, Necesito Vie 27 Feb
INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  ('CHAT04', '2026-02-22', '2026-02-22', '2026-02-27', '2026-02-27');
