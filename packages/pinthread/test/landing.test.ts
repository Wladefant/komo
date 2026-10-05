import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { landing, landingScript } from "../server/landing";

const get = (pathname: string, dist?: string) =>
  landing({ method: "GET", pathname }, "pinthread_demo", dist);

describe("node landing page", () => {
  it("serves a real HTML page at /", async () => {
    const response = await get("/");
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toContain("text/html");
    const html = await response!.text();
    expect(html).toContain('src="/landing.js"');
    expect(html).not.toContain("pinthread.dev");
  });

  it("points the widget at its own origin and never at the package default host", async () => {
    const script = await (await get("/landing.js"))!.text();
    expect(script).toBe(landingScript("pinthread_demo"));
    expect(script).toContain("endpoint: location.origin");
    expect(script).toContain('project: "pinthread_demo"');
    expect(script).not.toContain("pinthread.dev");
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

  it("leaves API routes and non-GET methods to the worker", async () => {
    expect(await get("/threads")).toBeNull();
    expect(await get("/health")).toBeNull();
    expect(
      await landing({ method: "POST", pathname: "/" }, "pinthread_demo"),
    ).toBeNull();
  });
});
