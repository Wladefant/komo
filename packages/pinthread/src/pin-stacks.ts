import type { Thread } from "./types.js";

/** Stable membership: moving a pin opts it out until its anchor is replaced. */
export function pinStacks<T>(
  threads: Thread[],
  target: (thread: Thread) => T | null
): Map<string, Thread[]> {
  const groups = new Map<T, Thread[]>();
  for (const thread of threads) {
    if (thread.resolved || thread.anchor.unstacked) continue;
    const key = target(thread);
    if (key === null) continue;
    const group = groups.get(key) ?? [];
    group.push(thread);
    groups.set(key, group);
  }
  const membership = new Map<string, Thread[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    for (const thread of group) membership.set(thread.id, group);
  }
  return membership;
}
