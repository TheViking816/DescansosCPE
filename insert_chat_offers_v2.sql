-- ============================================
-- INSERTAR OFERTAS DEL CHAT (V2)
-- ============================================

-- IMPORTANTE:
-- Los usuarios CHAT01, CHAT02, etc. ya existen en tu base de datos (según tu dump).
-- Solo insertamos las ofertas asociadas.

INSERT INTO ofertas (user_id, tengo_desde, tengo_hasta, necesito_desde, necesito_hasta) VALUES
  -- 1. Usuario Chat 1 (+34 685...) -> CHAT01
  -- "Tengo: 21-22-23 de agosto. Necesito: 28-29-30 de agosto"
  ('CHAT01', '2026-08-21', '2026-08-23', '2026-08-28', '2026-08-30'),

  -- 2. Sergio (+34 686...) -> CHAT02
  -- "yo tengo el 28-29-30 y quiero el 22" (asumimos Agosto por contexto)
  ('CHAT02', '2026-08-28', '2026-08-30', '2026-08-22', '2026-08-22'),

  -- 3. Alicia Omar -> CHAT03
  -- "Tengo lunes 13 de abril y busco cambiar por el día 9 de abril"
  ('CHAT03', '2026-04-13', '2026-04-13', '2026-04-09', '2026-04-09'),

  -- 4. Usuario Chat 4 (+34 692...) -> CHAT04
  -- "Doy viernes 20 de febrero por lunes 23"
  ('CHAT04', '2026-02-20', '2026-02-20', '2026-02-23', '2026-02-23'),

  -- 5. Usuario Chat 4 (+34 692...) -> CHAT04
  -- "Doy domingo 22 de febrero por viernes 27"
  ('CHAT04', '2026-02-22', '2026-02-22', '2026-02-27', '2026-02-27');
