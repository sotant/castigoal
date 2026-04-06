import { getEmailValidationError, isValidEmail, normalizeEmail } from '@/src/lib/email';

describe('email helpers', () => {
  test('normalizes surrounding whitespace', () => {
    expect(normalizeEmail('  disciplina@example.com  ')).toBe('disciplina@example.com');
  });

  test('accepts a valid email with tags and country TLD', () => {
    expect(isValidEmail('usuario+reto@example.es')).toBe(true);
  });

  test('rejects invalid local parts', () => {
    expect(isValidEmail('usuario..doble@example.com')).toBe(false);
  });

  test('returns a required validation message when email is missing', () => {
    expect(getEmailValidationError('', { required: true })).toBe('Introduce un email válido');
  });

  test('does not return an error when email is optional and empty', () => {
    expect(getEmailValidationError('')).toBeNull();
  });
});
