-- Make `usuarios.telefono` optional (WhatsApp contact) and store NULL instead of empty string.

ALTER TABLE public.usuarios
  ALTER COLUMN telefono DROP NOT NULL;

UPDATE public.usuarios
SET telefono = NULL
WHERE telefono IS NOT NULL AND btrim(telefono) = '';

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
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'telefono', ''), ''),
    COALESCE(NEW.raw_user_meta_data->>'grupo_descanso', 'A'),
    COALESCE(NEW.raw_user_meta_data->>'semana', 'V'),
    COALESCE(NEW.raw_user_meta_data->>'especialidad_codigo', '01')
  );

  RETURN NEW;
END;
$$;

