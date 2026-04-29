export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lex"
    >
      <rect x="2" y="2" width="28" height="28" rx="6" fill="currentColor" />
      <path
        d="M10 9 L10 23 L22 23"
        stroke="hsl(var(--sidebar))"
        strokeWidth="2.5"
        strokeLinecap="square"
        fill="none"
      />
      <circle cx="22" cy="9" r="2.5" fill="hsl(var(--sidebar))" />
    </svg>
  );
}
