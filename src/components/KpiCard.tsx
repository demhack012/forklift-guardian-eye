import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'warning' | 'danger' | 'success' | 'info';
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

export function KpiCard({ title, value, icon: Icon, variant }: KpiCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 transition-all hover:scale-[1.02]', variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold font-mono text-card-foreground">{value}</p>
        </div>
        <div className={cn('rounded-lg p-3', iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
