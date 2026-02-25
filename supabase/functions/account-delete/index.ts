import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { success: false, error: "Faltan variables de entorno de Supabase en la Edge Function." });
  }

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

  // Best effort cleanup of avatar files. Account deletion below will remove profile/offers via CASCADE.
  try {
    const prefix = `${uid}/`;
    const { data: objects } = await admin.storage.from("avatars").list(prefix, { limit: 100 });
    const paths = (objects ?? []).filter((o) => o?.name).map((o) => `${prefix}${o.name}`);
    if (paths.length) {
      await admin.storage.from("avatars").remove(paths);
    }
  } catch {
    // Do not block account deletion if avatar cleanup fails.
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(uid);
  if (deleteErr) {
    return json(500, { success: false, error: `No se pudo eliminar la cuenta: ${deleteErr.message}` });
  }

  return json(200, { success: true });
});
