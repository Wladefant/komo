import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const source = dirname(fileURLToPath(import.meta.url));
const repo = resolve(source, "../../..");
const target = resolve(repo, "../pinthread-promo");
const assets = [".claude/skills", ".agents/skills"]
  .map((dir) => resolve(repo, dir, "product-video/assets"))
  .find(existsSync);
if (!assets)
  throw Error(
    "Install the purchased product-video skill in .claude/skills or .agents/skills first.",
  );
mkdirSync(resolve(target, "src"), { recursive: true });
for (const name of [
  "build.mjs",
  "qc.mjs",
  "scan-wallclock.mjs",
  "remotion.config.ts",
  "tsconfig.json",
])
  cpSync(resolve(assets, name), resolve(target, name));
for (const name of [
  "camera.ts",
  "motion.ts",
  "scenes.ts",
  "text.ts",
  "cursors.tsx",
])
  cpSync(resolve(assets, name), resolve(target, "src", name));
for (const name of readdirSync(source))
  if (/\.(tsx?|css|json)$/.test(name) && !name.startsWith("package"))
    cpSync(resolve(source, name), resolve(target, "src", name));
for (const name of ["package.json", "package-lock.json"])
  cpSync(resolve(source, name), resolve(target, name));
console.log(`Prepared ${target}. Run npm ci there, then node build.mjs.`);

// The five-word opening and interaction holds need 626 frames; retain a 21s cap.
const sceneHelper = resolve(target, "src/scenes.ts");
writeFileSync(
  sceneHelper,
  readFileSync(sceneHelper, "utf8")
    .replace("const MAX_CLIP = 75", "const MAX_CLIP = 120")
    .replace("const MAX_FILM = 450", "const MAX_FILM = 630"),
);
