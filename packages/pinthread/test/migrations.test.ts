import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { POSTGRES_MIGRATIONS, pendingMigrations } from "../server/postgres";

describe("database migrations", () => {
  it("SQLite migration 0016 raises pinthread_quota_exceeded on quota breach", async () => {
    const migrationsDir = fileURLToPath(
      new URL("../server/migrations", import.meta.url)
    );
    const files = (await readdir(migrationsDir)).sort();
    expect(files).toContain("0016_pinthread_quota_message.sql");

    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");

    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf8");
      db.exec(sql);
    }

    // Set up project and quota (max 1 comment)
    db.exec(`
      INSERT INTO users(id, name, verified) VALUES('google:owner', 'Owner', 1);
      INSERT INTO workspaces(id, owner_id, repo, origins, created_at)
        VALUES('p1', 'google:owner', 'repo', '["http://localhost"]', 1);
      INSERT INTO project_quotas(project, max_comments, max_bytes, comments, bytes)
        VALUES('p1', 1, 100000, 0, 0);
      INSERT INTO threads(id, project, repo, branch, page, anchor, created_at, updated_at)
        VALUES('t1', 'p1', 'repo', 'main', '/', '{}', 1, 1);
    `);

    // Insert comment 1 (within quota of 1) -> succeeds
    db.exec(`
      INSERT INTO comments(id, thread_id, user_id, body, created_at)
        VALUES('c1', 't1', 'google:owner', 'hello', 1);
    `);

    // Insert comment 2 (breaches quota: 2 > 1) -> must raise pinthread_quota_exceeded
    let commentInsertError: Error | undefined;
    try {
      db.exec(`
        INSERT INTO comments(id, thread_id, user_id, body, created_at)
          VALUES('c2', 't1', 'google:owner', 'second comment', 2);
      `);
    } catch (err: any) {
      commentInsertError = err;
    }
    expect(commentInsertError).toBeDefined();
    expect(commentInsertError!.message).toContain("pinthread_quota_exceeded");
    expect(commentInsertError!.message).not.toContain("komo_quota_exceeded");

    // Test thread_quota_insert trigger on quota breach
    let threadInsertError: Error | undefined;
    try {
      db.exec(`
        INSERT INTO threads(id, project, repo, branch, page, anchor, created_at, updated_at)
          VALUES('t2', 'p1', 'repo', 'main', '/', '${"x".repeat(100000)}', 1, 1);
      `);
    } catch (err: any) {
      threadInsertError = err;
    }
    expect(threadInsertError).toBeDefined();
    expect(threadInsertError!.message).toContain("pinthread_quota_exceeded");
    expect(threadInsertError!.message).not.toContain("komo_quota_exceeded");

    // Test member_quota_insert trigger on quota breach
    db.exec("UPDATE project_quotas SET max_bytes=100 WHERE project='p1';");
    let memberInsertError: Error | undefined;
    try {
      db.exec(`
        INSERT INTO project_members(project, user_id) VALUES('p1', 'google:owner');
      `);
    } catch (err: any) {
      memberInsertError = err;
    }
    expect(memberInsertError).toBeDefined();
    expect(memberInsertError!.message).toContain("pinthread_quota_exceeded");
    expect(memberInsertError!.message).not.toContain("komo_quota_exceeded");
  });

  it("Postgres pendingMigrations calculates versions and enforces sequence", () => {
    expect(POSTGRES_MIGRATIONS).toEqual([
      "001_initial.sql",
      "002_pinthread_quota_message.sql",
    ]);
    expect(pendingMigrations([])).toEqual([1, 2]);
    expect(pendingMigrations([1])).toEqual([2]);
    expect(pendingMigrations([1, 2])).toEqual([]);
    expect(() => pendingMigrations([2])).toThrow(
      "Unsupported PostgreSQL schema version"
    );
    expect(() => pendingMigrations([1, 1])).toThrow(
      "Unsupported PostgreSQL schema version"
    );
    expect(() => pendingMigrations([3])).toThrow(
      "Unsupported PostgreSQL schema version"
    );
  });

  it("Postgres migration 002 defines komo_quota with pinthread_quota_exceeded", async () => {
    const path = fileURLToPath(
      new URL("../server/postgres/002_pinthread_quota_message.sql", import.meta.url)
    );
    const sql = await readFile(path, "utf8");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION komo_quota");
    expect(sql).toContain("RAISE EXCEPTION 'pinthread_quota_exceeded';");
    expect(sql).not.toContain("komo_quota_exceeded");
  });
});
