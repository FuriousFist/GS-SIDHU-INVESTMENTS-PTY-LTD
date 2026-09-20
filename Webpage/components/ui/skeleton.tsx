// Loading placeholder used by each route's loading.tsx.

function joinClasses(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={joinClasses("animate-pulse rounded bg-neutral-200", className)}
    />
  );
}
