import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { AccessControlledRequest } from '../interfaces/access-controlled-request.interface';

@Injectable()
export class SnapshotResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<AccessControlledRequest>();
    const cutoff = request.accessActor?.snapshotAt;
    if (!cutoff) return next.handle();

    return next
      .handle()
      .pipe(
        map((value: unknown) =>
          this.filter(value, cutoff, request.path === '/auth/me'),
        ),
      );
  }

  private filter(value: unknown, cutoff: Date, preserveRoot = false): unknown {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.filter(item, cutoff))
        .filter((item) => item !== undefined);
    }
    if (!value || typeof value !== 'object' || value instanceof Date) {
      return value;
    }

    const record = value as Record<string, unknown>;
    if (
      !preserveRoot &&
      (this.isAfter(record.createdAt, cutoff) ||
        this.isAfter(record.updatedAt, cutoff) ||
        this.isAfter(record.timestamp, cutoff))
    ) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(record)
        .map(([key, item]) => [key, this.filter(item, cutoff)] as const)
        .filter(([, item]) => item !== undefined),
    );
  }

  private isAfter(value: unknown, cutoff: Date): boolean {
    if (!(value instanceof Date) && typeof value !== 'string') return false;
    const date = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(date.getTime()) && date > cutoff;
  }
}
