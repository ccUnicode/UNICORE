import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await this.derive(password, salt, COST);

    return [
      'scrypt',
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString('base64url'),
      derivedKey.toString('base64url'),
    ].join('$');
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, costValue, blockSize, parallelization, salt, key] =
      storedHash.split('$');
    const cost = Number(costValue);

    if (
      algorithm !== 'scrypt' ||
      cost !== COST ||
      Number(blockSize) !== BLOCK_SIZE ||
      Number(parallelization) !== PARALLELIZATION ||
      !salt ||
      !key
    ) {
      return false;
    }

    try {
      const expectedKey = Buffer.from(key, 'base64url');
      const actualKey = await this.derive(
        password,
        Buffer.from(salt, 'base64url'),
        cost,
      );

      return (
        expectedKey.length === actualKey.length &&
        timingSafeEqual(expectedKey, actualKey)
      );
    } catch {
      return false;
    }
  }

  private derive(
    password: string,
    salt: Buffer,
    cost: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(
        password,
        salt,
        KEY_LENGTH,
        {
          N: cost,
          r: BLOCK_SIZE,
          p: PARALLELIZATION,
          maxmem: 64 * 1024 * 1024,
        },
        (error, derivedKey) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(derivedKey);
        },
      );
    });
  }
}
