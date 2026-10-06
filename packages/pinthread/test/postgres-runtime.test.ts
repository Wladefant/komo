import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { postgresDatabase } from "../server/postgres";
import worker from "../server/index";

vi.mock("../server/setup-client.txt", () => ({ default: "" }));
const connection = process.env.PINTHREAD_TEST_POSTGRES_URL;
const run = connection ? it : it.skip;
const schema = `pinthread_test_${crypto.randomUUID().replaceAll("-", "")}`;
let admin: Pool;
let db: ReturnType<typeof postgresDatabase>;
let env: Env;

beforeAll(async () => {
  if (!connection) return;
  admin = new Pool({ connectionString: connection });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(connection);
  url.searchParams.set("options", `-c search_path=${schema}`);
  db = postgresDatabase(url.href);
  await db.migrate();
  env = {
    DB: db,
    PROJECTS: JSON.stringify({
      review: { repo: "team/site", origins: ["http://localhost:3000"] },
    }),
  } as unknown as Env;
});
afterAll(async () => {
  if (!connection) return;
  await db.close();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

run(
  "Node PostgreSQL preserves quota rollback, API protocol, and deletion accounting",
  async () => {
    const request = async (
      path: string,
      method = "GET",
      body?: unknown,
      token?: string,
    ) => {
      const response = await worker.fetch(
        new Request(
          `http://localhost:8080${path}?project=review&repo=team%2Fsite&branch=pr-42`,
          {
            method,
            headers: {
              Origin: "http://localhost:3000",
              ...(body ? { "Content-Type": "application/json" } : {}),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
          },
        ) as unknown as Parameters<typeof worker.fetch>[0],
        env,
        { waitUntil: () => {} } as unknown as ExecutionContext,
      );
      return {
        status: response.status,
        data: (await response.json()) as Record<string, any>,
      };
    };
    const reviewer = await request("/auth/guest", "POST", { name: "Reviewer" });
    const bot = await request("/auth/guest", "POST", { name: "Bot" });
    expect(reviewer.status).toBe(201);
    expect(bot.status).toBe(201);
    await db
      .prepare(
        "INSERT INTO project_quotas(project,max_comments,max_bytes) VALUES(?,?,?)",
      )
      .bind("review", 1, 100000)
      .run();
    const anchor = {
      x: 0,
      y: 0,
      width: 0.4,
      height: 0.2,
      pageX: 0,
      pageY: 10,
      viewportWidth: 1200,
      selector: "#hero",
      text: "Hero",
    };
    const first = await request(
      "/threads",
      "POST",
      { body: "Fix this", page: "/preview", anchor },
      reviewer.data.token,
    );
    expect(first.status).toBe(201);
    const blocked = await request(
      "/threads",
      "POST",
      { body: "Blocked", page: "/preview", anchor },
      reviewer.data.token,
    );
    expect(blocked.status).toBe(409);
    const reply = await request(
      `/threads/${first.data.id}/comments`,
      "POST",
      { body: "Fixed" },
      bot.data.token,
    );
    // The one-comment quota also applies to replies.
    expect(reply.status).toBe(409);
    await db
      .prepare("UPDATE project_quotas SET max_comments=? WHERE project=?")
      .bind(2, "review")
      .run();
    expect(
      (
        await request(
          `/threads/${first.data.id}/comments`,
          "POST",
          { body: "Fixed" },
          bot.data.token,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await request(
          `/threads/${first.data.id}/comments/${first.data.commentId}/reactions`,
          "POST",
          { emoji: "👍", active: true },
          bot.data.token,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `/threads/${first.data.id}`,
          "PATCH",
          { resolved: true },
          bot.data.token,
        )
      ).status,
    ).toBe(200);
    const listed = await request("/threads");
    expect(listed.data.threads[0].resolved).toBe(true);
    expect(listed.data.threads[0].comments).toHaveLength(2);
    expect(typeof listed.data.threads[0].createdAt).toBe("number");
    expect(typeof listed.data.revision).toBe("number");
    const deleted = await db
      .prepare(
        "DELETE FROM threads WHERE project=? AND resolved=1 AND id IN (SELECT value FROM json_each(?)) RETURNING id",
      )
      .bind("review", JSON.stringify([first.data.id]))
      .all<{ id: string }>();
    expect(deleted.results).toEqual([{ id: first.data.id }]);
    expect(
      await db
        .prepare("SELECT comments,bytes FROM project_quotas WHERE project=?")
        .bind("review")
        .first<{ comments: number; bytes: number }>(),
    ).toEqual({ comments: 0, bytes: 0 });
  },
);


run(
  "PostgreSQL migration 002 renames legacy komo_schema, applies version 2, and raises pinthread_quota_exceeded",
  async () => {
    const legacySchema = `legacy_${crypto.randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${legacySchema}`);
    const legacyUrl = new URL(connection!);
    legacyUrl.searchParams.set("options", `-c search_path=${legacySchema}`);
    const legacyDb = postgresDatabase(legacyUrl.href);

    const client = await admin.connect();
    try {
      await client.query(`SET search_path TO ${legacySchema}`);
      // Simulate legacy database before rename: tracked in komo_schema with version 1
      await client.query("CREATE TABLE komo_schema (version integer PRIMARY KEY)");
      await client.query("INSERT INTO komo_schema (version) VALUES (1)");
      const sql001 = await readFile(
        fileURLToPath(new URL("../server/postgres/001_initial.sql", import.meta.url)),
        "utf8",
      );
      await client.query(sql001);

      await client.query(
        "INSERT INTO users(id,name,verified) VALUES('google:u1','User 1',1)",
      );
      await client.query(
        "INSERT INTO workspaces(id,owner_id,repo,origins,created_at) VALUES('p1','google:u1','r1','[]',1)",
      );
      await client.query(
        "INSERT INTO project_quotas(project,max_comments,max_bytes,comments,bytes) VALUES('p1',1,100000,0,0)",
      );

      // Before migration 002: komo_quota raises komo_quota_exceeded
      let beforeErr: any;
      try {
        await client.query("SELECT komo_quota('p1', 2, 0)");
      } catch (err: any) {
        beforeErr = err;
      }
      expect(beforeErr?.message).toContain("komo_quota_exceeded");

      // Run migrate(): should rename komo_schema to pinthread_schema and apply 002
      await legacyDb.migrate();

      const tables = await client.query<{ legacy: string | null; current: string | null }>(
        "SELECT to_regclass('komo_schema') AS legacy, to_regclass('pinthread_schema') AS current",
      );
      expect(tables.rows[0].legacy).toBeNull();
      expect(tables.rows[0].current).not.toBeNull();

      const versions = await client.query<{ version: number }>(
        "SELECT version FROM pinthread_schema ORDER BY version",
      );
      expect(versions.rows.map((r) => r.version)).toEqual([1, 2]);

      // After migration 002: komo_quota raises pinthread_quota_exceeded
      let afterErr: any;
      try {
        await client.query("SELECT komo_quota('p1', 2, 0)");
      } catch (err: any) {
        afterErr = err;
      }
      expect(afterErr?.message).toContain("pinthread_quota_exceeded");
      expect(afterErr?.message).not.toContain("komo_quota_exceeded");
    } finally {
      client.release();
      await legacyDb.close();
      await admin.query(`DROP SCHEMA ${legacySchema} CASCADE`);
    }
  },
);
