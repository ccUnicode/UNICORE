import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AUTH_JWT_SECRET') {
        return 'test-secret-that-is-at-least-32-characters-long';
      }

      if (key === 'AUTH_JWT_EXPIRES_IN_SECONDS') {
        return '3600';
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  it('signs and verifies a member token', () => {
    const service = new AuthTokenService(config);

    expect(service.verify(service.sign(42))).toEqual(
      expect.objectContaining({ sub: 42 }),
    );
  });

  it('rejects a tampered token', () => {
    const service = new AuthTokenService(config);
    const token = service.sign(42);
    const [header, payload] = token.split('.');

    expect(() => service.verify(`${header}.${payload}.invalid`)).toThrow(
      UnauthorizedException,
    );
  });

  it('requires a strong signing secret', () => {
    const weakConfig = {
      get: jest.fn((key: string) =>
        key === 'AUTH_JWT_SECRET' ? 'short' : undefined,
      ),
    } as unknown as ConfigService;

    expect(() => new AuthTokenService(weakConfig)).toThrow(
      'AUTH_JWT_SECRET must contain at least 32 characters',
    );
  });
});
