import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTaskDto } from './update-task.dto';

describe('UpdateTaskDto', () => {
  it.each(['2028-02-29', null])('accepts due date %s', async (dueDate) => {
    const dto = plainToInstance(UpdateTaskDto, { dueDate });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['2026-02-30', '2026/02/28', '2026-02-28T10:00:00Z'])(
    'rejects invalid due date %s',
    async (dueDate) => {
      const dto = plainToInstance(UpdateTaskDto, { dueDate });

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
