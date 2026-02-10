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

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const body = await req.json().catch(() => null);
  const chapa = normalizeChapa(body?.chapa);
  const code = String(body?.code ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");

  if (!isValidChapa(chapa)) return json(400, { success: false, error: "La chapa debe tener 5 digitos." });
  if (!/^[0-9]{6}$/.test(code)) return json(400, { success: false, error: "El codigo debe tener 6 digitos." });
  if (newPassword.length < 6) return json(400, { success: false, error: "La contrasena debe tener al menos 6 caracteres." });

  const { data: u, error: uErr } = await admin
    .from("usuarios")
    .select("id,recovery_code_hash")
    .eq("chapa", chapa)
    .maybeSingle();

  if (uErr) return json(500, { success: false, error: uErr.message });
  if (!u?.id) return json(404, { success: false, error: "No existe un usuario con esa chapa." });
  if (!u.recovery_code_hash) {
    return json(400, { success: false, error: "Ese usuario no tiene codigo de recuperacion configurado." });
  }

  const hash = await sha256Hex(code);
  if (hash !== u.recovery_code_hash) return json(401, { success: false, error: "Codigo incorrecto." });

  const { error: aErr } = await admin.auth.admin.updateUserById(u.id, { password: newPassword });
  if (aErr) return json(500, { success: false, error: aErr.message });

  return json(200, { success: true });
});

