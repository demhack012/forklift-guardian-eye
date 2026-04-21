import { ForkliftEvent } from './eventTypes';
import { startOfDay, startOfWeek, subDays, subWeeks, isAfter, isBefore, differenceInSeconds } from 'date-fns';

export interface PeriodStats {
  warnings: number;
  dangers: number;
  totalStopTimeSeconds: number;
  totalWarningTimeSeconds: number;
}

export interface PeriodStatsWithTrend extends PeriodStats {
  warningsTrend: number | null;
  dangersTrend: number | null;
  stopTimeTrend: number | null;
  warningTimeTrend: number | null;
}

function calcStats(events: ForkliftEvent[]): PeriodStats {
  let warnings = 0;
  let dangers = 0;
  let totalStopTimeSeconds = 0;
  let totalWarningTimeSeconds = 0;

  for (const e of events) {
    if (e.Zone_Level === 'Warning') {
      warnings++;
      totalWarningTimeSeconds += e.Duration_Sec || 0;
    }
    if (e.Zone_Level === 'Danger') {
      dangers++;
      totalStopTimeSeconds += e.Duration_Sec || 0;
    }
  }

  return { warnings, dangers, totalStopTimeSeconds, totalWarningTimeSeconds };
}

function calcTrend(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function withTrend(current: PeriodStats, previous: PeriodStats): PeriodStatsWithTrend {
  return {
    ...current,
    warningsTrend: calcTrend(current.warnings, previous.warnings),
    dangersTrend: calcTrend(current.dangers, previous.dangers),
    stopTimeTrend: calcTrend(current.totalStopTimeSeconds, previous.totalStopTimeSeconds),
    warningTimeTrend: calcTrend(current.totalWarningTimeSeconds, previous.totalWarningTimeSeconds),
  };
}

export function getTodayStats(events: ForkliftEvent[]): PeriodStatsWithTrend {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(new Date(), 1));
  const current = calcStats(events.filter(e => isAfter(e.Trigger_Timestamp, today)));
  const previous = calcStats(events.filter(e => isAfter(e.Trigger_Timestamp, yesterday) && isBefore(e.Trigger_Timestamp, today)));
  return withTrend(current, previous);
}

export function getWeekStats(events: ForkliftEvent[]): PeriodStatsWithTrend {
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const lastWeek = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const current = calcStats(events.filter(e => isAfter(e.Trigger_Timestamp, thisWeek)));
  const previous = calcStats(events.filter(e => isAfter(e.Trigger_Timestamp, lastWeek) && isBefore(e.Trigger_Timestamp, thisWeek)));
  return withTrend(current, previous);
}

export function getOverallStats(events: ForkliftEvent[]): PeriodStatsWithTrend {
  const stats = calcStats(events);
  return { ...stats, warningsTrend: null, dangersTrend: null, stopTimeTrend: null, warningTimeTrend: null };
}

export function getFilteredStats(events: ForkliftEvent[]): PeriodStats {
  return calcStats(events);
}

export function formatStopTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export interface DailyData {
  date: string;
  warnings: number;
  dangers: number;
  stopTime: number;
  warningTime: number;
  warningsMA7?: number;
  warningsMA30?: number;
  dangersMA7?: number;
  dangersMA30?: number;
}

function addMovingAverages(data: DailyData[]): DailyData[] {
  return data.map((item, i) => {
    const slice7 = data.slice(Math.max(0, i - 6), i + 1);
    const slice30 = data.slice(Math.max(0, i - 29), i + 1);
    return {
      ...item,
      warningsMA7: Math.round((slice7.reduce((s, d) => s + d.warnings, 0) / slice7.length) * 10) / 10,
      warningsMA30: Math.round((slice30.reduce((s, d) => s + d.warnings, 0) / slice30.length) * 10) / 10,
      dangersMA7: Math.round((slice7.reduce((s, d) => s + d.dangers, 0) / slice7.length) * 10) / 10,
      dangersMA30: Math.round((slice30.reduce((s, d) => s + d.dangers, 0) / slice30.length) * 10) / 10,
    };
  });
}

export function getDailyAggregates(events: ForkliftEvent[]): DailyData[] {
  const map = new Map<string, { warnings: number; dangers: number; stopTime: number; warningTime: number }>();

  for (const e of events) {
    const date = e.Trigger_Timestamp.toISOString().slice(0, 10);
    if (!map.has(date)) map.set(date, { warnings: 0, dangers: 0, stopTime: 0, warningTime: 0 });
    const entry = map.get(date)!;
    if (e.Zone_Level === 'Warning') {
      entry.warnings++;
      entry.warningTime += e.Duration_Sec || 0;
    }
    if (e.Zone_Level === 'Danger') {
      entry.dangers++;
      entry.stopTime += e.Duration_Sec || 0;
    }
  }

  const sorted = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return addMovingAverages(sorted);
}

export interface HourlyData {
  hour: string;
  warnings: number;
  dangers: number;
  total: number;
  isPeak?: boolean;
}

export function getHourlyAggregates(events: ForkliftEvent[]): HourlyData[] {
  const map = new Map<number, { warnings: number; dangers: number }>();
  for (let i = 0; i < 24; i++) map.set(i, { warnings: 0, dangers: 0 });

  for (const e of events) {
    const h = e.Trigger_Timestamp.getHours();
    const entry = map.get(h)!;
    if (e.Zone_Level === 'Warning') entry.warnings++;
    if (e.Zone_Level === 'Danger') entry.dangers++;
  }

  const data = Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, d]) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      warnings: d.warnings,
      dangers: d.dangers,
      total: d.warnings + d.dangers,
    }));

  // Mark peak hours (top 3 by total)
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const peakThreshold = sorted[2]?.total || 0;
  return data.map(d => ({ ...d, isPeak: d.total >= peakThreshold && d.total > 0 }));
}

