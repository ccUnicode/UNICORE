export type CollaborationMember = {
  id: number;
  firstNames: string;
  lastNames: string;
};

export type TaskCommentItem = {
  id: number;
  taskId: number;
  authorId: number;
  author: CollaborationMember;
  content: string;
  createdAt: string;
};

export function appendTaskComment(
  comments: TaskCommentItem[],
  comment: TaskCommentItem,
): TaskCommentItem[] {
  return [...comments, comment].sort((left, right) => {
    const timestampDifference =
      Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return timestampDifference || left.id - right.id;
  });
}

export function appendCommentToMatchingTask<
  T extends { id: number; comments?: TaskCommentItem[] },
>(task: T | null, comment: TaskCommentItem): T | null {
  if (!task || task.id !== comment.taskId) {
    return task;
  }

  return {
    ...task,
    comments: appendTaskComment(task.comments ?? [], comment),
  };
}

export function formatCollaborationTimestamp(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
