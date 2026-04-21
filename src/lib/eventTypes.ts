export interface ForkliftEvent {
  Event_ID: number;
  Camera_ID: string;
  Trigger_Timestamp: Date;
  Zone_Level: 'Warning' | 'Danger';
  Duration_Sec: number;
}

export interface ParsedRow {
  Event_ID: string;
  Camera_ID: string;
  Trigger_Timestamp: string;
  Zone_Level: string;
  Duration_Sec: string;
}

function parseUTCDate(dateStr: string): Date {
  // CSV dates are in GMT+0; append 'Z' so JS interprets as UTC, then auto-converts to local
  const trimmed = dateStr.trim();
  if (!trimmed) return new Date(NaN);
  return new Date(trimmed.replace(' ', 'T') + 'Z');
}

export function parseEvent(row: ParsedRow): ForkliftEvent {
  const dur = parseFloat(row.Duration_Sec);
  return {
    Event_ID: parseInt(row.Event_ID, 10),
    Camera_ID: (row.Camera_ID ?? '').trim(),
    Trigger_Timestamp: parseUTCDate(row.Trigger_Timestamp),
    Zone_Level: row.Zone_Level?.trim() as 'Warning' | 'Danger',
    Duration_Sec: isNaN(dur) ? 0 : dur,
  };
}
