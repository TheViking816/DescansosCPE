import { createClient } from '@supabase/supabase-js';
import { loadDotenvFiles } from './load-dotenv.mjs';

loadDotenvFiles(['.env.local', '.env']);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[key] = val;
    if (val !== 'true') i += 1;
  }
  return out;
}

function normalizeChapa(input) {
  return String(input ?? '')
    .trim()
    .replace(/\D+/g, '')
    .slice(0, 5);
}

function isValidChapa(chapa) {
  return /^\d{5}$/.test(chapa);
}

function authPhoneFromChapa(chapa) {
  const c = normalizeChapa(chapa);
  if (!isValidChapa(c)) throw new Error('Chapa invalida (debe ser 5 digitos).');
  return `+34${`6000${c}`}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chapa = normalizeChapa(args.chapa);
  const password = String(args.password ?? 'Test1234!');
  const nombre = String(args.nombre ?? 'USUARIO TEST');
  const telefono = args.telefono ? String(args.telefono) : '';
  const grupo = String(args.grupo ?? 'A');
  const semana = String(args.semana ?? 'V');
  const especialidad = String(args.especialidad ?? '03');

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing env: VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (set it locally, do not commit it)');
  }

  if (!isValidChapa(chapa)) throw new Error('--chapa must be 5 digits');

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const phone = authPhoneFromChapa(chapa);

  const metadata = {
    nombre,
    chapa,
    telefono,
    grupo_descanso: grupo,
    semana,
    especialidad_codigo: especialidad,
  };

  // Create user (or update if already exists)
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: metadata,
  });

  if (cErr) {
    if (String(cErr.message || '').toLowerCase().includes('already registered')) {
      const { data: list, error: lErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (lErr) throw lErr;
      const u = (list.users || []).find((x) => (x.phone || '').trim() === phone);
      if (!u) throw cErr;
      const { error: uErr } = await supabase.auth.admin.updateUserById(u.id, {
        password,
        user_metadata: metadata,
      });
      if (uErr) throw uErr;
      console.log(`Updated user for chapa ${chapa} (phone ${phone})`);
      return;
    }
    throw cErr;
  }

  // Trigger should have created profile. Ensure it exists.
  const userId = created?.user?.id;
  if (userId) {
    const { data: profile, error: pErr } = await supabase.from('usuarios').select('id').eq('id', userId).maybeSingle();
    if (pErr) throw pErr;
    if (!profile) {
      const { error: iErr } = await supabase.from('usuarios').insert([
        {
          id: userId,
          chapa,
          nombre,
          telefono: telefono || null,
          grupo_descanso: grupo,
          semana,
          especialidad_codigo: especialidad,
        },
      ]);
      if (iErr) throw iErr;
    }
  }

  console.log(`Created user for chapa ${chapa} (phone ${phone})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

