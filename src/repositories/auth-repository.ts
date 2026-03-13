import {
  AuthChangeEvent,
  AuthResponse,
  FunctionsHttpError,
  Session,
  Subscription,
} from '@supabase/supabase-js';

import { normalizeRepositoryError } from '@/src/lib/app-error';
import { supabase } from '@/src/lib/supabase';

type AuthStateChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo recuperar la sesion actual.',
      code: 'AUTH_GET_SESSION_FAILED',
      fallback: 'No se pudo recuperar la sesion actual.',
    });
  }

  return session;
}

export function subscribeToAuthChanges(callback: AuthStateChangeCallback): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return subscription;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  const response = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (response.error) {
    throw normalizeRepositoryError(response.error, {
      authMessage: 'No se pudo iniciar sesion.',
      code: 'AUTH_SIGN_IN_FAILED',
      fallback: 'No se pudo iniciar sesion.',
    });
  }

  return response;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResponse> {
  const response = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName?.trim() || undefined,
      },
    },
  });

  if (response.error) {
    throw normalizeRepositoryError(response.error, {
      authMessage: 'No se pudo crear la cuenta.',
      code: 'AUTH_SIGN_UP_FAILED',
      fallback: 'No se pudo crear la cuenta.',
    });
  }

  return response;
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo iniciar la recuperacion de contrasena.',
      code: 'AUTH_PASSWORD_RESET_REQUEST_FAILED',
      fallback: 'No se pudo iniciar la recuperacion de contrasena.',
    });
  }
}

export async function requestValidatedPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.functions.invoke('request-password-reset', {
    body: {
      email: email.trim(),
      redirectTo,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      const message =
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : error.message;

      throw normalizeRepositoryError(
        {
          message,
          status: error.context.status,
        },
        {
          authMessage: 'No se pudo iniciar la recuperacion de contrasena.',
          code: 'AUTH_PASSWORD_RESET_REQUEST_FAILED',
          fallback: 'No se pudo iniciar la recuperacion de contrasena.',
        },
      );
    }

    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo iniciar la recuperacion de contrasena.',
      code: 'AUTH_PASSWORD_RESET_REQUEST_FAILED',
      fallback: 'No se pudo iniciar la recuperacion de contrasena.',
    });
  }
}

export async function setRecoverySession(accessToken: string, refreshToken: string): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'El enlace de recuperacion no es valido o ha caducado.',
      code: 'AUTH_RECOVERY_SESSION_FAILED',
      fallback: 'No se pudo validar el enlace de recuperacion.',
    });
  }
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo actualizar la contrasena.',
      code: 'AUTH_PASSWORD_UPDATE_FAILED',
      fallback: 'No se pudo actualizar la contrasena.',
    });
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cerrar sesion.',
      code: 'AUTH_SIGN_OUT_FAILED',
      fallback: 'No se pudo cerrar sesion.',
    });
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw normalizeRepositoryError(sessionError ?? new Error('No active session'), {
      authMessage: 'Necesitas iniciar sesion para borrar tu cuenta.',
      code: 'AUTH_DELETE_ACCOUNT_FAILED',
      fallback: 'No se pudo borrar tu cuenta.',
    });
  }

  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      const message =
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : error.message;

      throw normalizeRepositoryError(
        {
          message,
          status: error.context.status,
        },
        {
          authMessage: 'Necesitas iniciar sesion para borrar tu cuenta.',
          code: 'AUTH_DELETE_ACCOUNT_FAILED',
          fallback: 'No se pudo borrar tu cuenta.',
        },
      );
    }

    throw normalizeRepositoryError(error, {
      authMessage: 'Necesitas iniciar sesion para borrar tu cuenta.',
      code: 'AUTH_DELETE_ACCOUNT_FAILED',
      fallback: 'No se pudo borrar tu cuenta.',
    });
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });

  if (signOutError) {
    throw normalizeRepositoryError(signOutError, {
      authMessage: 'Tu cuenta se borro, pero no se pudo limpiar la sesion local.',
      code: 'AUTH_DELETE_ACCOUNT_SIGN_OUT_FAILED',
      fallback: 'Tu cuenta se borro, pero no se pudo limpiar la sesion local.',
    });
  }
}
