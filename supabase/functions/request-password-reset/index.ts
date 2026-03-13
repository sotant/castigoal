import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Metodo no permitido.',
    });
  }

  const { email, redirectTo } = await req.json().catch(() => ({ email: '', redirectTo: '' }));

  if (typeof email !== 'string' || typeof redirectTo !== 'string' || !isValidEmail(email) || !redirectTo.trim()) {
    return jsonResponse(400, {
      error: 'Debes indicar un email valido.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const supabasePublic = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  let page = 1;
  const perPage = 1000;
  let userExists = false;

  while (!userExists) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return jsonResponse(500, {
        error: 'No se pudo validar el email.',
        details: error.message,
      });
    }

    const users = data.users ?? [];
    userExists = users.some((user) => user.email?.toLowerCase() === normalizedEmail);

    if (userExists || users.length < perPage) {
      break;
    }

    page += 1;
  }

  if (!userExists) {
    return jsonResponse(404, {
      error: 'No existe ninguna cuenta con ese email.',
    });
  }

  const { error: resetError } = await supabasePublic.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: redirectTo.trim(),
  });

  if (resetError) {
    return jsonResponse(500, {
      error: 'No se pudo enviar el email de recuperacion.',
      details: resetError.message,
    });
  }

  return jsonResponse(200, {
    success: true,
  });
});
