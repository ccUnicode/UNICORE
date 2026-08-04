import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskCommentDto } from './create-task-comment.dto';

describe('CreateTaskCommentDto', () => {
  it('trims a valid comment', async () => {
    const dto = plainToInstance(CreateTaskCommentDto, {
      content: '  Avancé con la validación.  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.content).toBe('Avancé con la validación.');
  });

  it.each(['', '   '])('rejects an empty comment: %p', async (content) => {
    const dto = plainToInstance(CreateTaskCommentDto, { content });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects comments longer than 2000 characters', async () => {
    const dto = plainToInstance(CreateTaskCommentDto, {
      content: 'a'.repeat(2001),
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
