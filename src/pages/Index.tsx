import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { ForkliftEvent, ParsedRow, parseEvent } from '@/lib/eventTypes';
import {
  getTodayStats, getWeekStats, getOverallStats, formatStopTime, PeriodStats,
} from '@/lib/eventStats';
import { KpiCard } from '@/components/KpiCard';
import { DashboardCharts } from '@/components/DashboardCharts';
import {
  AlertTriangle, OctagonX, Timer, Upload, Truck, Activity,
} from 'lucide-react';

function StatSection({ title, stats, icon }: { title: string; stats: PeriodStats; icon: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Warnings" value={stats.warnings} icon={AlertTriangle} variant="warning" />
        <KpiCard title="Brake Engagements" value={stats.dangers} icon={OctagonX} variant="danger" />
        <KpiCard title="Total Stop Time" value={formatStopTime(stats.totalStopTimeSeconds)} icon={Timer} variant="info" />
      </div>
    </div>
  );
}

export default function Index() {
  const [events, setEvents] = useState<ForkliftEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  const handleFile = useCallback((file: File) => {
    Papa.parse<ParsedRow>(file, {
      header: true,
      delimiter: '\t',
      skipEmptyLines: true,
      complete(results) {
        const parsed = results.data
          .filter(r => r.Event_ID && r.Zone_Level)
          .map(parseEvent)
          .filter(e => !isNaN(e.Trigger_Timestamp.getTime()));
        setEvents(parsed);
        setLoaded(true);
      },
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          className="flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-primary/40 bg-card p-12 text-center transition-colors hover:border-primary/70"
        >
          <div className="rounded-full bg-primary/10 p-5">
            <Truck className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Forklift Safety Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Upload your events.csv to get started</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105">
            <Upload className="h-4 w-4" />
            Select CSV File
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <p className="text-xs text-muted-foreground">or drag & drop here</p>
        </div>
      </div>
    );
  }

  const today = getTodayStats(events);
  const week = getWeekStats(events);
  const overall = getOverallStats(events);

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Forklift Safety Dashboard</h1>
            <p className="text-xs text-muted-foreground">{events.length.toLocaleString()} events loaded</p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted">
          <Upload className="h-4 w-4" />
          Load New CSV
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />
        </label>
      </div>

      {/* KPI Sections */}
      <div className="space-y-8">
        <StatSection title="Today" stats={today} icon={<Activity className="h-4 w-4 text-success" />} />
        <StatSection title="This Week" stats={week} icon={<Activity className="h-4 w-4 text-info" />} />
        <StatSection title="Overall" stats={overall} icon={<Activity className="h-4 w-4 text-primary" />} />
      </div>

      {/* Charts */}
      <div className="mt-10">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Historical Analytics</h2>
        <DashboardCharts events={events} />
      </div>
    </div>
  );
}
