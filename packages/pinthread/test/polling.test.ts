import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adaptivePolling } from "../src/polling.js";
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("uses idle cadence, backs off unchanged active reads, and wakes immediately", async () => {
  let active = false;
  const read = vi.fn(async () => false);
  const poll = adaptivePolling({
    read,
    active: () => active,
    enabled: () => true,
    interval: 4000,
  });
  poll.wake(false);
  await vi.advanceTimersByTimeAsync(59999);
  expect(read).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(read).toHaveBeenCalledTimes(1);
  active = true;
  poll.wake();
  await vi.advanceTimersByTimeAsync(0);
  expect(read).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(7999);
  expect(read).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(read).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(15000);
  expect(read).toHaveBeenCalledTimes(4);
  poll.stop();
});
it("suspends while unavailable, serializes wakeups, and stops without a leaked timer", async () => {
  let enabled = true;
  let finish!: (value: boolean) => void;
  const read = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  const poll = adaptivePolling({
    read,
    active: () => true,
    enabled: () => enabled,
    interval: 4000,
  });
  poll.wake();
  poll.wake();
  expect(read).toHaveBeenCalledTimes(1);
  enabled = false;
  poll.wake();
  finish(false);
  await vi.advanceTimersByTimeAsync(60000);
  expect(read).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  enabled = true;
  poll.wake();
  expect(read).toHaveBeenCalledTimes(2);
  poll.stop();
  finish(true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(read).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});
