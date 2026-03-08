import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Maximize2, X } from 'lucide-react';
import { ForkliftEvent } from '@/lib/eventTypes';
import { getDailyAggregates, getHourlyAggregates } from '@/lib/eventStats';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, Cell
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const COLORS = {
  warning: 'hsl(45, 100%, 51%)',
  danger: 'hsl(0, 72%, 51%)',
  stopTime: 'hsl(210, 80%, 55%)',
  ma7: 'hsl(160, 60%, 45%)',
  ma30: 'hsl(280, 60%, 55%)',
  peak: 'hsl(0, 85%, 60%)',
};

function useChartTheme() {
  const getVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [style, setStyle] = useState(() => ({
    grid: `hsl(${getVar('--chart-grid') || '220 14% 22%'})`,
    tick: `hsl(${getVar('--chart-tick') || '215 15% 55%'})`,
    tooltipBg: `hsl(${getVar('--chart-tooltip-bg') || '220 18% 14%'})`,
    tooltipBorder: `hsl(${getVar('--chart-tooltip-border') || '220 14% 22%'})`,
    tooltipText: `hsl(${getVar('--chart-tooltip-text') || '210 20% 92%'})`,
  }));

  useMemo(() => {
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        setStyle({
          grid: `hsl(${getVar('--chart-grid') || '220 14% 22%'})`,
          tick: `hsl(${getVar('--chart-tick') || '215 15% 55%'})`,
          tooltipBg: `hsl(${getVar('--chart-tooltip-bg') || '220 18% 14%'})`,
          tooltipBorder: `hsl(${getVar('--chart-tooltip-border') || '220 14% 22%'})`,
          tooltipText: `hsl(${getVar('--chart-tooltip-text') || '210 20% 92%'})`,
        });
      }, 50);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return style;
}

function useFilteredEvents(events: ForkliftEvent[], fromDate?: Date, toDate?: Date) {
  return useMemo(() => {
    if (!fromDate && !toDate) return events;
    return events.filter(e => {
      if (fromDate && e.Trigger_Timestamp < fromDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (e.Trigger_Timestamp > end) return false;
      }
      return true;
    });
  }, [events, fromDate, toDate]);
}

function DateRangeFilter({
  fromDate, toDate, onFromChange, onToChange, onClear,
}: {
  fromDate?: Date; toDate?: Date;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
  onClear: () => void;
}) {
  const isFiltered = fromDate || toDate;
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", !fromDate && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {fromDate ? format(fromDate, 'MMM d') : 'From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar mode="single" selected={fromDate} onSelect={onFromChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", !toDate && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {toDate ? format(toDate, 'MMM d') : 'To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar mode="single" selected={toDate} onSelect={onToChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      {isFiltered && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>Clear</Button>
      )}
    </div>
  );
}

