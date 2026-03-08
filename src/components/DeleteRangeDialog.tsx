import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ForkliftEvent } from '@/lib/eventTypes';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface DeleteRangeDialogProps {
  events: ForkliftEvent[];
  onDelete: (remaining: ForkliftEvent[]) => void;
}

export function DeleteRangeDialog({ events, onDelete }: DeleteRangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const countToDelete = events.filter(e => {
    if (!fromDate && !toDate) return false;
    if (fromDate && e.Trigger_Timestamp < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (e.Trigger_Timestamp > end) return false;
    }
    return true;
  }).length;

  const handleDelete = async () => {
    const remaining = events.filter(e => {
      if (fromDate && e.Trigger_Timestamp < fromDate) return true;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (e.Trigger_Timestamp > end) return true;
      }
      return false;
    });

    // Build CSV content (timestamps in UTC as stored in original CSV)
    const header = 'Event_ID,Trigger_Timestamp,Zone_Level,Stop_Timestamp';
    const rows = remaining.map(e => {
      const trigger = e.Trigger_Timestamp.toISOString().replace('T', ' ').slice(0, 19);
      const stop = e.Stop_Timestamp ? e.Stop_Timestamp.toISOString().replace('T', ' ').slice(0, 19) : '';
      return `${e.Event_ID},${trigger},${e.Zone_Level},${stop}`;
    });
    const csv = [header, ...rows].join('\n');

    setSaving(true);
    try {
      const res = await fetch('/api/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      toast({ title: 'CSV updated', description: `${countToDelete} events removed from the file.` });
      onDelete(remaining);
      setOpen(false);
      setFromDate(undefined);
      setToDate(undefined);
    } catch (err: any) {
      toast({ title: 'Failed to update CSV', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-danger/30 text-danger hover:bg-danger/10 hover:text-danger">
          <Trash2 className="h-4 w-4" /> Delete Range
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Events by Date Range</DialogTitle>
          <DialogDescription>
            Select a date range to permanently remove events from the CSV file on the server.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-3">
            <span className="w-14 text-sm text-muted-foreground">From</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left", !fromDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, 'PPP') : 'Select start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-14 text-sm text-muted-foreground">To</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left", !toDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, 'PPP') : 'Select end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {(fromDate || toDate) && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">
              <span className="font-semibold text-danger">{countToDelete}</span>
              <span className="text-muted-foreground"> event{countToDelete !== 1 ? 's' : ''} will be deleted</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={countToDelete === 0 || saving}
            onClick={handleDelete}
          >
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : `Delete ${countToDelete} Events`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
