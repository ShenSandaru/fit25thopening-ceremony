export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <p
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-navy-blue/80 px-3.5 py-1 font-mono text-xs text-white/80 shadow-sm backdrop-blur"
      role="status"
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${
          connected
            ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"
            : "bg-amber-400 animate-ping"
        }`}
      />
      {connected ? "Connected" : "Reconnecting"}
    </p>
  );
}
