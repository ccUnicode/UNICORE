import { QueryFailedError } from 'typeorm';

type DatabaseErrorWithCode = {
  code: string;
};

export function isUniqueViolation(error: unknown): boolean {
  const databaseError =
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError
      ? (error.driverError as DatabaseErrorWithCode)
      : null;

  return databaseError?.code === '23505';
}
