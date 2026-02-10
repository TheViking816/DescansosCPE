-- Add optional recovery code hash to allow password resets without email/phone.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS recovery_code_hash text;

-- Basic format check (64 hex chars) but keep NULL allowed.
DO $$
BEGIN
  ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_recovery_code_hash_format
    CHECK (recovery_code_hash IS NULL OR recovery_code_hash ~ '^[0-9a-f]{64}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

