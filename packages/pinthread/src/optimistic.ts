type ResolveId = (id: string) => string;
type Change<T> = (state: T, resolve: ResolveId) => T;
type Job<T> = {
  change: Change<T>;
  save: (resolve: ResolveId) => Promise<Record<string, string> | void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

/** Rebase outstanding edits on confirmed state; failed writes remove only their own edit. */
export class OptimisticQueue<T> {
  private jobs: Job<T>[] = [];
  private aliases = new Map<string, string>();
  revision = 0;
  constructor(
    private confirmed: T,
    private changed: (state: T) => void,
    private normalize: (state: T, resolve: ResolveId) => T = (state) => state,
  ) {}
  get busy() {
    return this.jobs.length > 0;
  }
  id = (id: string): string => this.aliases.get(id) ?? id;
  get value(): T {
    return this.normalize(
      this.jobs.reduce(
        (state, job) => job.change(state, this.id),
        this.confirmed,
      ),
      this.id,
    );
  }
  replace(state: T, revision = this.revision): boolean {
    if (this.busy || revision !== this.revision) return false;
    this.confirmed = state;
    this.changed(this.value);
    return true;
  }
  reset(state: T) {
    const jobs = this.jobs;
    this.jobs = [];
    this.aliases.clear();
    this.confirmed = state;
    this.revision++;
    for (const job of jobs)
      job.reject(new DOMException("Session changed", "AbortError"));
    this.changed(this.value);
  }
  submit(change: Change<T>, save: Job<T>["save"]): Promise<void> {
    const result = new Promise<void>((resolve, reject) => {
      this.jobs.push({ change, save, resolve, reject });
    });
    this.revision++;
    this.changed(this.value);
    if (this.jobs.length === 1) void this.drain();
    return result;
  }
  private async drain() {
    while (this.jobs.length) {
      const job = this.jobs[0];
      let failure: unknown;
      let failed = false;
      try {
        const aliases = await job.save(this.id);
        if (this.jobs[0] !== job) return;
        this.confirmed = job.change(this.confirmed, this.id);
        for (const [from, to] of Object.entries(aliases ?? {}))
          this.aliases.set(from, to);
        this.confirmed = this.normalize(this.confirmed, this.id);
      } catch (error) {
        failed = true;
        failure = error;
      }
      if (this.jobs[0] !== job) return;
      this.jobs.shift();
      this.revision++;
      this.changed(this.value);
      if (failed) job.reject(failure);
      else job.resolve();
    }
  }
}
