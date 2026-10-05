// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ApiError, type CommentsApi } from "../src/api";
import { accountUsage } from "../src/account-usage";
import type { AccountUsage } from "../src/types";

const usage: AccountUsage = {
  hosted: true,
  comments: { used: 17, limit: 250 },
  projects: { used: 1, limit: 3 },
};
const deferred = () => {
  let resolve!: (value: AccountUsage) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<AccountUsage>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const client = () =>
  ({
    token: "session-a",
    user: { id: "reviewer" },
    request: vi.fn(),
  }) as unknown as CommentsApi;
const mount = (api: CommentsApi, path?: string) => {
  const panel = accountUsage(api, path, false);
  document.body.append(panel);
  return panel;
};
const settled = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(() => document.body.replaceChildren());

it("keeps usage through rerenders and failed refreshes while sharing an overlapping request", async () => {
  const api = client();
  vi.mocked(api.request).mockResolvedValueOnce(usage);
  const first = mount(api);
  await settled();
  first.remove();
  const refresh = deferred();
  vi.mocked(api.request).mockReturnValueOnce(refresh.promise);
  const second = mount(api);
  const third = mount(api);
  expect(second.textContent).toContain("17 / 250");
  expect(third.querySelector(".usage-skeleton")).toBeNull();
  expect(api.request).toHaveBeenCalledTimes(2);
  refresh.reject(new ApiError(0, "Offline"));
  await settled();
  expect(third.textContent).toContain("17 / 250");
  expect(third.textContent).toContain("Couldn’t refresh usage");
  vi.mocked(api.request).mockResolvedValueOnce({
    ...usage,
    comments: { used: 18, limit: 250 },
  });
  third.querySelector<HTMLButtonElement>("button")!.click();
  await settled();
  expect(third.textContent).toContain("18 / 250");
  expect(third.textContent).not.toContain("Couldn’t refresh usage");
});

it("isolates snapshots by API instance, session token, user, and request path", async () => {
  const api = client();
  vi.mocked(api.request).mockResolvedValueOnce(usage);
  mount(api);
  await settled();
  vi.mocked(api.request).mockReturnValue(new Promise(() => {}));
  expect(mount(api, "usage?workspace=other").textContent).not.toContain(
    "17 / 250",
  );
  api.token = "session-b";
  expect(mount(api).textContent).not.toContain("17 / 250");
  api.token = "session-a";
  api.user = { ...api.user!, id: "another-reviewer" };
  expect(mount(api).textContent).not.toContain("17 / 250");
  const other = client();
  vi.mocked(other.request).mockReturnValue(new Promise(() => {}));
  expect(mount(other).textContent).not.toContain("17 / 250");
});

it.each([401, 403])(
  "removes cached usage after an authorization failure (%s)",
  async (status) => {
    const api = client();
    vi.mocked(api.request).mockResolvedValueOnce(usage);
    mount(api);
    await settled();
    vi.mocked(api.request).mockRejectedValueOnce(
      new ApiError(status, "Access denied"),
    );
    const panel = mount(api);
    await settled();
    expect(panel.textContent).not.toContain("17 / 250");
    expect(panel.textContent).toContain("Usage unavailable");
    vi.mocked(api.request).mockReturnValue(new Promise(() => {}));
    expect(mount(api).textContent).not.toContain("17 / 250");
  },
);

it("does not repopulate a panel with a response from a previous session", async () => {
  const api = client();
  const pending = deferred();
  vi.mocked(api.request).mockReturnValueOnce(pending.promise);
  const panel = mount(api);
  api.token = "session-b";
  pending.resolve(usage);
  await settled();
  expect(panel.textContent).toBe("");
  api.token = "session-a";
  vi.mocked(api.request).mockReturnValue(new Promise(() => {}));
  expect(mount(api).textContent).not.toContain("17 / 250");
});
