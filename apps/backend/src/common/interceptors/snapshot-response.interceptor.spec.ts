import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { SnapshotResponseInterceptor } from './snapshot-response.interceptor';

const contextFor = (snapshotAt?: Date, path = '/projects') =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ accessActor: { snapshotAt }, path }),
    }),
  }) as unknown as ExecutionContext;

describe('SnapshotResponseInterceptor', () => {
  const interceptor = new SnapshotResponseInterceptor();

  it('removes entities and nested relationships after the cutoff', async () => {
    const next: CallHandler = {
      handle: () =>
        of([
          {
            id: 1,
            createdAt: '2026-07-01T00:00:00.000Z',
            memberships: [
              { id: 1, createdAt: '2026-07-02T00:00:00.000Z' },
              { id: 2, createdAt: '2026-08-02T00:00:00.000Z' },
            ],
          },
          { id: 2, createdAt: '2026-08-03T00:00:00.000Z' },
        ]),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextFor(new Date('2026-08-01T00:00:00.000Z')),
          next,
        ),
      ),
    ).resolves.toEqual([
      {
        id: 1,
        createdAt: '2026-07-01T00:00:00.000Z',
        memberships: [{ id: 1, createdAt: '2026-07-02T00:00:00.000Z' }],
      },
    ]);
  });

  it('keeps the authenticated member root while filtering later relations', async () => {
    const response = {
      id: 1,
      updatedAt: '2026-08-03T00:00:00.000Z',
      memberships: [
        { id: 1, createdAt: '2026-07-01T00:00:00.000Z' },
        { id: 2, createdAt: '2026-08-03T00:00:00.000Z' },
      ],
    };
    const next: CallHandler = { handle: () => of(response) };
    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextFor(new Date('2026-08-01T00:00:00.000Z'), '/auth/me'),
          next,
        ),
      ),
    ).resolves.toEqual({
      id: 1,
      updatedAt: '2026-08-03T00:00:00.000Z',
      memberships: [{ id: 1, createdAt: '2026-07-01T00:00:00.000Z' }],
    });
  });

  it('filters records that use timestamp instead of createdAt', async () => {
    const next: CallHandler = {
      handle: () =>
        of([
          { id: 1, timestamp: '2026-07-31T00:00:00.000Z' },
          { id: 2, timestamp: '2026-08-02T00:00:00.000Z' },
        ]),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextFor(new Date('2026-08-01T00:00:00.000Z')),
          next,
        ),
      ),
    ).resolves.toEqual([{ id: 1, timestamp: '2026-07-31T00:00:00.000Z' }]);
  });
});
