export function formatProjectProgress(
  hasTasks?: boolean,
  progress?: number,
): string {
  if (!hasTasks) return "Sin tareas";
  return `${progress ?? 0} %`;
}

export function ProgressBar({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  return (
    <div
      role="progressbar"
      aria-label="Progreso"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div
        className="h-full rounded-full bg-[#7478ff] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
