export function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeText(value: string): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function uniqueDisplayValues(values: string[]): string[] {
  const unique = new Map<string, string>();
  values.forEach((value) => {
    const cleaned = cleanText(value);
    const normalized = normalizeText(cleaned);
    if (normalized && !unique.has(normalized)) unique.set(normalized, cleaned);
  });
  return [...unique.values()];
}