export function getPeakHours(events: ForkliftEvent[]): { hour: string; total: number }[] {
  const hourly = getHourlyAggregates(events);
  return hourly.filter(h => h.isPeak).sort((a, b) => b.total - a.total).slice(0, 3);
}

export interface SparklinePoint {
  label: string;
  value: number;
}

/** Last 24 hours, one point per hour */
export type SparklineMetric = 'warnings' | 'dangers' | 'stopTime' | 'warningTime';

export function getHourlySparkline(events: ForkliftEvent[], metric: SparklineMetric): SparklinePoint[] {
  const now = new Date();
  const points: SparklinePoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(now);
    hourStart.setHours(now.getHours() - i, 0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourStart.getHours() + 1);
    const label = `${hourStart.getHours().toString().padStart(2, '0')}:00`;
    let value = 0;
    for (const e of events) {
      if (e.Trigger_Timestamp >= hourStart && e.Trigger_Timestamp < hourEnd) {
        if (metric === 'warnings' && e.Zone_Level === 'Warning') value++;
        if (metric === 'dangers' && e.Zone_Level === 'Danger') value++;
        if (metric === 'stopTime' && e.Zone_Level === 'Danger') value += e.Duration_Sec || 0;
        if (metric === 'warningTime' && e.Zone_Level === 'Warning') value += e.Duration_Sec || 0;
      }
    }
    points.push({ label, value });
  }
  return points;
}

/** Last 7 days, one point per day */
export function getDailySparkline(events: ForkliftEvent[], metric: SparklineMetric): SparklinePoint[] {
  const points: SparklinePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(subDays(new Date(), i));
    const nextDay = startOfDay(subDays(new Date(), i - 1));
    const label = day.toLocaleDateString('en-US', { weekday: 'short' });
    let value = 0;
    for (const e of events) {
      if (e.Trigger_Timestamp >= day && e.Trigger_Timestamp < nextDay) {
        if (metric === 'warnings' && e.Zone_Level === 'Warning') value++;
        if (metric === 'dangers' && e.Zone_Level === 'Danger') value++;
        if (metric === 'stopTime' && e.Zone_Level === 'Danger') value += e.Duration_Sec || 0;
        if (metric === 'warningTime' && e.Zone_Level === 'Warning') value += e.Duration_Sec || 0;
      }
    }
    points.push({ label, value });
  }
  return points;
}

/** Monthly aggregates across all data */
export function getMonthlySparkline(events: ForkliftEvent[], metric: SparklineMetric): SparklinePoint[] {
  const map = new Map<string, number>();
  for (const e of events) {
    const key = `${e.Trigger_Timestamp.getFullYear()}-${(e.Trigger_Timestamp.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, 0);
    if (metric === 'warnings' && e.Zone_Level === 'Warning') map.set(key, map.get(key)! + 1);
    if (metric === 'dangers' && e.Zone_Level === 'Danger') map.set(key, map.get(key)! + 1);
    if (metric === 'stopTime' && e.Zone_Level === 'Danger') map.set(key, map.get(key)! + (e.Duration_Sec || 0));
    if (metric === 'warningTime' && e.Zone_Level === 'Warning') map.set(key, map.get(key)! + (e.Duration_Sec || 0));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [y, m] = key.split('-');
      const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { label, value };
    });
}

export function generateInsights(events: ForkliftEvent[]): string[] {
  const insights: string[] = [];
  const today = getTodayStats(events);
  const week = getWeekStats(events);
  const peaks = getPeakHours(events);

  if (week.dangersTrend !== null && week.dangersTrend !== 0) {
    const dir = week.dangersTrend > 0 ? 'increased' : 'decreased';
    insights.push(`Brake engagements ${dir} ${Math.abs(week.dangersTrend)}% compared to last week.`);
  }

  if (week.warningsTrend !== null && week.warningsTrend !== 0) {
    const dir = week.warningsTrend > 0 ? 'increased' : 'decreased';
    insights.push(`Warnings ${dir} ${Math.abs(week.warningsTrend)}% compared to last week.`);
  }

  if (today.dangers > 0) {
    insights.push(`${today.dangers} brake engagement${today.dangers !== 1 ? 's' : ''} recorded today so far.`);
  }

  if (peaks.length > 0) {
    const peakStr = peaks.map(p => p.hour).join(', ');
    insights.push(`Peak activity hours: ${peakStr}.`);
  }

  const overall = getOverallStats(events);
  if (overall.totalStopTimeSeconds > 0) {
    insights.push(`Total accumulated stop time: ${formatStopTime(overall.totalStopTimeSeconds)}.`);
  }

  if (insights.length === 0) {
    insights.push('No significant activity detected in the current data set.');
  }

  return insights;
}

export interface CameraData {
  camera: string;
  warnings: number;
  dangers: number;
  total: number;
  warningTime: number;
  stopTime: number;
}

export function getCameraAggregates(events: ForkliftEvent[]): CameraData[] {
  const map = new Map<string, CameraData>();
  for (const e of events) {
    const key = e.Camera_ID || 'Unknown';
    if (!map.has(key)) {
      map.set(key, { camera: key, warnings: 0, dangers: 0, total: 0, warningTime: 0, stopTime: 0 });
    }
    const c = map.get(key)!;
    c.total++;
    if (e.Zone_Level === 'Warning') {
      c.warnings++;
      c.warningTime += e.Duration_Sec || 0;
    } else if (e.Zone_Level === 'Danger') {
      c.dangers++;
      c.stopTime += e.Duration_Sec || 0;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
