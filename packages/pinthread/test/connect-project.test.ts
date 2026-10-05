// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  connectProject,
  rememberProject,
  resumeProject,
  setupSites,
} from "../src/connect-project";
import type { CommentsOptions } from "../src/types";
const options: CommentsOptions = {
  endpoint: "https://pinthread.example",
  project: "setup_request",
  repo: "owner/site",
  branch: "shared",
  onboarding: { inProject: true, code: "request" },
};
const result = {
  type: "pinthread:setup",
  code: "request",
  project: `pinthread_${"a".repeat(32)}`,
  repo: "owner/site",
  token: "project-token",
  user: { id: "google:owner", name: "Owner", verified: true },
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});
it("accepts only the current popup, service origin and setup code", async () => {
  vi.useFakeTimers();
  const popup = {
    closed: false,
    close: vi.fn(),
    location: { href: "" },
  } as unknown as Window;
  vi.spyOn(window, "open").mockReturnValue(popup);
  const pending = connectProject(options, new AbortController().signal);
  const deliver = (origin: string, source: Window | null, data = result) =>
    window.dispatchEvent(new MessageEvent("message", { origin, source, data }));
  deliver("https://attacker.example", popup);
  deliver("https://pinthread.example", window);
  deliver("https://pinthread.example", popup, { ...result, code: "wrong" });
  expect(popup.close).not.toHaveBeenCalled();
  expect(new URL(popup.location.href).pathname).toBe("/setup/connect");
  deliver("https://pinthread.example", popup);
  await expect(pending).resolves.toEqual(result);
  expect(vi.getTimerCount()).toBe(0);
});
it("lets a canceled sign-in retry and clears listeners on unmount", async () => {
  vi.useFakeTimers();
  const popup = {
    closed: true,
    close: vi.fn(),
    location: { href: "" },
  } as unknown as Window;
  vi.spyOn(window, "open").mockReturnValue(popup);
  const pending = connectProject(options, new AbortController().signal);
  const rejected = expect(pending).rejects.toThrow("Sign-in closed");
  vi.advanceTimersByTime(1000);
  await rejected;
  const abort = new AbortController();
  const next = connectProject(options, abort.signal);
  const canceled = expect(next).rejects.toThrow("Setup closed");
  abort.abort();
  await canceled;
  expect(vi.getTimerCount()).toBe(0);
});
it("resumes after reload without storing the handoff token in public settings", () => {
  rememberProject(options, result);
  expect(localStorage.getItem(localStorage.key(0)!)).not.toContain(
    "project-token"
  );
  expect(resumeProject(options)).toMatchObject({
    project: result.project,
    repo: result.repo,
    onboarding: undefined,
  });
  expect(options.onboarding?.inProject).toBe(true);
});

it("normalizes and deduplicates production sites while preserving current-site approval", () => {
  expect(
    setupSites(
      "https://native.offbr.co/components/buttons/\nhttps://native.offbr.co",
      "http://localhost:3000"
    )
  ).toEqual(["http://localhost:3000", "https://native.offbr.co"]);
  expect(() =>
    setupSites("http://untrusted.example", "http://localhost:3000")
  ).toThrow("HTTPS");
  expect(() =>
    setupSites("https://user:password@example.com", "http://localhost:3000")
  ).toThrow("HTTPS");
  expect(() =>
    setupSites(
      Array.from({ length: 11 }, (_, i) => `https://site${i}.example`).join(
        "\n"
      ),
      "http://localhost:3000"
    )
  ).toThrow("ten sites");
});
