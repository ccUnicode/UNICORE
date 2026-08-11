export type DropPlacement = "before" | "after";

export function moveItemRelative<T extends { id: number }>(
  items: T[],
  sourceId: number,
  targetId: number,
  placement: DropPlacement,
): T[] {
  if (sourceId === targetId) return items;
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0 || !items.some((item) => item.id === targetId)) {
    return items;
  }

  const next = [...items];
  const [source] = next.splice(sourceIndex, 1);
  const targetIndex = next.findIndex((item) => item.id === targetId);
  next.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, source);

  return next.every((item, index) => item.id === items[index]?.id)
    ? items
    : next;
}
