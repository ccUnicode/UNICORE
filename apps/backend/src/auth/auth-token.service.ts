import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthTokenPayload } from './interfaces/auth-token-payload.interface';

const TOKEN_HEADER = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

@Injectable()
export class AuthTokenService {
  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('AUTH_JWT_SECRET') ?? '';
    this.expiresInSeconds = Number(
      config.get<string>('AUTH_JWT_EXPIRES_IN_SECONDS') ?? 3600,
    );

    if (this.secret.length < 32) {
      throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
    }

    if (
      !Number.isSafeInteger(this.expiresInSeconds) ||
      this.expiresInSeconds < 60
    ) {
      throw new Error(
        'AUTH_JWT_EXPIRES_IN_SECONDS must be an integer of at least 60',
      );
    }
  }

  sign(memberId: number, sessionVersion: number): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      sub: memberId,
      ver: sessionVersion,
      iat: issuedAt,
      exp: issuedAt + this.expiresInSeconds,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const content = `${TOKEN_HEADER}.${encodedPayload}`;

    return `${content}.${this.createSignature(content)}`;
  }

  verify(token: string): AuthTokenPayload {
    const [header, payload, signature, extra] = token.split('.');

    if (!header || !payload || !signature || extra || header !== TOKEN_HEADER) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    const content = `${header}.${payload}`;
    const expectedSignature = Buffer.from(
      this.createSignature(content),
      'base64url',
    );
    const receivedSignature = Buffer.from(signature, 'base64url');

    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Partial<AuthTokenPayload>;
      const now = Math.floor(Date.now() / 1000);

      if (
        !Number.isSafeInteger(parsed.sub) ||
        Number(parsed.sub) < 1 ||
        !Number.isSafeInteger(parsed.ver) ||
        Number(parsed.ver) < 0 ||
        !Number.isSafeInteger(parsed.iat) ||
        !Number.isSafeInteger(parsed.exp) ||
        Number(parsed.exp) <= now ||
        Number(parsed.iat) > now + 30
      ) {
        throw new Error('Invalid token claims');
      }

      return parsed as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException(
        'Authentication token is invalid or expired',
      );
    }
  }

  private createSignature(content: string): string {
    return createHmac('sha256', this.secret)
      .update(content)
      .digest('base64url');
  }
}
