import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SECURITY = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src https: data: blob:; font-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

const page = (project: string, bundle: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>pinthread</title><style>html{color-scheme:light dark}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#fafafa;color:#1a1a1a}@media(prefers-color-scheme:dark){body{background:#171717;color:#e8e8e8}}main{max-width:40rem;margin:0 auto;padding:4rem 1.25rem}h1{font-size:2rem;letter-spacing:-.04em;margin:0 0 .5rem}p{margin:.75rem 0}code{font-size:.9em}</style></head><body><main><h1>pinthread</h1><p>Comments for your website. Point at an element, leave feedback, reply, resolve.</p><p>This page is a live demo. The widget is loaded from this server and talks to this server. Click the pinthread button, then place a comment anywhere on the page.</p><p><a href="/health">API health</a></p></main><script type="module" src="${bundle}" data-project="${project}"></script></body></html>`;

const IMMUTABLE = "public, max-age=31536000, immutable";
const BUNDLE = "landing-bundle.js";
// Hash of a bundle file, remembered until the file changes on disk.
const hashes = new Map<string, { stamp: string; hash: string }>();

async function contentHash(path: string): Promise<{ body: Buffer<ArrayBuffer>; hash: string }> {
  const body = await readFile(path);
  const info = await stat(path);
  const stamp = `${info.mtimeMs}:${info.size}`;
  const known = hashes.get(path);
  if (known?.stamp === stamp) return { body, hash: known.hash };
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 12);
  hashes.set(path, { stamp, hash });
  return { body, hash };
}

const script = (body: Buffer<ArrayBuffer>, cache: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });

/**
 * Static landing page and widget bundle for the Node server. Returns null for every other path.
 *
 * The page names the bundle by content hash (`/widget/landing-bundle.<hash>.js`), served
 * immutable. The stable `/widget/<name>.js` URL keeps working for old embeds and is sent
 * `no-cache`, because Cloudflare raises any shorter max-age to its 4 hour browser TTL.
 */
export async function landing(
  request: { method: string; pathname: string },
  demoProject: string,
  distDir = fileURLToPath(new URL("./", import.meta.url)),
): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const { pathname } = request;
  if (pathname === "/") {
    let bundle = `/widget/${BUNDLE}`;
    try {
      const { hash } = await contentHash(join(distDir, BUNDLE));
      bundle = `/widget/${BUNDLE.replace(/\.js$/, `.${hash}.js`)}`;
    } catch {
      // No built bundle: keep the stable URL, which answers 404 as before.
    }
    return new Response(page(demoProject, bundle), {
      headers: {
        ...SECURITY,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }
  if (pathname === "/favicon.ico")
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  const file = /^\/widget\/([\w.-]+\.js)$/.exec(pathname)?.[1];
  if (!file || file.includes("..")) return null;
  try {
    return script(await readFile(join(distDir, file)), "no-cache");
  } catch {
    // Not a stable file: try `<name>.<hash>.js`.
  }
  const hashed = /^([\w-]+(?:\.[\w-]+)*?)\.([0-9a-f]{12})\.js$/.exec(file);
  if (hashed) {
    try {
      const { body, hash } = await contentHash(join(distDir, `${hashed[1]}.js`));
      // A hash from an older release still gets the current bundle, but never an immutable cache.
      return script(body, hash === hashed[2] ? IMMUTABLE : "no-cache");
    } catch {
      // Fall through to 404.
    }
  }
  return new Response("Not found", { status: 404 });
}
