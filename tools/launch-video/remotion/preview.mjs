import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const source = dirname(fileURLToPath(import.meta.url)),
  repo = resolve(source, "../../.."),
  runtime = resolve(repo, "../pinthread-promo");
const reviewUrl =
  process.argv.find((arg) => arg.startsWith("--review-url="))?.slice(13) ||
  "https://github.com/Wladefant/pinthread/pulls";
if (
  !/^https:\/\/github\.com\/tjcages\/pinthread\/(?:pull\/\d+|pulls)$/.test(reviewUrl)
)
  throw new Error("Use a pinthread GitHub pull request URL.");
const out = resolve(repo, "packages/pinthread-site/dist/promo");
mkdirSync(out, { recursive: true });
copyFileSync(resolve(runtime, "out/film.mp4"), resolve(out, "pinthread-promo.mp4"));
copyFileSync(resolve(runtime, "out/logo.png"), resolve(out, "poster.png"));
writeFileSync(
  resolve(out, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>pinthread — Figma comments for any site</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f4f9;color:#242128;font-family:Helvetica,Arial,sans-serif}main{max-width:1440px;margin:0 auto;padding:34px 32px}header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:24px}h1{font-size:28px;letter-spacing:-1.4px;font-weight:500;margin:0}header span{color:#84778f;font-size:13px}video{width:100%;aspect-ratio:16/9;display:block;border-radius:18px;background:#f6f4f9;box-shadow:0 4px 30px #2513310b}nav{display:flex;gap:24px;align-items:center;flex-wrap:wrap;padding:24px 0}a{color:inherit;text-decoration:none;font-size:14px}a:first-child{padding:12px 18px;background:#e9e0f6;border-radius:30px}p{font-size:12px;color:#827789}</style><main><header><h1>pinthread</h1><span>20.9 seconds · Remotion · 1080p</span></header><video controls autoplay muted loop playsinline poster="poster.png" src="pinthread-promo.mp4" aria-label="pinthread — Figma comments for any site"></video><nav><a href="pinthread-promo.mp4" download>Download MP4 ↗</a><a href="${reviewUrl}">Review source ↗</a></nav><p>Fixture feedback. Silent review cut.</p></main></html>`,
);
console.log("Preview-only /promo/ created.");
