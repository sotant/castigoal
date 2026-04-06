import { AppError, createAppError, getErrorMessage, normalizeRepositoryError } from '@/src/lib/app-error';

describe('app error helpers', () => {
  test('creates typed app errors', () => {
    const error = createAppError('Configuracion invalida', 'INVALID_CONFIG');

    expect(error).toBeInstanceOf(AppError);
    expect(error.kind).toBe('validation');
    expect(error.code).toBe('INVALID_CONFIG');
  });

  test('normalizes duplicate key errors as conflicts', () => {
    const error = normalizeRepositoryError(
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
      {
        code: 'GOAL_CREATE_FAILED',
        fallback: 'No se pudo crear el objetivo.',
      },
    );

    expect(error.kind).toBe('conflict');
    expect(error.message).toBe('Ya existe un registro con esos datos.');
  });

  test('normalizes foreign key errors as validation errors', () => {
    const error = normalizeRepositoryError(
      {
        code: '23503',
        message: 'foreign key violation',
      },
      {
        code: 'GOAL_CREATE_FAILED',
        fallback: 'No se pudo crear el objetivo.',
      },
    );

    expect(error.kind).toBe('validation');
    expect(error.message).toBe('La relacion entre los datos no es valida.');
  });

  test('normalizes auth-required repository errors', () => {
    const error = normalizeRepositoryError(
      {
        message: 'Authenticated user is required',
      },
      {
        authMessage: 'Necesitas iniciar sesi\u00f3n para continuar.',
        code: 'AUTH_REQUIRED',
        fallback: 'No se pudo continuar.',
      },
    );

    expect(error.kind).toBe('auth');
    expect(error.message).toBe('Necesitas iniciar sesi\u00f3n para continuar.');
  });

  test('translates known auth messages and marks server errors as retryable', () => {
    const error = normalizeRepositoryError(
      {
        message: 'Invalid login credentials',
        status: 503,
      },
      {
        code: 'AUTH_SIGN_IN_FAILED',
        fallback: 'No se pudo iniciar sesi\u00f3n.',
      },
    );

    expect(error.kind).toBe('repository');
    expect(error.message).toBe('El email o la contrase\u00f1a no son correctos.');
    expect(error.retryable).toBe(true);
  });

  test('returns the fallback message for unknown values', () => {
    expect(getErrorMessage({})).toBe('Ha ocurrido un error inesperado.');
  });
});
