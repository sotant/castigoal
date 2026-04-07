import {
  findCanonicalBasePunishment,
  getPunishmentCategoryName,
  getPunishmentCategoryOption,
  normalizePunishmentCategoryId,
  normalizePunishmentTextForComparison,
  resolveLegacyPunishmentCategoryId,
} from '@/src/constants/punishments';

describe('punishment helpers', () => {
  test('normalizes punishment text for comparison', () => {
    expect(normalizePunishmentTextForComparison('  Sesi\u00f3n   de movilidad 40 min  ')).toBe(
      'sesion de movilidad 40 min',
    );
  });

  test('resolves legacy numeric category ids', () => {
    expect(normalizePunishmentCategoryId(3)).toBe('fisico');
  });

  test('preserves uuid category ids and lowercases them', () => {
    expect(normalizePunishmentCategoryId('ECDF8A9C-B6CE-4AF1-B6A6-694BC712F8F0')).toBe(
      'ecdf8a9c-b6ce-4af1-b6a6-694bc712f8f0',
    );
  });

  test('prioritizes title-based category resolution for legacy records', () => {
    expect(resolveLegacyPunishmentCategoryId('Leer 20 paginas', 'hogar', 'hogar')).toBe('estudio');
  });

  test('returns the default category option for unknown values', () => {
    expect(getPunishmentCategoryOption('unknown').name).toBe('tarea');
    expect(getPunishmentCategoryName('unknown')).toBe('tarea');
  });

  test('finds canonical base punishments ignoring accents in the title', () => {
    expect(findCanonicalBasePunishment('Leer 20 paginas', 'estudio', 1)?.id).toBe('punish-read');
  });
});
