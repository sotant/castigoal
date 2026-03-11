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

  const authorization = req.headers.get('Authorization');

  if (!authorization) {
    return jsonResponse(401, {
      error: 'Falta la cabecera de autorizacion.',
    });
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    },
  );

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const token = authorization.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse(401, {
      error: 'No se pudo validar la sesion actual.',
    });
  }

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return jsonResponse(500, {
      error: 'No se pudo borrar la cuenta en Supabase.',
      details: deleteUserError.message,
    });
  }

  return jsonResponse(200, {
    success: true,
  });
});
