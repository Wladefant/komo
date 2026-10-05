const apiRoots = new Set([
  "auth",
  "config",
  "health",
  "setup",
  "setup-client.js",
  "usage",
  "me",
  "threads",
  "project",
  "owner",
  "workspace",
]);

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    const root = url.pathname.split("/")[1];
    if (!apiRoots.has(root)) return env.ASSETS.fetch(request);
    // A preview can exercise its matching API version without moving live traffic.
    const header = "Cloudflare-Workers-Version-Overrides";
    const version = env.PINTHREAD_API_PREVIEW_VERSION;
    const preview = /^[a-z0-9-]+-pinthread-site\.off-brand\.workers\.dev$/.test(
      url.hostname,
    );
    if (request.headers.has(header) || version) {
      request = new Request(request);
      request.headers.delete(header);
      if (version && preview)
        request.headers.set(header, `pinthread-api="${version}"`);
    }
    // OAuth must use the registered callback, even when data uses a preview.
    // Preserve the requesting site's Origin header for the popup handoff.
    if (preview && root === "auth") {
      url.host = "pinthread.dev";
      request = new Request(url, request);
    }
    // Preserve the public origin for other setup links.
    return env.PINTHREAD_API.fetch(request);
  },
} satisfies ExportedHandler<Env & { PINTHREAD_API_PREVIEW_VERSION?: string }>;
