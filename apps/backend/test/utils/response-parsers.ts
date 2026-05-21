export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseResponse = <T>(
  body: unknown,
  isExpectedResponse: (value: unknown) => value is T,
  errorMessage: string,
): T => {
  if (!isExpectedResponse(body)) {
    throw new Error(errorMessage);
  }

  return body;
};

export const parseResponseList = <T>(
  body: unknown,
  isExpectedResponse: (value: unknown) => value is T,
  errorMessage: string,
): T[] => {
  if (!Array.isArray(body) || !body.every(isExpectedResponse)) {
    throw new Error(errorMessage);
  }

  return body;
};

export const hasNumberProperty = (
  value: Record<string, unknown>,
  property: string,
): boolean => typeof value[property] === 'number';

export const hasStringProperty = (
  value: Record<string, unknown>,
  property: string,
): boolean => typeof value[property] === 'string';

export const hasOptionalStringProperty = (
  value: Record<string, unknown>,
  property: string,
): boolean =>
  value[property] === undefined ||
  value[property] === null ||
  typeof value[property] === 'string';

export const hasOptionalBooleanProperty = (
  value: Record<string, unknown>,
  property: string,
): boolean =>
  value[property] === undefined || typeof value[property] === 'boolean';
