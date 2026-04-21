import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ForkliftEvent } from '@/lib/eventTypes';
import { formatStopTime } from '@/lib/eventStats';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';

type SortKey = 'Event_ID' | 'Trigger_Timestamp' | 'Zone_Level' | 'Camera_ID' | 'Duration_Sec';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

export function EventsTable({ events }: { events: ForkliftEvent[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('Trigger_Timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter(e => {
      if (!q) return true;
      return (
        e.Event_ID.toString().includes(q) ||
        e.Zone_Level.toLowerCase().includes(q) ||
        e.Camera_ID.toLowerCase().includes(q) ||
        format(e.Trigger_Timestamp, 'yyyy-MM-dd HH:mm:ss').includes(q)
      );
    });
  }, [events, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'Event_ID': cmp = a.Event_ID - b.Event_ID; break;
        case 'Trigger_Timestamp': cmp = a.Trigger_Timestamp.getTime() - b.Trigger_Timestamp.getTime(); break;
        case 'Zone_Level': cmp = a.Zone_Level.localeCompare(b.Zone_Level); break;
        case 'Camera_ID': cmp = a.Camera_ID.localeCompare(b.Camera_ID); break;
        case 'Duration_Sec': cmp = a.Duration_Sec - b.Duration_Sec; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  const exportFilteredCSV = () => {
    const header = 'Event_ID,Camera_ID,Trigger_Timestamp,Zone_Level,Duration_Sec';
    const rows = sorted.map(e => {
      const trigger = e.Trigger_Timestamp.toISOString().replace('T', ' ').slice(0, 19);
      return `${e.Event_ID},${e.Camera_ID},${trigger},${e.Zone_Level},${e.Duration_Sec.toFixed(2)}`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-filtered-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortButton = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === col ? 'text-primary' : ''}`} />
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Event Log
          <span className="ml-2 text-xs normal-case text-muted-foreground">
            ({sorted.length} of {events.length})
          </span>
        </h3>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 text-sm w-full sm:w-56"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={exportFilteredCSV}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24"><SortButton col="Event_ID" label="ID" /></TableHead>
              <TableHead className="w-36"><SortButton col="Camera_ID" label="Camera" /></TableHead>
              <TableHead><SortButton col="Trigger_Timestamp" label="Trigger Time" /></TableHead>
              <TableHead className="w-28"><SortButton col="Zone_Level" label="Zone" /></TableHead>
              <TableHead className="w-28 text-right"><SortButton col="Duration_Sec" label="Duration" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map(e => {
              const duration = e.Duration_Sec > 0 ? formatStopTime(Math.round(e.Duration_Sec)) : '—';
              return (
                <TableRow key={e.Event_ID}>
                  <TableCell className="font-mono text-xs">{e.Event_ID}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.Camera_ID || '—'}</TableCell>
                  <TableCell className="text-xs">{format(e.Trigger_Timestamp, 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.Zone_Level === 'Danger'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {e.Zone_Level}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">{duration}</TableCell>
                </TableRow>
              );
            })}
            {pageData.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No events found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
