import { ForkliftEvent } from '@/lib/eventTypes';
import { getDailyAggregates, getHourlyAggregates } from '@/lib/eventStats';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';

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
  const camera = getCameraAggregates(events);
  const hourly = getHourlyAggregates(events);

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

      {/* Camera Breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Events by Camera</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={camera}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
            <XAxis dataKey="camera" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            <Bar dataKey="warnings" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
            <Bar dataKey="dangers" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly Distribution */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hourly Distribution</h3>
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
