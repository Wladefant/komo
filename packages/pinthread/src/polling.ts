/** One read at a time; quiet widgets and unchanged projects spend less time polling. */
export function adaptivePolling(options: {
  read: () => Promise<boolean | void>;
  active: () => boolean;
  enabled: () => boolean;
  interval: number;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false,
    stopped = false,
    again = false,
    unchanged = 0;
  const schedule = () => {
    clearTimeout(timer);
    if (stopped || !options.enabled()) return;
    const delay = options.active()
      ? Math.min(
          Math.max(15000, options.interval),
          options.interval * 2 ** Math.min(unchanged, 3),
        )
      : Math.max(60000, options.interval);
    timer = setTimeout(tick, delay * (0.9 + Math.random() * 0.2));
  };
  const tick = async () => {
    if (stopped || !options.enabled()) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      unchanged = (await options.read()) ? 0 : unchanged + 1;
    } catch {
      unchanged++;
    } finally {
      running = false;
      if (again) {
        again = false;
        wake();
      } else schedule();
    }
  };
  function wake(immediate = true) {
    unchanged = 0;
    clearTimeout(timer);
    if (immediate) void tick();
    else if (!running) schedule();
  }
  return {
    wake,
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
