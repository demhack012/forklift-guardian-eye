import { ForkliftEvent } from './eventTypes';
import { startOfDay, startOfWeek, isAfter, differenceInSeconds } from 'date-fns';

export interface PeriodStats {
  warnings: number;
  dangers: number;
  totalStopTimeSeconds: number;
}

function calcStats(events: ForkliftEvent[]): PeriodStats {
  let warnings = 0;
  let dangers = 0;
  let totalStopTimeSeconds = 0;

  for (const e of events) {
    if (e.Zone_Level === 'Warning') warnings++;
    if (e.Zone_Level === 'Danger') {
      dangers++;
      if (e.Stop_Timestamp) {
        totalStopTimeSeconds += Math.abs(differenceInSeconds(e.Stop_Timestamp, e.Trigger_Timestamp));
      }
    }
  }

  return { warnings, dangers, totalStopTimeSeconds };
}

export function getTodayStats(events: ForkliftEvent[]): PeriodStats {
  const today = startOfDay(new Date());
  return calcStats(events.filter(e => isAfter(e.Trigger_Timestamp, today)));
}

export function getWeekStats(events: ForkliftEvent[]): PeriodStats {
  const week = startOfWeek(new Date(), { weekStartsOn: 1 });
  return calcStats(events.filter(e => isAfter(e.Trigger_Timestamp, week)));
}

export function getOverallStats(events: ForkliftEvent[]): PeriodStats {
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
}

export function getDailyAggregates(events: ForkliftEvent[]): DailyData[] {
  const map = new Map<string, { warnings: number; dangers: number; stopTime: number }>();

  for (const e of events) {
    const date = e.Trigger_Timestamp.toISOString().slice(0, 10);
    if (!map.has(date)) map.set(date, { warnings: 0, dangers: 0, stopTime: 0 });
    const entry = map.get(date)!;
    if (e.Zone_Level === 'Warning') entry.warnings++;
    if (e.Zone_Level === 'Danger') {
      entry.dangers++;
      if (e.Stop_Timestamp) {
        entry.stopTime += Math.abs(differenceInSeconds(e.Stop_Timestamp, e.Trigger_Timestamp));
      }
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}

export interface CameraData {
  camera: string;
  warnings: number;
  dangers: number;
}

export function getCameraAggregates(events: ForkliftEvent[]): CameraData[] {
  const map = new Map<string, { warnings: number; dangers: number }>();
  for (const e of events) {
    if (!e.Camera_ID) continue;
    if (!map.has(e.Camera_ID)) map.set(e.Camera_ID, { warnings: 0, dangers: 0 });
    const entry = map.get(e.Camera_ID)!;
    if (e.Zone_Level === 'Warning') entry.warnings++;
    if (e.Zone_Level === 'Danger') entry.dangers++;
  }
  return Array.from(map.entries()).map(([camera, data]) => ({ camera, ...data }));
}

export interface HourlyData {
  hour: string;
  warnings: number;
  dangers: number;
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

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, data]) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, ...data }));
}
