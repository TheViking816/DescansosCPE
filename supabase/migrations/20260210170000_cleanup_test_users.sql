-- Clean up test users created during development.
-- This frees up chapas that were already registered and were blocking signup
-- with "Database error saving new user" (unique violation on public.usuarios.chapa).

DELETE FROM auth.users
WHERE
  email ILIKE '%@descansos-cpe.com'
  OR email ILIKE '%@descansos.invalid';

