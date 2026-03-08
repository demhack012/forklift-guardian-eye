import { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ForkliftEvent, ParsedRow, parseEvent } from '@/lib/eventTypes';
import {
  getTodayStats, getWeekStats, getOverallStats, getFilteredStats,
  formatStopTime, PeriodStatsWithTrend, PeriodStats, generateInsights,
  SparklinePoint, getHourlySparkline, getDailySparkline, getMonthlySparkline,
} from '@/lib/eventStats';
import { KpiCard } from '@/components/KpiCard';
import { DashboardCharts } from '@/components/DashboardCharts';
import { EventsTable } from '@/components/EventsTable';
import { InsightsPanel } from '@/components/InsightsPanel';
import { GlobalDateFilter } from '@/components/GlobalDateFilter';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AlertTriangle, OctagonX, Timer, Truck, Activity, Download,
  RefreshCw, Loader2, Globe, Clock,
} from 'lucide-react';

const AUTO_REFRESH_INTERVAL = 45_000; // 45 seconds

function StatSection({
  title, stats, icon, showTrends, trendLabel,
}: {
  title: string;
  stats: PeriodStatsWithTrend | PeriodStats;
  icon: React.ReactNode;
  showTrends?: boolean;
  trendLabel?: string;
}) {
  const trends = 'warningsTrend' in stats ? stats : null;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard
          title="Warnings"
          value={stats.warnings}
          icon={AlertTriangle}
          variant="warning"
          trend={showTrends && trends ? trends.warningsTrend : undefined}
          trendLabel={trendLabel}
        />
        <KpiCard
          title="Brake Engagements"
          value={stats.dangers}
          icon={OctagonX}
          variant="danger"
          trend={showTrends && trends ? trends.dangersTrend : undefined}
          trendLabel={trendLabel}
        />
        <KpiCard
          title="Total Stop Time"
          value={formatStopTime(stats.totalStopTimeSeconds)}
          icon={Timer}
          variant="info"
          trend={showTrends && trends ? trends.stopTimeTrend : undefined}
          trendLabel={trendLabel}
        />
      </div>
    </div>
  );
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function getTimezoneOffset(): string {
  const offset = -new Date().getTimezoneOffset();
  const h = Math.floor(Math.abs(offset) / 60);
  const m = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  return `GMT${sign}${h}${m > 0 ? `:${m.toString().padStart(2, '0')}` : ''}`;
}

const CSV_URL = '/data/events.csv';

export default function Index() {
  const [events, setEvents] = useState<ForkliftEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ForkliftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const dashboardRef = useRef<HTMLDivElement>(null);

  const loadCSV = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('Could not load events.csv');
      const text = await res.text();

      if (text.startsWith('<!doctype') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Got HTML instead of CSV — file not found at /data/events.csv');
      }

      Papa.parse<ParsedRow>(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        complete(results) {
          const parsed = results.data
            .filter(r => r.Event_ID && r.Zone_Level)
            .map(parseEvent)
            .filter(e => !isNaN(e.Trigger_Timestamp.getTime()));
          setEvents(parsed);
          setLastRefresh(new Date());
          if (!silent) setLoading(false);
        },
      });
    } catch (err: any) {
      if (!silent) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => { loadCSV(); }, [loadCSV]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => loadCSV(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadCSV]);

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: isDark ? '#161b26' : '#f9f9f9',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height + 120],
      });

      // Branded header
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('ManEx Systems — Forklift Safety Report', 40, 50);
      pdf.setFontSize(11);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${new Date().toLocaleString()} | Timezone: ${getTimezone()} (${getTimezoneOffset()})`, 40, 75);
      pdf.text(`Events: ${filteredEvents.length.toLocaleString()} | manex.systems | info@manex.systems`, 40, 95);

      pdf.addImage(imgData, 'PNG', 0, 120, canvas.width, canvas.height);
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
            onClick={() => loadCSV()}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const today = getTodayStats(filteredEvents);
  const week = getWeekStats(filteredEvents);
  const overall = getOverallStats(filteredEvents);
  const insights = generateInsights(filteredEvents);

  return (
    <div ref={dashboardRef} className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Forklift Safety Dashboard</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{events.length.toLocaleString()} events loaded</span>
              <span className="hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {getTimezone()} ({getTimezoneOffset()})
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Auto-refresh {AUTO_REFRESH_INTERVAL / 1000}s
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            onClick={() => loadCSV()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <a
            href={CSV_URL}
            download="events.csv"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download </span>CSV
          </a>
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exporting…' : 'PDF Report'}
          </button>
        </div>
      </div>

      {/* Global Date Filter */}
      <div className="mb-6">
        <GlobalDateFilter events={events} onFilter={setFilteredEvents} />
      </div>

      {/* Insights */}
      <div className="mb-6">
        <InsightsPanel insights={insights} />
      </div>

      {/* KPI Sections */}
      <div className="space-y-6 sm:space-y-8">
        <StatSection title="Today" stats={today} showTrends trendLabel="vs yesterday" icon={<Activity className="h-4 w-4 text-success" />} />
        <StatSection title="This Week" stats={week} showTrends trendLabel="vs last week" icon={<Activity className="h-4 w-4 text-info" />} />
        <StatSection title="Overall" stats={overall} icon={<Activity className="h-4 w-4 text-primary" />} />
      </div>

      {/* Charts */}
      <div className="mt-8 sm:mt-10">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Historical Analytics</h2>
        <DashboardCharts events={filteredEvents} />
      </div>

      {/* Data Table */}
      <div className="mt-8 sm:mt-10">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Event Log</h2>
        <EventsTable events={filteredEvents} />
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-border pt-6 pb-4 text-center text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">
          Made by{' '}
          <a href="https://manex.systems/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            ManEx Systems
          </a>
        </p>
        <p className="mt-1">6th of October City, Egypt</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="tel:+201001510969" className="hover:text-foreground transition-colors">+20 100 1510 969</a>
          <a href="tel:+971504897143" className="hover:text-foreground transition-colors">+971 50 489 7143</a>
          <a href="mailto:info@manex.systems" className="hover:text-foreground transition-colors">info@manex.systems</a>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Last refreshed: {lastRefresh.toLocaleTimeString()} • Auto-refresh every {AUTO_REFRESH_INTERVAL / 1000}s
        </p>
      </footer>
    </div>
  );
}
