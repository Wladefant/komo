import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error CLI modules are native ESM.
import { runProject } from "../cli/project.mjs";
let directory = "";
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});
it("exports all tables privately, carries a consistent revision, and imports in bounded batches", async () => {
  directory = await mkdtemp(join(tmpdir(), "pinthread-export-test-"));
  const calls: string[] = [];
  const users = Array.from({ length: 53 }, (_, i) => ({
    id: `user-${i}`,
    name: "Reviewer",
  }));
  await runProject(
    "export",
    { out: "feedback.json" },
    async (path: string) => {
      calls.push(path);
      return {
        rows: path.includes("table=users") ? users : [],
        next: null,
        revision: 12,
      };
    },
    { project: "source" },
    directory
  );
  expect(calls.slice(1).every((path) => path.includes("revision=12"))).toBe(
    true
  );
  const path = join(directory, "feedback.json");
  if (process.platform !== "win32") {
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  }
  expect(JSON.parse(await readFile(path, "utf8")).tables.users).toHaveLength(
    53
  );
  const batches: Array<{ kind: string; records: unknown[] }> = [];
  const result = await runProject(
    "import",
    { file: path },
    async (
      _path: string,
      _method: string,
      data: { kind: string; records: unknown[] }
    ) => {
      batches.push(data);
      return { imported: data.records.length };
    },
    { project: "destination" },
    directory
  );
  expect(result.imported).toBe(53);
  expect(batches.map((batch) => batch.records.length)).toEqual([50, 3]);
});
it("does not write a partial export when the source changes or delete the wrong project", async () => {
  directory = await mkdtemp(join(tmpdir(), "pinthread-export-test-"));
  await expect(
    runProject(
      "export",
      { out: "feedback.json" },
      async () => {
        throw Error("Comments changed during export");
      },
      { project: "source" },
      directory
    )
  ).rejects.toThrow("Comments changed");
  await expect(stat(join(directory, "feedback.json"))).rejects.toThrow();
  let called = false;
  await expect(
    runProject(
      "delete",
      { confirm: "wrong" },
      () => {
        called = true;
      },
      { project: "source" },
      directory
    )
  ).rejects.toThrow("--confirm");
  expect(called).toBe(false);
});
