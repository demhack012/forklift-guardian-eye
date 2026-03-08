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

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(220, 18%, 14%)',
    border: '1px solid hsl(220, 14%, 22%)',
    borderRadius: '8px',
    color: 'hsl(210, 20%, 92%)',
  },
};

export function DashboardCharts({ events }: { events: ForkliftEvent[] }) {
  const daily = getDailyAggregates(events);

  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const filteredEvents = useMemo(() => {
    if (!fromDate && !toDate) return events;
    return events.filter(e => {
      if (fromDate && e.Trigger_Timestamp < fromDate) return false;
      if (toDate) {
        const endOfTo = new Date(toDate);
        endOfTo.setHours(23, 59, 59, 999);
        if (e.Trigger_Timestamp > endOfTo) return false;
      }
      return true;
    });
  }, [events, fromDate, toDate]);

  const hourly = getHourlyAggregates(filteredEvents);
  const isFiltered = fromDate || toDate;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Daily Trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Daily Event Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={daily}>
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
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Daily Stop Time (seconds)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={daily}>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Hourly Distribution
            {isFiltered && <span className="ml-2 text-xs normal-case text-primary">(filtered)</span>}
          </h3>
          <div className="flex items-center gap-2">
            {/* From date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", !fromDate && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {fromDate ? format(fromDate, 'MMM d') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* To date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", !toDate && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {toDate ? format(toDate, 'MMM d') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {isFiltered && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFromDate(undefined); setToDate(undefined); }}>
                Clear
              </Button>
            )}
          </div>
        </div>
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
