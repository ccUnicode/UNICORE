import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

const validTaskPayload = {
  projectId: 1,
  title: 'Implementar endpoint',
  dueDate: '2026-02-28',
  assigneeIds: [1],
};

describe('CreateTaskDto', () => {
  it('accepts a real due date in YYYY-MM-DD format', async () => {
    const dto = plainToInstance(CreateTaskDto, validTaskPayload);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['2026-02-30', '2026-2-28', '2026-02-28T10:00:00Z'])(
    'rejects invalid due date %s',
    async (dueDate) => {
      const dto = plainToInstance(CreateTaskDto, {
        ...validTaskPayload,
        dueDate,
      });

      const errors = await validate(dto);

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            property: 'dueDate',
          }),
        ]),
      );
    },
  );
});
