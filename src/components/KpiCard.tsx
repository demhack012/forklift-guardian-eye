import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'warning' | 'danger' | 'success' | 'info';
  trend?: number | null;
  trendLabel?: string;
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
      // ease-out cubic
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
  // For danger metrics: up is bad (red), down is good (green). For general: same.
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

export function KpiCard({ title, value, icon: Icon, variant, trend, trendLabel }: KpiCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 sm:p-5 transition-all hover:scale-[1.02]', variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold font-mono text-card-foreground">
            <AnimatedCounter value={value} />
          </p>
          {trend !== undefined && trend !== null && <TrendBadge trend={trend} label={trendLabel} />}
        </div>
        <div className={cn('rounded-lg p-2 sm:p-3 shrink-0', iconStyles[variant])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
