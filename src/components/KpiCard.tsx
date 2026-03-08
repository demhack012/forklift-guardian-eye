import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { SparklinePoint } from '@/lib/eventStats';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'warning' | 'danger' | 'success' | 'info';
  trend?: number | null;
  trendLabel?: string;
  sparklineData?: SparklinePoint[];
  sparklineLabel?: string;
}

const variantStyles = {
  warning: 'border-warning/30 glow-warning',
  danger: 'border-danger/30 glow-danger',
  success: 'border-success/30 glow-success',
  info: 'border-info/30 glow-info',
};

const iconStyles = {
  warning: 'text-warning bg-warning/10',
  danger: 'text-danger bg-danger/10',
  success: 'text-success bg-success/10',
  info: 'text-info bg-info/10',
};

const sparklineColors = {
  warning: { stroke: 'hsl(45, 100%, 51%)', fill: 'hsl(45, 100%, 51%)' },
  danger: { stroke: 'hsl(0, 72%, 51%)', fill: 'hsl(0, 72%, 51%)' },
  success: { stroke: 'hsl(142, 71%, 45%)', fill: 'hsl(142, 71%, 45%)' },
  info: { stroke: 'hsl(210, 80%, 55%)', fill: 'hsl(210, 80%, 55%)' },
};

function AnimatedCounter({ value }: { value: string | number }) {
  const [display, setDisplay] = useState<string | number>(typeof value === 'number' ? 0 : value);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplay(value);
      return;
    }

    const target = value;
    const duration = 800;
    const start = performance.now();
    const startVal = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{typeof display === 'number' ? display.toLocaleString() : display}</>;
}

function TrendBadge({ trend, label }: { trend: number; label?: string }) {
  const isUp = trend > 0;
  const isNeutral = trend === 0;
  const Icon = isNeutral ? Minus : isUp ? TrendingUp : TrendingDown;
  const colorClass = isNeutral
    ? 'text-muted-foreground bg-muted'
    : isUp
    ? 'text-danger bg-danger/10'
    : 'text-success bg-success/10';

  return (
    <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', colorClass)}>
      <Icon className="h-3 w-3" />
      <span>{Math.abs(trend)}%</span>
      {label && <span className="text-muted-foreground ml-0.5">{label}</span>}
    </div>
  );
}

export function KpiCard({ title, value, icon: Icon, variant, trend, trendLabel, sparklineData, sparklineLabel }: KpiCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSparkline = sparklineData && sparklineData.length > 0;
  const colors = sparklineColors[variant];

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 sm:p-5 transition-all',
        variantStyles[variant],
        hasSparkline && 'cursor-pointer hover:scale-[1.02]',
        !hasSparkline && 'hover:scale-[1.02]'
      )}
      onClick={hasSparkline ? () => setExpanded(!expanded) : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold font-mono text-card-foreground">
            <AnimatedCounter value={value} />
          </p>
          {trend !== undefined && trend !== null && <TrendBadge trend={trend} label={trendLabel} />}
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className={cn('rounded-lg p-2 sm:p-3', iconStyles[variant])}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          {hasSparkline && (
            <ChevronDown className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180'
            )} />
          )}
        </div>
      </div>

      {/* Sparkline expansion */}
      <div className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        expanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
      )}>
        {hasSparkline && (
          <div>
            {sparklineLabel && (
              <p className="text-[10px] text-muted-foreground mb-1">{sparklineLabel}</p>
            )}
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                <defs>
                  <linearGradient id={`spark-${variant}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.fill} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={colors.fill} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(220, 18%, 14%)',
                    border: '1px solid hsl(220, 14%, 22%)',
                    borderRadius: '6px',
                    color: 'hsl(210, 20%, 92%)',
                    fontSize: '11px',
                    padding: '4px 8px',
                  }}
                  formatter={(val: number) => [val.toLocaleString(), title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                  fill={`url(#spark-${variant})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
