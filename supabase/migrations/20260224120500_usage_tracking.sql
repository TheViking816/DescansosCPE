-- ============================================
-- Tracking de uso (actividad basica por usuario)
-- ============================================
-- Guarda una fila por chapa con:
-- - ultima_actualizacion (heartbeat / ultima navegacion)
-- - seccion (ruta actual)
--
-- Nota: se excluye explicitamente la chapa 72683 para no contaminar metricas.

CREATE TABLE IF NOT EXISTS public.uso_app (
  chapa text PRIMARY KEY CHECK (chapa ~ '^[0-9]{5}$'),
  ultima_actualizacion timestamptz NOT NULL DEFAULT now(),
  seccion text,
  CONSTRAINT uso_app_chapa_fk FOREIGN KEY (chapa) REFERENCES public.usuarios(chapa) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_uso_app_ultima_actualizacion ON public.uso_app(ultima_actualizacion DESC);

ALTER TABLE public.uso_app ENABLE ROW LEVEL SECURITY;

-- Lectura para panel admin frontend (usa anon key).
-- Si en el futuro montas backend propio, mejor quitar esta policy y leer con service role.
DROP POLICY IF EXISTS uso_app_select_admin_panel ON public.uso_app;
CREATE POLICY uso_app_select_admin_panel
ON public.uso_app
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS uso_app_insert_self ON public.uso_app;
CREATE POLICY uso_app_insert_self
ON public.uso_app
FOR INSERT
TO authenticated
WITH CHECK (
  chapa <> '72683'
  AND EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.chapa = uso_app.chapa
  )
);

DROP POLICY IF EXISTS uso_app_update_self ON public.uso_app;
CREATE POLICY uso_app_update_self
ON public.uso_app
FOR UPDATE
TO authenticated
USING (
  chapa <> '72683'
  AND EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.chapa = uso_app.chapa
  )
)
WITH CHECK (
  chapa <> '72683'
  AND EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.chapa = uso_app.chapa
  )
);
