export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <p className="flex items-center gap-2 text-sm text-dark-grey" role="status">
      <span
        aria-hidden="true"
        className={`size-3 rounded-full ${connected ? "bg-navy-blue" : "bg-gold"}`}
      />
      {connected ? "Connected" : "Reconnecting"}
    </p>
  );
}