function ChartHeader({ title, fromDate, toDate, onFromChange, onToChange, onClear, onFullscreen }: {
  title: string; fromDate?: Date; toDate?: Date;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
  onClear: () => void;
  onFullscreen?: () => void;
}) {
  const isFiltered = fromDate || toDate;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {isFiltered && <span className="ml-2 text-xs normal-case text-primary">(filtered)</span>}
      </h3>
      <div className="flex items-center gap-2">
        <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={onFromChange} onToChange={onToChange} onClear={onClear} />
        {onFullscreen && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onFullscreen} title="Fullscreen">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FullscreenChart({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[85vh] flex flex-col p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardCharts({ events }: { events: ForkliftEvent[] }) {
  const ct = useChartTheme();
  const [trendFrom, setTrendFrom] = useState<Date | undefined>();
  const [trendTo, setTrendTo] = useState<Date | undefined>();
  const [stopFrom, setStopFrom] = useState<Date | undefined>();
  const [stopTo, setStopTo] = useState<Date | undefined>();
  const [hourlyFrom, setHourlyFrom] = useState<Date | undefined>();
  const [hourlyTo, setHourlyTo] = useState<Date | undefined>();
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  const trendEvents = useFilteredEvents(events, trendFrom, trendTo);
  const stopEvents = useFilteredEvents(events, stopFrom, stopTo);
  const hourlyEvents = useFilteredEvents(events, hourlyFrom, hourlyTo);

  const dailyTrend = getDailyAggregates(trendEvents);
  const dailyStop = getDailyAggregates(stopEvents);
  const hourly = getHourlyAggregates(hourlyEvents);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      borderRadius: '8px',
      color: ct.tooltipText,
    },
  };

  const renderTrendChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={dailyTrend}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
        <XAxis dataKey="date" tick={{ fill: ct.tick, fontSize: 11 }} />
        <YAxis tick={{ fill: ct.tick, fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Legend />
        <Line type="monotone" dataKey="warnings" stroke={COLORS.warning} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="dangers" stroke={COLORS.danger} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="warningsMA7" name="Warnings 7d MA" stroke={COLORS.ma7} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
        <Line type="monotone" dataKey="dangersMA7" name="Dangers 7d MA" stroke={COLORS.ma30} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderStopChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={dailyStop}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
        <XAxis dataKey="date" tick={{ fill: ct.tick, fontSize: 11 }} />
        <YAxis tick={{ fill: ct.tick, fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Area type="monotone" dataKey="stopTime" stroke={COLORS.stopTime} fill={COLORS.stopTime} fillOpacity={0.2} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderHourlyChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={hourly}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
        <XAxis dataKey="hour" tick={{ fill: ct.tick, fontSize: 11 }} />
        <YAxis tick={{ fill: ct.tick, fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Legend />
        <Bar dataKey="warnings" stackId="a" fill={COLORS.warning} radius={[0, 0, 0, 0]}>
          {hourly.map((entry, i) => (
            <Cell key={i} fill={entry.isPeak ? COLORS.peak : COLORS.warning} fillOpacity={entry.isPeak ? 0.9 : 1} />
          ))}
        </Bar>
        <Bar dataKey="dangers" stackId="a" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Trend */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <ChartHeader title="Daily Event Trend (with 7d MA)" fromDate={trendFrom} toDate={trendTo} onFromChange={setTrendFrom} onToChange={setTrendTo} onClear={() => { setTrendFrom(undefined); setTrendTo(undefined); }} onFullscreen={() => setFullscreen('trend')} />
          {renderTrendChart(280)}
        </div>

        {/* Daily Stop Time */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <ChartHeader title="Daily Stop Time (seconds)" fromDate={stopFrom} toDate={stopTo} onFromChange={setStopFrom} onToChange={setStopTo} onClear={() => { setStopFrom(undefined); setStopTo(undefined); }} onFullscreen={() => setFullscreen('stop')} />
          {renderStopChart(280)}
        </div>

        {/* Hourly Distribution */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <ChartHeader title="Hourly Distribution (peaks highlighted)" fromDate={hourlyFrom} toDate={hourlyTo} onFromChange={setHourlyFrom} onToChange={setHourlyTo} onClear={() => { setHourlyFrom(undefined); setHourlyTo(undefined); }} onFullscreen={() => setFullscreen('hourly')} />
          {renderHourlyChart(280)}
        </div>
      </div>

      {/* Full-screen modals */}
      <FullscreenChart open={fullscreen === 'trend'} onClose={() => setFullscreen(null)} title="Daily Event Trend">
        {renderTrendChart(600)}
      </FullscreenChart>
      <FullscreenChart open={fullscreen === 'stop'} onClose={() => setFullscreen(null)} title="Daily Stop Time">
        {renderStopChart(600)}
      </FullscreenChart>
      <FullscreenChart open={fullscreen === 'hourly'} onClose={() => setFullscreen(null)} title="Hourly Distribution">
        {renderHourlyChart(600)}
      </FullscreenChart>
    </>
  );
}
