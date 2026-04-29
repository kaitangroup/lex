// Shared warning logic — red/yellow/green for milestones, deadlines, invoices
import type { Milestone, FirmSettings, Deadline, Invoice } from "@shared/schema";

export type Warn = "red" | "yellow" | "green";

export function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 86400000;
}

export function deadlineWarn(d: Deadline, settings: FirmSettings): Warn {
  if (d.status === "completed") return "green";
  const days = daysUntil(d.dueDate);
  if (days <= settings.deadlineRedDays) return "red";
  if (days <= settings.deadlineYellowDays) return "yellow";
  return "green";
}

export function milestoneWarn(m: Milestone, settings: FirmSettings): Warn {
  if (m.status === "complete") return "green";
  if (m.status === "blocked") return "red";
  const days = daysUntil(m.dueDate);
  if (days <= settings.milestoneRedDays) return "red";
  if (days <= settings.milestoneYellowDays) return "yellow";
  return "green";
}

// AR aging — for invoices not yet paid
export function invoiceWarn(inv: Invoice, settings: FirmSettings): Warn {
  if (inv.status === "paid") return "green";
  const overdue = -daysUntil(inv.dueDate);
  if (overdue >= settings.invoiceRedDays) return "red";
  if (overdue >= settings.invoiceYellowDays) return "yellow";
  return "green";
}

export const WARN_COLORS: Record<Warn, string> = {
  red: "hsl(var(--destructive))",
  yellow: "hsl(var(--warning))",
  green: "hsl(var(--success))",
};

export const WARN_BG: Record<Warn, string> = {
  red: "bg-destructive/10 text-destructive border-destructive/30",
  yellow: "bg-warning/10 text-warning border-warning/30",
  green: "bg-success/10 text-success border-success/30",
};

export const WARN_DOT: Record<Warn, string> = {
  red: "bg-destructive",
  yellow: "bg-warning",
  green: "bg-success",
};

export function ryGCounts<T>(items: T[], warnFn: (item: T) => Warn) {
  const c = { red: 0, yellow: 0, green: 0 };
  for (const x of items) c[warnFn(x)]++;
  return c;
}
