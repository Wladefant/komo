import { Pool, types, type PoolClient } from "pg";

// API timestamps, counters, and revisions are JavaScript numbers.
types.setTypeParser(20, (value) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw Error("PostgreSQL integer exceeds safe range");
  return number;
});
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Numbered PostgreSQL migrations; version N is the Nth file. Applied files are immutable.
export const POSTGRES_MIGRATIONS = [
  "001_initial.sql",
  "002_pinthread_quota_message.sql",
] as const;

/** Versions still to apply, given the applied versions. Rejects gaps and unknown versions. */
export function pendingMigrations(applied: readonly number[]): number[] {
  const latest = POSTGRES_MIGRATIONS.length;
  const have = new Set(applied);
  const top = applied.length ? Math.max(...applied) : 0;
  if (top > latest || have.size !== applied.length || have.size !== top)
    throw Error("Unsupported PostgreSQL schema version");
  return Array.from({ length: latest - top }, (_, index) => top + index + 1);
}

// Keep the D1-shaped boundary used by the API. A batch always has one transaction.
export function postgresDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  const query = async (sql: string, values: unknown[], client?: PoolClient) => {
    const text = translate(sql);
    const result = await (client ?? pool).query(text, values);
    return {
      results: result.rows,
      success: true,
      meta: { changes: result.rowCount ?? 0 },
    };
  };
  const prepare = (sql: string, values: unknown[] = []) => ({
    bind(...args: unknown[]) {
      return prepare(sql, args);
    },
    async first<T>() {
      return ((await query(sql, values)).results[0] as T | null) ?? null;
    },
    async all<T>() {
      return (await query(sql, values)) as {
        results: T[];
        success: true;
        meta: { changes: number };
      };
    },
    async run() {
      return query(sql, values);
    },
    sql,
    values,
  });
  return {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];
        for (const statement of statements)
          results.push(await query(statement.sql, statement.values, client));
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async migrate() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(7217495)");
        // Databases created before the Pinthread rename track versions in komo_schema.
        const tables = await client.query<{ legacy: string | null; current: string | null }>(
          "SELECT to_regclass('komo_schema') AS legacy, to_regclass('pinthread_schema') AS current",
        );
        if (tables.rows[0].legacy && !tables.rows[0].current)
          await client.query("ALTER TABLE komo_schema RENAME TO pinthread_schema");
        await client.query(
          "CREATE TABLE IF NOT EXISTS pinthread_schema (version integer PRIMARY KEY)",
        );
        const versions = await client.query<{ version: number }>(
          "SELECT version FROM pinthread_schema",
        );
        const pending = pendingMigrations(versions.rows.map((row) => row.version));
        for (const version of pending) {
          const path = fileURLToPath(
            new URL(`./postgres/${POSTGRES_MIGRATIONS[version - 1]}`, import.meta.url),
          );
          await client.query(await readFile(path, "utf8"));
          await client.query("INSERT INTO pinthread_schema(version) VALUES($1)", [version]);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export function translate(sql: string) {
  let result = sql.replace(/\bINSERT OR IGNORE INTO\b/gi, "INSERT INTO");
  const ignore = result !== sql;
  result = result.replace(/\b([a-z]+)\.rowid\b/gi, "$1.seq");
  result = result.replace("SET count=count+1", "SET count=rate_limits.count+1");
  result = result.replace(
    /json_each\(\?\)/gi,
    "jsonb_array_elements_text(?::jsonb) AS items(value)",
  );
  result = result.replace(/\bMAX\(0,([^()]+)\)/gi, "GREATEST(0,$1)");
  if (ignore) {
    const returning = /\s+RETURNING\b/i.exec(result);
    const at = returning?.index ?? result.length;
    result = result.slice(0, at) + " ON CONFLICT DO NOTHING" + result.slice(at);
  }
  let parameter = 0;
  return result.replace(/\?/g, () => `$${++parameter}`);
}
