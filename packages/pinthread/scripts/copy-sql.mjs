import { cp, mkdir } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
await mkdir(`${root}dist/postgres`, { recursive: true });
await cp(`${root}server/postgres`, `${root}dist/postgres`, {
  recursive: true,
  filter: (source) => extname(source) === ".sql" || extname(source) === "",
});
