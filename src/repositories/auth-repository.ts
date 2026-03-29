import {
  AuthChangeEvent,
  AuthResponse,
  FunctionsHttpError,
  Session,
  Subscription,
} from '@supabase/supabase-js';

import { authCopy } from '@/src/i18n/auth';
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
      authMessage: authCopy.repository.getSessionFailed,
      code: 'AUTH_GET_SESSION_FAILED',
      fallback: authCopy.repository.getSessionFailed,
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
      authMessage: authCopy.repository.signInFailed,
      code: 'AUTH_SIGN_IN_FAILED',
      fallback: authCopy.repository.signInFailed,
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
      authMessage: authCopy.repository.signUpFailed,
      code: 'AUTH_SIGN_UP_FAILED',
      fallback: authCopy.repository.signUpFailed,
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
      authMessage: authCopy.repository.passwordRecoveryRequestFailed,
      code: 'AUTH_PASSWORD_RESET_REQUEST_FAILED',
      fallback: authCopy.repository.passwordRecoveryRequestFailed,
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
      authMessage: authCopy.repository.passwordRecoveryInvalid,
      code: 'AUTH_RECOVERY_SESSION_FAILED',
      fallback: authCopy.repository.setRecoverySessionFailed,
    });
  }
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: authCopy.repository.passwordUpdateFailed,
      code: 'AUTH_PASSWORD_UPDATE_FAILED',
      fallback: authCopy.repository.passwordUpdateFailed,
    });
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: authCopy.repository.signOutFailed,
      code: 'AUTH_SIGN_OUT_FAILED',
      fallback: authCopy.repository.signOutFailed,
    });
  }
}

export async function signOutLocal(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: authCopy.repository.signOutLocalFailed,
      code: 'AUTH_SIGN_OUT_LOCAL_FAILED',
      fallback: authCopy.repository.signOutLocalFailed,
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
      authMessage: authCopy.repository.deleteAccountAuthRequired,
      code: 'AUTH_DELETE_ACCOUNT_FAILED',
      fallback: authCopy.repository.deleteAccountFailed,
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
          authMessage: authCopy.repository.deleteAccountAuthRequired,
          code: 'AUTH_DELETE_ACCOUNT_FAILED',
          fallback: authCopy.repository.deleteAccountFailed,
        },
      );
    }

    throw normalizeRepositoryError(error, {
      authMessage: authCopy.repository.deleteAccountAuthRequired,
      code: 'AUTH_DELETE_ACCOUNT_FAILED',
      fallback: authCopy.repository.deleteAccountFailed,
    });
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });

  if (signOutError) {
    throw normalizeRepositoryError(signOutError, {
      authMessage: authCopy.repository.deleteAccountSignOutFailed,
      code: 'AUTH_DELETE_ACCOUNT_SIGN_OUT_FAILED',
      fallback: authCopy.repository.deleteAccountSignOutFailed,
    });
  }
}
