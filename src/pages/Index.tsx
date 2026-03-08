import { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ForkliftEvent, ParsedRow, parseEvent } from '@/lib/eventTypes';
import {
  getTodayStats, getWeekStats, getOverallStats, formatStopTime, PeriodStats,
} from '@/lib/eventStats';
import { KpiCard } from '@/components/KpiCard';
import { DashboardCharts } from '@/components/DashboardCharts';
import {
  AlertTriangle, OctagonX, Timer, Truck, Activity, Download, RefreshCw, Loader2,
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

const CSV_URL = '/data/events.csv';

export default function Index() {
  const [events, setEvents] = useState<ForkliftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const loadCSV = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('Could not load events.csv');
      const text = await res.text();
      Papa.parse<ParsedRow>(text, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        complete(results) {
          const parsed = results.data
            .filter(r => r.Event_ID && r.Zone_Level)
            .map(parseEvent)
            .filter(e => !isNaN(e.Trigger_Timestamp.getTime()));
          setEvents(parsed);
          setLoading(false);
        },
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCSV();
  }, [loadCSV]);

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#161b26',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`forklift-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      console.error('PDF export failed');
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading events data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-danger/30 bg-card p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-danger" />
          <p className="text-foreground">Failed to load CSV</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={loadCSV}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const today = getTodayStats(events);
  const week = getWeekStats(events);
  const overall = getOverallStats(events);

  return (
    <div ref={dashboardRef} className="min-h-screen p-6 lg:p-8">
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
        <div className="flex items-center gap-3">
          <button
            onClick={loadCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exporting…' : 'Download PDF'}
          </button>
        </div>
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
