import { build } from "esbuild";
import { mkdir, writeFile, readFile, rm, cp } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pages, escape } from "../src/content.mjs";
const require = createRequire(
  new URL("../../pinthread/package.json", import.meta.url)
);
// Lucide (ISC) icon data, serialized at build time; the site ships SVG strings.
const lucide = require("lucide");
const names = {
  copy: "Copy",
  check: "Check",
  pointer: "MousePointer2",
  multiplayer: "MousePointer",
  comment: "MessageCircle",
  code: "CodeXml",
  plus: "Plus",
  menu: "Menu",
  close: "X",
  arrow: "ArrowUpRight",
  pause: "CirclePause",
  play: "CirclePlay",
  replay: "RefreshCcw",
  dots: "Ellipsis",
  smile: "Smile",
  terminal: "Terminal",
  cloud: "Cloud",
  overview: "LayoutDashboard",
  install: "Download",
  settings: "SlidersHorizontal",
  help: "CircleHelp",
};
const svgAttributes = (values) =>
  Object.entries(values)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
const icons = Object.fromEntries(
  Object.entries(names).map(([key, name]) => {
    const node = lucide[name];
    if (!node) throw new Error(`Unknown Lucide icon ${name}`);
    const shapes = node
      .map(([tag, values]) => `<${tag}${svgAttributes(values)}></${tag}>`)
      .join("");
    return [
      key,
      `<svg${svgAttributes({
        xmlns: "http://www.w3.org/2000/svg",
        width: 18,
        height: 18,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
      })}>${shapes}</svg>`,
    ];
  })
);
const decorate = (html) =>
  html.replace(
    /<span data-icon="(\w+)"><\/span>/g,
    (_, name) =>
      `<span class="glyph" data-icon="${name}">${icons[name] ?? ""}</span>`
  );
