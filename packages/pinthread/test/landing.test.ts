import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { landing } from "../server/landing";

const get = (pathname: string, dist?: string) =>
  landing({ method: "GET", pathname }, "pinthread_demo", dist);

describe("node landing page", () => {
  it("serves a real HTML page at /", async () => {
    const dist = await mkdtemp(join(tmpdir(), "pt-dist-"));
    await writeFile(join(dist, "landing-bundle.js"), "export {};");
    const response = await get("/", dist);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toContain("text/html");
    const html = await response!.text();
    expect(html).toMatch(
      /src="\/widget\/landing-bundle\.[0-9a-f]{12}\.js" data-project="pinthread_demo"/,
    );
    expect(html).not.toContain("pinthread.dev");
  });

  it("serves bundle files from the dist directory only", async () => {
    const dist = await mkdtemp(join(tmpdir(), "pt-dist-"));
    await writeFile(join(dist, "index.js"), "export const ok = 1;");
    expect(await (await get("/widget/index.js", dist))!.text()).toBe(
      "export const ok = 1;",
    );
    expect((await get("/widget/missing.js", dist))?.status).toBe(404);
    expect(await get("/widget/../node.mjs", dist)).toBeNull();
    expect(await get("/widget/%2e%2e/secret.js", dist)).toBeNull();
    expect(await get("/widget/nested/index.js", dist)).toBeNull();
  });

  it("names the bundle by content hash and serves that URL immutable", async () => {
    const dist = await mkdtemp(join(tmpdir(), "pt-dist-"));
    await writeFile(join(dist, "landing-bundle.js"), "export const v = 1;");
    const hash = createHash("sha256")
      .update("export const v = 1;")
      .digest("hex")
      .slice(0, 12);
    const html = await (await get("/", dist))!.text();
    expect(html).toContain(`src="/widget/landing-bundle.${hash}.js"`);
    const hashed = await get(`/widget/landing-bundle.${hash}.js`, dist);
    expect(hashed?.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(await hashed!.text()).toBe("export const v = 1;");

    // A new release changes the URL the page names.
    await writeFile(join(dist, "landing-bundle.js"), "export const v = 22;");
    const next = await (await get("/", dist))!.text();
    expect(next).not.toContain(`landing-bundle.${hash}.js`);
  });

  it("keeps the stable and stale-hash URLs working without immutable caching", async () => {
    const dist = await mkdtemp(join(tmpdir(), "pt-dist-"));
    await writeFile(join(dist, "landing-bundle.js"), "export const v = 2;");
    const stable = await get("/widget/landing-bundle.js", dist);
    expect(stable?.status).toBe(200);
    expect(stable?.headers.get("cache-control")).toBe("no-cache");
    const stale = await get("/widget/landing-bundle.0123456789ab.js", dist);
    expect(stale?.status).toBe(200);
    expect(stale?.headers.get("cache-control")).toBe("no-cache");
    expect((await get("/widget/other.0123456789ab.js", dist))?.status).toBe(404);
  });

  it("answers /favicon.ico with 204 and no body", async () => {
    const response = await get("/favicon.ico");
    expect(response?.status).toBe(204);
    expect(await response!.text()).toBe("");
  });

  it("leaves API routes and non-GET methods to the worker", async () => {
    expect(await get("/threads")).toBeNull();
    expect(await get("/health")).toBeNull();
    expect(
      await landing({ method: "POST", pathname: "/" }, "pinthread_demo"),
    ).toBeNull();
  });
});
