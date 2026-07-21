import { ValidationPipe } from '@nestjs/common';
import { ConfirmDeletionDto } from './confirm-deletion.dto';

describe('ConfirmDeletionDto', () => {
  const validationPipe = new ValidationPipe({ transform: true });
  const metadata = {
    type: 'body' as const,
    metatype: ConfirmDeletionDto,
    data: undefined,
  };

  it('accepts a non-empty confirmName', async () => {
    await expect(
      validationPipe.transform({ confirmName: 'Research' }, metadata),
    ).resolves.toEqual({ confirmName: 'Research' });
  });

  it.each([{}, { confirmName: '' }, { confirmName: 42 }])(
    'rejects an invalid confirmation payload: %p',
    async (payload) => {
      await expect(
        validationPipe.transform(payload, metadata),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
});
