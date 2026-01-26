interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'green' | 'amber' | 'red' | 'purple';
}

const colorClasses = {
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
  green: 'from-green-500/20 to-green-500/5 border-green-500/30',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  red: 'from-red-500/20 to-red-500/5 border-red-500/30',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
};

const iconColorClasses = {
  cyan: 'text-cyan-400',
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
};

export default function StatCard({
  title,
  value,
  unit,
  description,
  trend,
  trendValue,
  icon,
  color = 'cyan',
}: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {unit && <span className="text-slate-400 text-sm">{unit}</span>}
          </div>
          {description && (
            <p className="text-slate-500 text-xs mt-2">{description}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 'text-slate-400'
            }`}>
              {trend === 'up' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg bg-slate-800/50 ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
