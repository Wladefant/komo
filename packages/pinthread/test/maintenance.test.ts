import { afterEach, expect, it, vi } from "vitest";
import { maintain } from "../server/workspaces";
afterEach(() => vi.useRealTimers());
it("bounds fallback cleanup, isolates databases, and lets cron run explicitly", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const makeDb = () =>
    ({
      prepare: vi.fn(() => ({ bind: vi.fn() })),
      batch: vi.fn().mockResolvedValue([]),
    }) as unknown as D1Database;
  const first = makeDb(),
    second = makeDb();
  await Promise.all([maintain(first), maintain(first), maintain(second)]);
  expect(first.batch).toHaveBeenCalledTimes(1);
  expect(second.batch).toHaveBeenCalledTimes(1);
  await maintain(first, true);
  expect(first.batch).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(3600000);
  await maintain(first);
  expect(first.batch).toHaveBeenCalledTimes(3);
  vi.mocked(first.batch).mockRejectedValueOnce(new Error("retry"));
  await expect(maintain(first, true)).rejects.toThrow("retry");
  await maintain(first);
  expect(first.batch).toHaveBeenCalledTimes(4);
  vi.advanceTimersByTime(60000);
  await maintain(first);
  expect(first.batch).toHaveBeenCalledTimes(5);
});
