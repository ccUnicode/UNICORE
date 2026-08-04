import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendCommentToMatchingTask,
  appendTaskComment,
  TaskCommentItem,
} from './task-collaboration';

const comment = (
  id: number,
  createdAt: string,
  content = `Comentario ${id}`,
): TaskCommentItem => ({
  id,
  taskId: 10,
  authorId: 3,
  author: { id: 3, firstNames: 'Ana', lastNames: 'Torres' },
  content,
  createdAt,
});

describe('task collaboration helpers', () => {
  it('appends a created comment without mutating the server snapshot', () => {
    const current = [comment(1, '2026-08-03T12:00:00.000Z')];
    const result = appendTaskComment(
      current,
      comment(2, '2026-08-03T12:01:00.000Z'),
    );

    assert.deepEqual(result.map(({ id }) => id), [1, 2]);
    assert.deepEqual(current.map(({ id }) => id), [1]);
  });

  it('keeps comments in chronological order', () => {
    const result = appendTaskComment(
      [comment(2, '2026-08-03T12:01:00.000Z')],
      comment(1, '2026-08-03T12:00:00.000Z'),
    );

    assert.deepEqual(result.map(({ id }) => id), [1, 2]);
  });

  it('ignores a late response from a different task', () => {
    const currentTask = { id: 11, comments: [] };
    const lateComment = comment(2, '2026-08-03T12:01:00.000Z');

    const result = appendCommentToMatchingTask(currentTask, lateComment);

    assert.equal(result, currentTask);
    assert.deepEqual(currentTask.comments, []);
  });
});
