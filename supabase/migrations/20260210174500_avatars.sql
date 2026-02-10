-- Avatar support: user profile column + Storage bucket/policies

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create a public bucket for avatars (id = name = avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies for storage.objects (RLS is enabled by default on storage schema)
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (name LIKE (auth.uid()::text || '/%'))
);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (name LIKE (auth.uid()::text || '/%'))
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (name LIKE (auth.uid()::text || '/%'))
);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (name LIKE (auth.uid()::text || '/%'))
);

