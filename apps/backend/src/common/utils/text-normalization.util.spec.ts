import { cleanText, normalizeText } from './text-normalization.util';

describe('text normalization', () => {
  it('normalizes accents, casing, repeated whitespace and Unicode forms', () => {
    expect(normalizeText('  INGENIERI\u0301A   de  Sistemas ')).toBe(
      'ingenieria de sistemas',
    );
    expect(normalizeText('Ingeniería')).toBe(normalizeText('ingenieria'));
  });

  it('keeps the cleaned display value separate from comparisons', () => {
    expect(cleanText('  Ingeniería   de Sistemas ')).toBe(
      'Ingeniería de Sistemas',
    );
  });
});