const out = new URL("../dist/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const nav = pages.filter((p) => !["/privacy/", "/terms/"].includes(p.path));
const navIcons = {
  "/": "overview",
  "/install/": "install",
  "/configuration/": "settings",
  "/hosting/": "cloud",
  "/agent-prompts/": "code",
  "/faq/": "help",
};
const logoSvg = await readFile(new URL("../src/logo.svg", import.meta.url), "utf8");
const logo = (id) => `<span class="pinthread-logo" data-motion="soft" aria-hidden="true"><img class="pinthread-symbol" src="/favicon.svg" width="24" height="24" alt="">${logoSvg.replaceAll("pinthread-mask", `pinthread-mask-${id}`).replace('class="wordmark"', 'class="pinthread-wordmark"').replace('role="img" aria-label="pinthread"', 'aria-hidden="true"')}</span>`;
const homeSocial = {
  title: "pinthread — Package — Off brand",
  description: "Leave feedback anywhere on your website. Comment, reply, react, and copy the context into your coding agent.",
  video: "https://offbr.co/media/tools/9b010af3-9cbd-4561-8397-5c45d80e485d-1790364980425.mp4",
};
const head = (title, description, path) =>
  `<meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escape(title)} — pinthread</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="https://pinthread.dev${path}"><meta property="og:title" content="${escape(path === "/" ? homeSocial.title : `${title} — pinthread`)}"><meta property="og:description" content="${escape(path === "/" ? homeSocial.description : description)}"><meta property="og:type" content="website">${path === "/" ? `<meta property="og:site_name" content="Off brand"><meta property="og:url" content="https://pinthread.dev/"><meta property="og:video" content="${homeSocial.video}"><meta property="og:video:url" content="${homeSocial.video}"><meta property="og:video:secure_url" content="${homeSocial.video}"><meta property="og:video:type" content="video/mp4"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(homeSocial.title)}"><meta name="twitter:description" content="${escape(homeSocial.description)}">` : ""}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/app-icon.png"><link rel="stylesheet" href="/assets/site.css"><script type="module" src="/assets/site.js"></script>`;
for (const page of pages) {
  const html = `<!doctype html><html lang="en"><head>${head(page.title, page.description, page.path)}</head><body class="${page.path === "/" ? "home" : "docs"}"><a class="skip" href="#main">Skip to content</a><div id="site-content"><header class="mobile-header"><a class="brand" href="/" aria-label="pinthread home">${logo("mobile")}</a><button class="nav-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="navigation"><span class="nav-menu-icon">${icons.menu}</span></button></header><header class="home-header"><a class="home-brand" href="/" aria-label="pinthread home">${logo("header")} <span>by Off brand</span></a><nav aria-label="Resources"><a href="/install/">Docs</a><a href="https://www.npmjs.com/package/pinthread">npm ${icons.arrow}</a></nav></header><div class="layout"><aside id="navigation" class="navigation"><a class="brand" href="/" aria-label="pinthread home">${logo("navigation")}</a><nav aria-label="Main navigation">${nav.map((p) => `<a href="${p.path}" ${p.path === page.path ? 'aria-current="page"' : ""}>${icons[navIcons[p.path]]}<span>${p.label}</span></a>`).join("")}</nav><a class="offbrand-link" href="https://offbr.co"><strong>Off brand</strong></a><a class="version" href="https://www.npmjs.com/package/pinthread">npm · pinthread</a><button class="mobile-nav-close" data-nav-close>${icons.close}<span>Close menu</span></button></aside><main id="main" class="document ${page.path === "/" ? "overview" : ""}">${decorate(page.body)}<footer><span>© ${new Date().getFullYear()} Off brand</span><div><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="mailto:ty@offbr.co">Contact</a></div></footer></main></div></div><template id="play-icon">${icons.play}</template><template id="check-icon">${icons.check}</template><div id="copy-status" class="sr-only" role="status"></div></body></html>`;
  const dir = new URL(`.${page.path}`, out);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL("index.html", dir), html);
}
await cp(new URL("../public/", import.meta.url), out, { recursive: true });
await mkdir(new URL("playground/", out), { recursive: true });
await writeFile(
  new URL("playground/index.html", out),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"><title>pinthread live demo</title></head><body><a href="/">Try pinthread</a></body></html>`
);
await writeFile(
  new URL("404.html", out),
  `<!doctype html><html lang="en"><head>${head("Page not found", "Return to pinthread.", "/")}</head><body><main class="not-found"><a class="brand" href="/" aria-label="pinthread home">${logo("mobile")}</a><h1>Nothing here yet.</h1><a href="/">Back to pinthread ${icons.arrow}</a></main></body></html>`
);
await writeFile(
  new URL("_headers", out),
  `/fake-github/*\n  ! Content-Security-Policy\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://github.githubassets.com; img-src 'self' data: https:; font-src 'self' https://github.githubassets.com; connect-src 'self' https://pinthread.dev; object-src 'none'; frame-ancestors 'self'\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://cdn.jsdelivr.net https://pinthread.dev; frame-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'\n/assets/*\n  Cache-Control: public, max-age=3600\n`
);
await writeFile(
  new URL("robots.txt", out),
  "User-agent: *\nAllow: /\nDisallow: /fake-github/\nSitemap: https://pinthread.dev/sitemap.xml\n"
);
await writeFile(
  new URL("sitemap.xml", out),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((p) => `<url><loc>https://pinthread.dev${p.path}</loc></url>`).join("")}</urlset>`
);
const bundle = await build({
  metafile: true,
  entryNames: "[name]-[hash]",
  entryPoints: {
    site: fileURLToPath(new URL("../src/site.ts", import.meta.url)),
    "demo-github": fileURLToPath(
      new URL("../src/demo/github.ts", import.meta.url)
    ),
  },
  outdir: fileURLToPath(new URL("assets/", out)),
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
});
const [scriptPath, scriptOutput] = Object.entries(bundle.metafile.outputs).find(
  ([path, output]) =>
    path.endsWith(".js") && output.entryPoint?.endsWith("src/site.ts")
);
const assetUrl = (path) => `/assets/${path.split("/").pop()}`;
for (const path of [
  ...pages.map((page) => `.${page.path}index.html`),
  "404.html",
]) {
  const file = new URL(path, out);
  const html = await readFile(file, "utf8");
  await writeFile(
    file,
    html
      .replaceAll("/assets/site.js", assetUrl(scriptPath))
      .replaceAll("/assets/site.css", assetUrl(scriptOutput.cssBundle))
  );
}
const demoScript = Object.keys(bundle.metafile.outputs).find((path) =>
  /demo-github-[^/]*\.js$/.test(path)
);
const demoDir = new URL("fake-github/", out);
await mkdir(demoDir, { recursive: true });
await writeFile(
  new URL("index.html", demoDir),
  (await readFile(new URL("../src/demo/github.html", import.meta.url), "utf8")).replace(
    "</body>",
    `<script type="module" src="${assetUrl(demoScript)}"></script></body>`
  )
);
console.log(`Built ${pages.length} pages with the shared pinthread demo.`);
