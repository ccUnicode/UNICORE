import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RateLimitBucket = {
  attempts: number;
  resetAt: number;
};

export type LoginAttemptLease = {
  release: () => void;
};

@Injectable()
export class LoginRateLimitService {
  private readonly windowMs: number;
  private readonly maxAttemptsPerIp: number;
  private readonly maxAttemptsPerAccount: number;
  private readonly maxConcurrentTotal: number;
  private readonly maxConcurrentPerIp: number;
  private readonly maxConcurrentPerAccount: number;
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly activeByKey = new Map<string, number>();
  private activeTotal = 0;

  constructor(config: ConfigService) {
    this.windowMs =
      this.readPositiveInteger(
        config,
        'AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS',
        60,
      ) * 1000;
    this.maxAttemptsPerIp = this.readPositiveInteger(
      config,
      'AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP',
      20,
    );
    this.maxAttemptsPerAccount = this.readPositiveInteger(
      config,
      'AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_ACCOUNT',
      5,
    );
    this.maxConcurrentTotal = this.readPositiveInteger(
      config,
      'AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT',
      16,
    );
    this.maxConcurrentPerIp = this.readPositiveInteger(
      config,
      'AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_IP',
      4,
    );
    this.maxConcurrentPerAccount = this.readPositiveInteger(
      config,
      'AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_ACCOUNT',
      2,
    );
  }

  beginAttempt(clientIp: string, studentCode: string): LoginAttemptLease {
    const ipKey = `ip:${clientIp.trim() || 'unknown'}`;
    const accountKey = `account:${studentCode.trim().toUpperCase()}`;
    const now = Date.now();

    this.pruneExpiredBuckets(now);
    this.assertConcurrencyAvailable(ipKey, accountKey);
    this.consumeAttempt(ipKey, this.maxAttemptsPerIp, now);
    this.consumeAttempt(accountKey, this.maxAttemptsPerAccount, now);

    this.activeTotal += 1;
    this.incrementActive(ipKey);
    this.incrementActive(accountKey);

    let released = false;
    return {
      release: () => {
        if (released) {
          return;
        }

        released = true;
        this.activeTotal -= 1;
        this.decrementActive(ipKey);
        this.decrementActive(accountKey);
      },
    };
  }

  private consumeAttempt(key: string, limit: number, now: number): void {
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        attempts: 1,
        resetAt: now + this.windowMs,
      });
      return;
    }

    if (current.attempts >= limit) {
      this.rejectAttempt();
    }

    current.attempts += 1;
  }

  private assertConcurrencyAvailable(ipKey: string, accountKey: string): void {
    if (
      this.activeTotal >= this.maxConcurrentTotal ||
      (this.activeByKey.get(ipKey) ?? 0) >= this.maxConcurrentPerIp ||
      (this.activeByKey.get(accountKey) ?? 0) >= this.maxConcurrentPerAccount
    ) {
      this.rejectAttempt();
    }
  }

  private incrementActive(key: string): void {
    this.activeByKey.set(key, (this.activeByKey.get(key) ?? 0) + 1);
  }

  private decrementActive(key: string): void {
    const remaining = (this.activeByKey.get(key) ?? 1) - 1;

    if (remaining <= 0) {
      this.activeByKey.delete(key);
      return;
    }

    this.activeByKey.set(key, remaining);
  }

  private pruneExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private rejectAttempt(): never {
    throw new HttpException(
      'Too many login attempts. Try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private readPositiveInteger(
    config: ConfigService,
    key: string,
    fallback: number,
  ): number {
    const configured = config.get<string>(key);
    const value = configured === undefined ? fallback : Number(configured);

    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(`${key} must be a positive integer`);
    }

    return value;
  }
}
