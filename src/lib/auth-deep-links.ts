import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { authCopy } from '@/src/i18n/auth';
import { appRoutes } from '@/src/navigation/app-routes';

const FALLBACK_APP_SCHEME = 'castigoal';

type PasswordRecoveryLinkResult =
  | {
      kind: 'error';
      message: string;
    }
  | {
      kind: 'success';
      accessToken: string;
      refreshToken: string;
    };

function getAppScheme() {
  return Constants.expoConfig?.scheme ?? FALLBACK_APP_SCHEME;
}

function getUrlParams(url: string) {
  const fragment = url.includes('#') ? url.split('#')[1] ?? '' : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';

  return new URLSearchParams([query, fragment].filter(Boolean).join('&'));
}

function getRecoveryErrorMessage(params: URLSearchParams) {
  const errorDescription = params.get('error_description');
  const errorCode = params.get('error_code');
  const rawError = `${errorCode ?? ''} ${errorDescription ?? params.get('error') ?? ''}`.trim().toLowerCase();

  if (!rawError) {
    return `${authCopy.repository.passwordRecoveryInvalid}. Solicita uno nuevo.`;
  }

  if (rawError.includes('expired') || rawError.includes('otp_expired')) {
    return authCopy.repository.passwordRecoveryExpired;
  }

  if (rawError.includes('access denied') || rawError.includes('access_denied')) {
    return authCopy.repository.passwordRecoveryAccessDenied;
  }

  return `${authCopy.repository.passwordRecoveryInvalid}. Solicita uno nuevo.`;
}

export function buildPasswordRecoveryRedirectUrl() {
  if (Platform.OS === 'web') {
    return Linking.createURL(appRoutes.resetPassword);
  }

  const scheme = getAppScheme();
  const path = appRoutes.resetPassword.replace(/^\//, '');

  return `${scheme}://${path}`;
}

export function parsePasswordRecoveryLink(url: string | null): PasswordRecoveryLinkResult | null {
  if (!url) {
    return null;
  }

  const params = getUrlParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (params.get('error') || params.get('error_code') || params.get('error_description')) {
    return {
      kind: 'error',
      message: getRecoveryErrorMessage(params),
    };
  }

  if (!accessToken || !refreshToken || type !== 'recovery') {
    return null;
  }

  return {
    kind: 'success',
    accessToken,
    refreshToken,
  };
}
