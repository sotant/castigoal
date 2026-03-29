import { errorCopy } from '@/src/i18n/errors';

export type AppErrorKind = 'auth' | 'validation' | 'repository' | 'conflict' | 'unknown';

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly code: string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(options: {
    message: string;
    kind?: AppErrorKind;
    code?: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.kind = options.kind ?? 'unknown';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

type RepositoryErrorOptions = {
  authMessage?: string;
  code: string;
  fallback: string;
};

type ErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

function normalizeAuthMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return errorCopy.auth.invalidCredentials;
  }

  if (normalized.includes('user already registered')) {
    return errorCopy.auth.userAlreadyRegistered;
  }

  if (normalized.includes('email rate limit exceeded')) {
    return errorCopy.auth.rateLimit;
  }

  if (normalized.includes('password should be at least')) {
    return errorCopy.auth.passwordTooShort;
  }

  return message;
}

export function createAppError(message: string, code: string, kind: AppErrorKind = 'validation') {
  return new AppError({
    message,
    code,
    kind,
  });
}

export function normalizeRepositoryError(error: unknown, options: RepositoryErrorOptions): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isErrorLike(error)) {
    const rawMessage = error.message?.trim();
    const rawCode = error.code?.trim();

    if (rawCode === '23505') {
      return new AppError({
        message: errorCopy.repository.duplicateRecord,
        code: options.code,
        kind: 'conflict',
        cause: error,
      });
    }

    if (rawCode === '23503') {
      return new AppError({
        message: errorCopy.auth.relationInvalid,
        code: options.code,
        kind: 'validation',
        cause: error,
      });
    }

    if (rawMessage?.toLowerCase().includes('authenticated user is required') || rawMessage?.toLowerCase().includes('no hay una sesion activa')) {
      return new AppError({
        message: options.authMessage ?? errorCopy.auth.needSession,
        code: options.code,
        kind: 'auth',
        cause: error,
      });
    }

    return new AppError({
      message: rawMessage ? normalizeAuthMessage(rawMessage) : options.fallback,
      code: options.code,
      kind: 'repository',
      retryable: (error.status ?? 0) >= 500,
      cause: error,
    });
  }

  return new AppError({
    message: options.fallback,
    code: options.code,
    kind: 'unknown',
    cause: error,
  });
}

export function getErrorMessage(error: unknown, fallback: string = errorCopy.fallback.unexpected): string {
  if (error instanceof AppError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}
