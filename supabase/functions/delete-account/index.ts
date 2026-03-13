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

function getBearerToken(req: Request) {
  const authorization = req.headers.get('Authorization');

  if (!authorization) {
    throw new Error('Missing Authorization header');
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new Error("Authorization header must use the format 'Bearer <token>'");
  }

  return token;
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('delete-account: missing environment variables');
    return jsonResponse(500, {
      error: 'La funcion no esta configurada correctamente.',
    });
  }

  let token: string;

  try {
    token = getBearerToken(req);
  } catch (authError) {
    return jsonResponse(401, {
      error: 'No se pudo validar la sesion actual.',
      details: authError instanceof Error ? authError.message : 'Invalid authorization header',
    });
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: getUserError,
    } = await supabaseAuth.auth.getUser(token);

    if (getUserError || !user) {
      console.error('delete-account: invalid user token', getUserError);
      return jsonResponse(401, {
        error: 'No se pudo validar la sesion actual.',
        details: getUserError?.message ?? 'Invalid JWT',
      });
    }

    console.info(`delete-account: deleting user ${user.id}`);

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('delete-account: auth.admin.deleteUser failed', deleteUserError);
      return jsonResponse(500, {
        error: 'No se pudo borrar la cuenta.',
        details: deleteUserError.message,
      });
    }

    console.info(`delete-account: deleted user ${user.id}`);

    return jsonResponse(200, {
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('delete-account: unexpected failure', error);
    return jsonResponse(500, {
      error: 'Ha fallado el borrado de la cuenta.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
