export interface ForkliftEvent {
  Event_ID: number;
  Trigger_Timestamp: Date;
  Zone_Level: 'Warning' | 'Danger';
  Stop_Timestamp: Date | null;
}

export interface ParsedRow {
  Event_ID: string;
  Trigger_Timestamp: string;
  Zone_Level: string;
  Stop_Timestamp: string;
}

function parseUTCDate(dateStr: string): Date {
  // CSV dates are in GMT+0; append 'Z' so JS interprets as UTC, then auto-converts to local
  const trimmed = dateStr.trim();
  if (!trimmed) return new Date(NaN);
  return new Date(trimmed.replace(' ', 'T') + 'Z');
}

export function parseEvent(row: ParsedRow): ForkliftEvent {
  return {
    Event_ID: parseInt(row.Event_ID, 10),
    Trigger_Timestamp: parseUTCDate(row.Trigger_Timestamp),
    Zone_Level: row.Zone_Level?.trim() as 'Warning' | 'Danger',
    Stop_Timestamp: row.Stop_Timestamp?.trim() ? parseUTCDate(row.Stop_Timestamp) : null,
  };
}
