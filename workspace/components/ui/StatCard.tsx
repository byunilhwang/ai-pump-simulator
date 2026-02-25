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
  cyan: 'from-cyan-50 to-white border-cyan-200',
  green: 'from-green-50 to-white border-green-200',
  amber: 'from-amber-50 to-white border-amber-200',
  red: 'from-red-50 to-white border-red-200',
  purple: 'from-purple-50 to-white border-purple-200',
};

const iconColorClasses = {
  cyan: 'text-cyan-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
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
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{value}</span>
            {unit && <span className="text-slate-500 text-sm">{unit}</span>}
          </div>
          {description && (
            <p className="text-slate-500 text-xs mt-2">{description}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-slate-500'
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
          <div className={`p-3 rounded-lg bg-white/80 ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
