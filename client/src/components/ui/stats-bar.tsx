interface StatItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface StatsBarProps {
  stats: StatItem[];
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))` }}>
      {stats.map((s, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex items-center gap-3">
          {s.icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color || "bg-indigo-50"}`}>
              <s.icon className="h-4 w-4 text-indigo-600" />
            </div>
          )}
          <div>
            <div className="text-lg font-extrabold text-gray-900 leading-none">{s.value}</div>
            <div className="text-[10px] font-medium text-gray-400 mt-0.5">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
