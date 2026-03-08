import { Lightbulb } from 'lucide-react';

export function InsightsPanel({ insights }: { insights: string[] }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          AI Summary Insights
        </h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
