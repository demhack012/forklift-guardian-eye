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

export function parseEvent(row: ParsedRow): ForkliftEvent {
  return {
    Event_ID: parseInt(row.Event_ID, 10),
    Trigger_Timestamp: new Date(row.Trigger_Timestamp),
    Zone_Level: row.Zone_Level?.trim() as 'Warning' | 'Danger',
    Stop_Timestamp: row.Stop_Timestamp?.trim() ? new Date(row.Stop_Timestamp.trim()) : null,
    Camera_ID: row.Camera_ID?.trim() || '',
  };
}
