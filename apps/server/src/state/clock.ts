export type TimeoutHandle = { readonly id: unknown };

export type Clock = {
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => TimeoutHandle;
  clearTimeout: (handle: TimeoutHandle) => void;
};

export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => ({
    id: setTimeout(callback, delayMs),
  }),
  clearTimeout: (handle) => {
    clearTimeout(handle.id as ReturnType<typeof setTimeout>);
  },
};
