import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/format";

const VARIANTS = {
  red: "bg-destructive/15 text-destructive border-destructive/30",
  orange: "bg-warning/15 text-warning border-warning/30",
  yellow: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  green: "bg-success/15 text-success border-success/30",
  blue: "bg-primary/15 text-primary border-primary/30",
  gray: "bg-muted text-muted-foreground border-border",
};

export function Pill({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide rounded border tabular",
        VARIANTS[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function urgencyTone(dueIso: string, completed = false): keyof typeof VARIANTS {
  if (completed) return "green";
  const days = daysUntil(dueIso);
  if (days < 0) return "red";
  if (days <= 3) return "orange";
  if (days <= 7) return "yellow";
  return "gray";
}

export function DaysBadge({ dueIso, completed }: { dueIso: string; completed?: boolean }) {
  const days = daysUntil(dueIso);
  const tone = urgencyTone(dueIso, completed);
  let label: string;
  if (completed) label = "Done";
  else if (days < 0) label = `${Math.abs(days)}d late`;
  else if (days === 0) label = "Today";
  else if (days === 1) label = "1d";
  else label = `${days}d`;
  return <Pill tone={tone}>{label}</Pill>;
}
