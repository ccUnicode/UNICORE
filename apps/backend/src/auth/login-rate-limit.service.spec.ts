import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginRateLimitService } from './login-rate-limit.service';

describe('LoginRateLimitService', () => {
  const values: Record<string, string> = {
    AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: '60',
    AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP: '3',
    AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_ACCOUNT: '2',
    AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT: '3',
    AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_IP: '2',
    AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_ACCOUNT: '1',
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const expectRateLimited = (attempt: () => unknown): void => {
    try {
      attempt();
      throw new Error('Expected login attempt to be rate limited');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  };

  it('limits repeated attempts for the same account across IP addresses', () => {
    const service = new LoginRateLimitService(config);

    service.beginAttempt('10.0.0.1', '20260001').release();
    service.beginAttempt('10.0.0.2', '20260001').release();

    expectRateLimited(() => service.beginAttempt('10.0.0.3', '20260001'));
  });

  it('limits repeated attempts from the same IP address', () => {
    const service = new LoginRateLimitService(config);

    service.beginAttempt('10.0.0.1', '20260001').release();
    service.beginAttempt('10.0.0.1', '20260002').release();
    service.beginAttempt('10.0.0.1', '20260003').release();

    expectRateLimited(() => service.beginAttempt('10.0.0.1', '20260004'));
  });

  it('limits concurrent scrypt work for the same account', () => {
    const service = new LoginRateLimitService(config);
    const firstAttempt = service.beginAttempt('10.0.0.1', '20260001');

    expectRateLimited(() => service.beginAttempt('10.0.0.2', '20260001'));

    firstAttempt.release();
    expect(() =>
      service.beginAttempt('10.0.0.2', '20260001').release(),
    ).not.toThrow();
  });

  it('releases concurrency capacity idempotently', () => {
    const service = new LoginRateLimitService(config);
    const firstAttempt = service.beginAttempt('10.0.0.1', '20260001');

    firstAttempt.release();
    firstAttempt.release();

    expect(() =>
      service.beginAttempt('10.0.0.2', '20260002').release(),
    ).not.toThrow();
  });
});
