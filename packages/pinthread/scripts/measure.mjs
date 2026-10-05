import { build } from "esbuild";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const directory = await mkdtemp(`${tmpdir()}/pinthread-size-`);
const result = await build({
  entryPoints: ["dist/index.js"],
  outdir: directory,
  bundle: true,
  splitting: true,
  minify: true,
  format: "esm",
  metafile: true,
});
const outputs = result.metafile.outputs;
const entry = Object.keys(outputs).find(
  (path) => outputs[path].entryPoint === "dist/index.js"
);
const initial = new Set();
function visit(path) {
  if (initial.has(path)) return;
  initial.add(path);
  for (const item of outputs[path].imports)
    if (!item.external && item.kind !== "dynamic-import") visit(item.path);
}
visit(entry);
async function sizes(paths) {
  const files = await Promise.all(
    [...paths]
      .filter((path) => path.endsWith(".js"))
      .map((path) => readFile(resolve(path)))
  );
  return {
    raw: files.reduce((sum, b) => sum + b.length, 0),
    gzip: files.reduce((sum, b) => sum + gzipSync(b).length, 0),
    brotli: files.reduce((sum, b) => sum + brotliCompressSync(b).length, 0),
  };
}
const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    encoding: "utf8",
  })
);
const report = {
  initial: await sizes(initial),
  allFeatures: await sizes(Object.keys(outputs)),
  package: {
    tarball: pack.size,
    unpacked: pack.unpackedSize,
    files: pack.entryCount,
  },
};
console.log(JSON.stringify(report, null, 2));
await writeFile(
  resolve(directory, "report.json"),
  JSON.stringify(report, null, 2)
);
if (report.initial.gzip > 100_000 || report.allFeatures.gzip > 196_000)
  throw new Error("pinthread exceeds its production consumer bundle budget.");
