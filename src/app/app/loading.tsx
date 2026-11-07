export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-fade">
      <div className="mb-3 h-3 w-32 rounded bg-paper-deep" />
      <div className="mb-10 h-11 w-2/3 max-w-md rounded-md bg-paper-deep" />
      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 animate-pulse bg-card" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-card" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );
}
