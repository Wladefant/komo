import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SECURITY = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src https: data: blob:; font-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>pinthread</title><style>html{color-scheme:light dark}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#fafafa;color:#1a1a1a}@media(prefers-color-scheme:dark){body{background:#171717;color:#e8e8e8}}main{max-width:40rem;margin:0 auto;padding:4rem 1.25rem}h1{font-size:2rem;letter-spacing:-.04em;margin:0 0 .5rem}p{margin:.75rem 0}code{font-size:.9em}</style></head><body><main><h1>pinthread</h1><p>Comments for your website. Point at an element, leave feedback, reply, resolve.</p><p>This page is a live demo. The widget is loaded from this server and talks to this server. Click the pinthread button, then place a comment anywhere on the page.</p><p><a href="/health">API health</a></p></main><script type="module" src="/landing.js"></script></body></html>`;

/** The browser entry for the landing page: explicit endpoint, never the package default host. */
export function landingScript(project: string) {
  return `import { initPinthread } from "/widget/index.js";\ninitPinthread({ endpoint: location.origin, project: ${JSON.stringify(project)}, repo: ${JSON.stringify(project)} });\n`;
}

/** Static landing page and widget bundle for the Node server. Returns null for every other path. */
export async function landing(
  request: { method: string; pathname: string },
  demoProject: string,
  distDir = fileURLToPath(new URL("./", import.meta.url)),
): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const { pathname } = request;
  if (pathname === "/")
    return new Response(PAGE, {
      headers: {
        ...SECURITY,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  if (pathname === "/landing.js")
    return new Response(landingScript(demoProject), {
      headers: {
        ...SECURITY,
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  const file = /^\/widget\/([\w.-]+\.js)$/.exec(pathname)?.[1];
  if (!file || file.includes("..")) return null;
  try {
    return new Response(await readFile(join(distDir, file)), {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
