import { describe, expect, it, vi } from "vitest";
import worker from "../../pinthread-site/worker/index";

describe("branded API routing", () => {
  it("pins only preview API requests to a configured version and preserves the request", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("api"));
    const version = "12345678-1234-1234-1234-123456789012";
    for (const host of [
      "precise-feedback-pinthread-site.off-brand.workers.dev",
      "pinthread.dev",
    ]) {
      const request = new Request(`https://${host}/threads?project=test`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "Cloudflare-Workers-Version-Overrides": 'pinthread-api="untrusted"',
        },
        body: "payload",
      });
      await worker.fetch(request, {
        PINTHREAD_API: { fetch },
        PINTHREAD_API_PREVIEW_VERSION: version,
      } as never);
      const forwarded = fetch.mock.lastCall![0] as Request;
      expect(forwarded.url).toBe(request.url);
      expect(forwarded.headers.get("Authorization")).toBe("Bearer test");
      expect(
        forwarded.headers.get("Cloudflare-Workers-Version-Overrides"),
      ).toBe(host === "pinthread.dev" ? null : `pinthread-api="${version}"`);
      expect(await forwarded.text()).toBe("payload");
    }
  });
  it("keeps preview OAuth on the registered callback origin without changing the caller", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("api"));
    const origin = "https://refresh-ux-pinthread-site.off-brand.workers.dev";
    const request = new Request(`${origin}/auth/google/start?project=test`, {
      method: "POST",
      headers: { Origin: origin },
      body: "{}",
    });
    await worker.fetch(request, {
      PINTHREAD_API: { fetch },
      PINTHREAD_API_PREVIEW_VERSION: "preview",
    } as never);
    const forwarded = fetch.mock.lastCall![0] as Request;
    expect(forwarded.url).toBe(
      "https://pinthread.dev/auth/google/start?project=test",
    );
    expect(forwarded.headers.get("Origin")).toBe(origin);
    expect(forwarded.headers.get("Cloudflare-Workers-Version-Overrides")).toBe(
      'pinthread-api="preview"',
    );
    expect(await forwarded.text()).toBe("{}");
  });
  it("strips client version overrides when no preview version is configured", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("api"));
    await worker.fetch(
      new Request("https://pinthread.dev/health", {
        headers: {
          "Cloudflare-Workers-Version-Overrides": 'pinthread-api="untrusted"',
        },
      }),
      { PINTHREAD_API: { fetch } } as never,
    );
    expect(
      fetch.mock.lastCall![0].headers.has(
        "Cloudflare-Workers-Version-Overrides",
      ),
    ).toBe(false);
  });
  it.each([
    "/auth/google/callback?code=test",
    "/setup",
    "/setup-client.js",
    "/threads/123/comments",
    "/config",
    "/workspace/sites",
    "/usage",
    "/health",
  ])("forwards %s without rewriting the origin", async (path) => {
    const response = new Response("api", {
      headers: { "Set-Cookie": "test=value; Secure" },
    });
    const fetch = vi.fn().mockResolvedValue(response);
    const assets = vi.fn();
    const request = new Request(`https://pinthread.dev${path}`, {
      method: "POST",
      headers: { Authorization: "Bearer test" },
      body: "payload",
    });
    const result = await worker.fetch(request, {
      PINTHREAD_API: { fetch },
      ASSETS: { fetch: assets },
    } as never);
    expect(fetch).toHaveBeenCalledWith(request);
    expect(assets).not.toHaveBeenCalled();
    expect(result).toBe(response);
    expect(await request.text()).toBe("payload");
  });
  it.each([
    "/",
    "/configuration/",
    "/install/",
    "/assets/site.js",
    "/author",
    "/projects",
  ])("keeps %s on the website", async (path) => {
    const fetch = vi.fn().mockResolvedValue(new Response("site"));
    const api = vi.fn();
    const request = new Request(`https://pinthread.dev${path}`);
    await worker.fetch(request, {
      ASSETS: { fetch },
      PINTHREAD_API: { fetch: api },
    } as never);
    expect(fetch).toHaveBeenCalledWith(request);
    expect(api).not.toHaveBeenCalled();
  });
});
