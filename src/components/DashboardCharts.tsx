import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { ForkliftEvent } from '@/lib/eventTypes';
import { getDailyAggregates, getHourlyAggregates } from '@/lib/eventStats';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const COLORS = {
  warning: 'hsl(45, 100%, 51%)',
  danger: 'hsl(0, 72%, 51%)',
  stopTime: 'hsl(210, 80%, 55%)',
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

  // Re-read on theme change
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

function ChartHeader({ title, fromDate, toDate, onFromChange, onToChange, onClear }: {
  title: string; fromDate?: Date; toDate?: Date;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
  onClear: () => void;
}) {
  const isFiltered = fromDate || toDate;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {isFiltered && <span className="ml-2 text-xs normal-case text-primary">(filtered)</span>}
      </h3>
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={onFromChange} onToChange={onToChange} onClear={onClear} />
    </div>
  );
}

export function DashboardCharts({ events }: { events: ForkliftEvent[] }) {
  const [trendFrom, setTrendFrom] = useState<Date | undefined>();
  const [trendTo, setTrendTo] = useState<Date | undefined>();
  const [stopFrom, setStopFrom] = useState<Date | undefined>();
  const [stopTo, setStopTo] = useState<Date | undefined>();
  const [hourlyFrom, setHourlyFrom] = useState<Date | undefined>();
  const [hourlyTo, setHourlyTo] = useState<Date | undefined>();

  const trendEvents = useFilteredEvents(events, trendFrom, trendTo);
  const stopEvents = useFilteredEvents(events, stopFrom, stopTo);
  const hourlyEvents = useFilteredEvents(events, hourlyFrom, hourlyTo);

  const dailyTrend = getDailyAggregates(trendEvents);
  const dailyStop = getDailyAggregates(stopEvents);
  const hourly = getHourlyAggregates(hourlyEvents);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Daily Trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <ChartHeader title="Daily Event Trend" fromDate={trendFrom} toDate={trendTo} onFromChange={setTrendFrom} onToChange={setTrendTo} onClear={() => { setTrendFrom(undefined); setTrendTo(undefined); }} />
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="warnings" stroke={COLORS.warning} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="dangers" stroke={COLORS.danger} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Stop Time */}
      <div className="rounded-xl border border-border bg-card p-5">
        <ChartHeader title="Daily Stop Time (seconds)" fromDate={stopFrom} toDate={stopTo} onFromChange={setStopFrom} onToChange={setStopTo} onClear={() => { setStopFrom(undefined); setStopTo(undefined); }} />
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dailyStop}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="stopTime" stroke={COLORS.stopTime} fill={COLORS.stopTime} fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly Distribution */}
      <div className="rounded-xl border border-border bg-card p-5">
        <ChartHeader title="Hourly Distribution" fromDate={hourlyFrom} toDate={hourlyTo} onFromChange={setHourlyFrom} onToChange={setHourlyTo} onClear={() => { setHourlyFrom(undefined); setHourlyTo(undefined); }} />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
            <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            <Bar dataKey="warnings" stackId="a" fill={COLORS.warning} radius={[0, 0, 0, 0]} />
            <Bar dataKey="dangers" stackId="a" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
