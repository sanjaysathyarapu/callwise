export function ActivityChart({ data }: { data: { day: string; n: number }[] }) {
  const peak = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((sum, d) => sum + d.n, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-32 items-end gap-1.5" role="img" aria-label={`${total} conversations in the last ${data.length} days`}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t ${d.n > 0 ? "bg-primary" : "bg-muted"}`}
              style={{ height: `${d.n > 0 ? Math.max(8, (d.n / peak) * 100) : 4}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {d.day.slice(5)}: {d.n}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{total} {total === 1 ? "conversation" : "conversations"}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}
