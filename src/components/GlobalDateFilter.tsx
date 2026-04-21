import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ForkliftEvent } from '@/lib/eventTypes';

interface GlobalDateFilterProps {
  events: ForkliftEvent[];
  onFilter: (filtered: ForkliftEvent[]) => void;
}

export function GlobalDateFilter({ events, onFilter }: GlobalDateFilterProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const isFiltered = fromDate || toDate;

  useEffect(() => {
    if (!fromDate && !toDate) {
      onFilter(events);
      return;
    }
    const filtered = events.filter(e => {
      if (fromDate && e.Trigger_Timestamp < fromDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (e.Trigger_Timestamp > end) return false;
      }
      return true;
    });
    onFilter(filtered);
  }, [events, fromDate, toDate]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Global Filter</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", !fromDate && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {fromDate ? format(fromDate, 'MMM d, yyyy') : 'From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", !toDate && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {toDate ? format(toDate, 'MMM d, yyyy') : 'To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      {isFiltered && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => { setFromDate(undefined); setToDate(undefined); }}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
