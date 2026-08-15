export function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeText(value: string): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

export function normalizedSql(column: string): string {
  return `unaccent(lower(regexp_replace(trim(${column}), '\\s+', ' ', 'g')))`;
}
