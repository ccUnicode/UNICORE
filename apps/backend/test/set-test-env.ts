const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required to run backend E2E tests');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.AUTH_JWT_SECRET ??= 'e2e-jwt-secret-that-is-at-least-32-characters';
process.env.AUTH_BOOTSTRAP_SECRET ??=
  'e2e-bootstrap-secret-that-is-at-least-32-characters';
