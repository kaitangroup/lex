import { cn } from "@/lib/utils";
import type { CaseStage } from "@shared/schema";

const STAGES: { id: CaseStage; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "pleadings", label: "Pleadings" },
  { id: "discovery", label: "Discovery" },
  { id: "motion_practice", label: "Motions" },
  { id: "mediation", label: "Mediation" },
  { id: "trial_prep", label: "Trial Prep" },
  { id: "trial", label: "Trial" },
  { id: "post_trial", label: "Post-Trial" },
];

export function StageStepper({ current }: { current: CaseStage }) {
  const currentIdx = STAGES.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center w-full">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 tabular shrink-0",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "bg-warning text-warning-foreground border-warning ring-4 ring-warning/20",
                  !done && !active && "bg-background text-muted-foreground border-border"
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <div
                className={cn(
                  "text-[10.5px] mt-1.5 uppercase tracking-wider whitespace-nowrap",
                  active ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-1 mb-5",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
