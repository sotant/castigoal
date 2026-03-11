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
  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
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
