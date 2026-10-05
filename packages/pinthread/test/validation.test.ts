import { describe, expect, it } from "vitest";
import {
  anchorValue,
  originAllowed,
  pagePath,
  previewPattern,
  cliReturnOrigin,
} from "../server/validation";
const anchor = {
  selector: "#hero",
  text: "Workers",
  x: 0.2,
  y: 0.3,
  width: 0.2,
  height: 0.1,
  pageX: 200,
  pageY: 300,
  viewportWidth: 1200,
};
describe("project and anchor boundaries", () => {
  it("restricts wildcard origins to one DNS label", () => {
    const allowed = ["https://*.review.pages.dev", "http://localhost:4321"];
    expect(originAllowed("https://abc.review.pages.dev", allowed)).toBe(true);
    for (const origin of [
      "https://review.pages.dev.evil.com",
      "https://a.b.review.pages.dev",
      "https://abc.review.pages.dev/path",
      "null",
      "http://abc.review.pages.dev",
    ])
      expect(originAllowed(origin, allowed)).toBe(false);
  });
  it("rejects cross-origin and query-bearing page paths", () => {
    for (const page of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "/page?token=secret",
      "/page#hash",
    ])
      expect(() => pagePath(page)).toThrow();
    expect(pagePath("/products/workers")).toBe("/products/workers");
    expect(pagePath("/products/workers/")).toBe("/products/workers");
    expect(pagePath("/")).toBe("/");
  });
  it("rejects non-finite and out-of-range geometry", () => {
    for (const value of [
      { x: NaN },
      { width: 2 },
      { height: -0.1 },
      { pageY: Infinity },
      { x: 0.9, width: 0.5 },
    ])
      expect(() => anchorValue({ ...anchor, ...value })).toThrow();
    expect(anchorValue(anchor)).toMatchObject(anchor);
  });
  it("preserves the explicit moved-indicator flag across storage", () => {
    expect(anchorValue({ ...anchor, unstacked: true }).unstacked).toBe(true);
    expect(anchorValue(anchor).unstacked).toBeUndefined();
    expect(
      anchorValue({ ...anchor, unstacked: "true" }).unstacked,
    ).toBeUndefined();
  });
  it("drops unsafe source paths", () => {
    expect(
      anchorValue({ ...anchor, source: "../secret" }).source,
    ).toBeUndefined();
    expect(
      anchorValue({ ...anchor, source: "src/pages/index.astro" }).source,
    ).toBe("src/pages/index.astro");
  });
});

describe("CLI OAuth return origin", () => {
  it("only permits an exact loopback origin on an unprivileged port", () => {
    expect(cliReturnOrigin(undefined, "https://site.example")).toBe(
      "https://site.example",
    );
    expect(
      cliReturnOrigin("http://127.0.0.1:54321", "https://site.example"),
    ).toBe("http://127.0.0.1:54321");
    for (const value of [
      "https://evil.example",
      "http://localhost:4321",
      "http://127.0.0.1:80",
      "http://127.0.0.1:4321/path",
      "http://127.0.0.1:4321#fragment",
      "http://user@127.0.0.1:4321",
      "http://127.0.0.1.evil.example:4321",
      true,
    ])
      expect(() => cliReturnOrigin(value, "https://site.example")).toThrow();
  });
});

it("derives a preview pattern only for Cloudflare Pages projects", () => {
  const pages = previewPattern("https://abc123.shop.pages.dev")!;
  expect(pages).toBe("https://*.shop.pages.dev");
  expect(previewPattern("https://shop.pages.dev")).toBe(pages);
  expect(originAllowed("https://feature-x.shop.pages.dev", [pages])).toBe(true);
  expect(originAllowed("https://abc.other.pages.dev", [pages])).toBe(false);
  for (const origin of [
    "https://shop.vercel.app",
    "https://deploy-preview-4--shop.netlify.app",
    "https://shop.example.com",
    "http://abc.shop.pages.dev",
  ])
    expect(previewPattern(origin)).toBeUndefined();
});

it("bounds context fields, rejects malformed values, and drops unknown data", () => {
  expect(anchorValue(anchor).context).toBeUndefined();
  expect(
    anchorValue({
      ...anchor,
      context: { tag: "button", privatePayload: "omit" },
    }).context,
  ).toEqual({ tag: "button" });
  for (const context of [
    null,
    [],
    "button",
    { tag: 1 },
    { scope: "x".repeat(2001) },
    { label: "x".repeat(161) },
  ])
    expect(() => anchorValue({ ...anchor, context })).toThrow(
      "Invalid anchor context",
    );
});
