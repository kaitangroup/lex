import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  red: number;
  yellow: number;
  green: number;
  size?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

export function RYGPie({ red, yellow, green, size = 120, centerLabel, centerSubLabel }: Props) {
  const total = red + yellow + green;
  const data = total === 0
    ? [{ name: "empty", value: 1, color: "hsl(var(--muted))" }]
    : [
        { name: "Red", value: red, color: "hsl(var(--destructive))" },
        { name: "Yellow", value: yellow, color: "hsl(var(--warning))" },
        { name: "Green", value: green, color: "hsl(var(--success))" },
      ].filter((d) => d.value > 0);

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={size * 0.32}
            outerRadius={size * 0.48}
            paddingAngle={data.length > 1 ? 2 : 0}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-2xl font-semibold tabular leading-none">{centerLabel ?? total}</div>
        {centerSubLabel && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {centerSubLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export function RYGLegend({ red, yellow, green }: { red: number; yellow: number; green: number }) {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
        <span className="tabular font-semibold">{red}</span>
        <span className="text-muted-foreground">red</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-warning" />
        <span className="tabular font-semibold">{yellow}</span>
        <span className="text-muted-foreground">yellow</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-success" />
        <span className="tabular font-semibold">{green}</span>
        <span className="text-muted-foreground">green</span>
      </span>
    </div>
  );
}
