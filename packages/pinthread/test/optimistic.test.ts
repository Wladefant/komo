import { describe, expect, it } from "vitest";
import { OptimisticQueue } from "../src/optimistic";
const deferred = <T = void>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
describe("optimistic writes", () => {
  it("renders immediately, rebases later edits after failure, and blocks stale polling", async () => {
    const a = deferred(),
      b = deferred();
    let visible = { title: "Before", resolved: false };
    const queue = new OptimisticQueue(visible, (state) => {
      visible = state;
    });
    const revision = queue.revision;
    const first = queue.submit(
      (s) => ({ ...s, title: "After" }),
      () => a.promise,
    );
    const failed = expect(first).rejects.toThrow("Offline");
    const second = queue.submit(
      (s) => ({ ...s, resolved: true }),
      () => b.promise,
    );
    expect(visible).toEqual({ title: "After", resolved: true });
    expect(queue.replace({ title: "Stale", resolved: false }, revision)).toBe(
      false,
    );
    a.reject(new Error("Offline"));
    await failed;
    expect(visible).toEqual({ title: "Before", resolved: true });
    b.resolve();
    await second;
    expect(queue.replace({ title: "Stale", resolved: false }, revision)).toBe(
      false,
    );
  });
  it("queues immediate Undo without dropping it", async () => {
    const save = deferred();
    let visible = false;
    const queue = new OptimisticQueue(false, (value) => {
      visible = value;
    });
    const first = queue.submit(
      () => true,
      () => save.promise,
    );
    const undo = queue.submit(
      () => false,
      async () => {},
    );
    expect(visible).toBe(false);
    save.resolve();
    await Promise.all([first, undo]);
    expect(visible).toBe(false);
    expect(queue.busy).toBe(false);
  });
  it("reconciles temporary IDs before dependent writes", async () => {
    const created = deferred<Record<string, string>>();
    let requested = "";
    type Row = { id: string; body: string };
    const queue = new OptimisticQueue<Row[]>(
      [],
      () => {},
      (rows, id) => rows.map((row) => ({ ...row, id: id(row.id) })),
    );
    const first = queue.submit(
      (rows) => [...rows, { id: "temp", body: "Hello" }],
      () => created.promise,
    );
    const edit = queue.submit(
      (rows, id) =>
        rows.map((row) =>
          row.id === id("temp") ? { ...row, body: "Edited" } : row,
        ),
      async (id) => {
        requested = id("temp");
      },
    );
    expect(queue.value[0].body).toBe("Edited");
    created.resolve({ temp: "saved" });
    await Promise.all([first, edit]);
    expect(requested).toBe("saved");
    expect(queue.value).toEqual([{ id: "saved", body: "Edited" }]);
  });
});

it("discards old-session jobs without applying late writes over the new session", async () => {
  const old = deferred();
  const next = deferred();
  let queuedRan = false;
  const queue = new OptimisticQueue("private", () => {});
  const first = queue.submit(
    () => "private edit",
    () => old.promise,
  );
  const queued = queue.submit(
    () => "queued private",
    async () => {
      queuedRan = true;
    },
  );
  const rejected = Promise.all(
    [first, queued].map((p) =>
      expect(p).rejects.toMatchObject({ name: "AbortError" }),
    ),
  );
  queue.reset("public");
  await rejected;
  const fresh = queue.submit(
    () => "new session",
    () => next.promise,
  );
  old.resolve();
  await Promise.resolve();
  expect(queue.value).toBe("new session");
  expect(queue.busy).toBe(true);
  expect(queuedRan).toBe(false);
  next.resolve();
  await fresh;
  expect(queue.value).toBe("new session");
  expect(queue.busy).toBe(false);
});
