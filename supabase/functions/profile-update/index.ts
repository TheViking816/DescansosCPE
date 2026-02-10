import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeChapa(input: unknown) {
  return String(input ?? "")
    .trim()
    .replace(/\D+/g, "")
    .slice(0, 5);
}

function isValidChapa(chapa: string) {
  return /^\d{5}$/.test(chapa);
}

function authEmailFromChapa(chapa: string) {
  const c = normalizeChapa(chapa);
  if (!isValidChapa(c)) throw new Error("Invalid chapa");
  return `${c}@descansos-cpe.com`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) return json(401, { success: false, error: "Missing auth" });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authed = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await authed.auth.getUser();
  if (userErr || !userData?.user) return json(401, { success: false, error: "Invalid auth" });
  const uid = userData.user.id;

  const body = await req.json().catch(() => null);
  const patch = body?.patch ?? null;
  if (!patch || typeof patch !== "object") return json(400, { success: false, error: "Missing patch" });

  const next: Record<string, unknown> = {};

  if (patch.nombre !== undefined) next.nombre = String(patch.nombre ?? "").trim();
  if (patch.telefono !== undefined) {
    const t = String(patch.telefono ?? "").trim();
    next.telefono = t ? t : null;
  }
  if (patch.grupo_descanso !== undefined) next.grupo_descanso = String(patch.grupo_descanso ?? "").trim();
  if (patch.semana !== undefined) next.semana = String(patch.semana ?? "").trim();
  if (patch.especialidad_codigo !== undefined) next.especialidad_codigo = String(patch.especialidad_codigo ?? "").trim();

  let chapaChangedTo: string | null = null;
  if (patch.chapa !== undefined) {
    const c = normalizeChapa(patch.chapa);
    if (!isValidChapa(c)) return json(400, { success: false, error: "La chapa debe tener 5 digitos." });
    next.chapa = c;
    chapaChangedTo = c;
  }

  // Update profile row first (enforces FK/checks). Unique violation is surfaced clearly.
  const { error: upErr } = await admin.from("usuarios").update(next).eq("id", uid);
  if (upErr) {
    const msg = String(upErr.message || "");
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
      return json(409, { success: false, error: "Esa chapa ya existe." });
    }
    return json(500, { success: false, error: msg });
  }

  // If chapa changed, update the auth email to keep chapa+password login working.
  if (chapaChangedTo) {
    const newEmail = authEmailFromChapa(chapaChangedTo);
    const { error: aErr } = await admin.auth.admin.updateUserById(uid, { email: newEmail, email_confirm: true });
    if (aErr) return json(500, { success: false, error: `Auth update failed: ${aErr.message}` });
  }

  return json(200, { success: true });
});

