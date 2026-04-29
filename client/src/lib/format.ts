export const fmtMoney = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${Math.round(n / 1_000)}K`
    : `$${n}`;

export const fmtMoneyExact = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const daysUntil = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const fmtRelative = (iso: string) => {
  const days = daysUntil(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};

export const stageLabel = (s: string) =>
  ({
    intake: "Intake",
    pleadings: "Pleadings",
    discovery: "Discovery",
    motion_practice: "Motion Practice",
    mediation: "Mediation",
    trial_prep: "Trial Prep",
    trial: "Trial",
    post_trial: "Post-Trial",
    closed: "Closed",
  } as Record<string, string>)[s] || s;

export const caseTypeLabel = (s: string) =>
  ({
    bankruptcy_avoidance: "Bankruptcy / Avoidance",
    commercial_litigation: "Commercial Litigation",
    real_estate: "Real Estate",
  } as Record<string, string>)[s] || s;

export const milestoneKindLabel = (k: string) =>
  ({
    info_gathering: "Client info gathering",
    analysis_memo: "Analysis memo",
    position_statement: "Position statement",
    discovery: "Discovery",
    hearing: "Hearing",
    mediation: "Mediation",
  } as Record<string, string>)[k] || k;

export const filingCategoryLabel = (c: string) =>
  ({
    mass_filing: "Mass filings",
    bankruptcy: "Bankruptcy",
    commercial: "Commercial",
    real_estate: "Real estate",
  } as Record<string, string>)[c] || c;
