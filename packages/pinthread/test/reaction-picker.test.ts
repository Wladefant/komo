// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { reactionPicker } from "../src/reaction-picker";

const construct = vi.hoisted(() => vi.fn());
vi.mock("emoji-picker-element/picker.js", () => ({
  default: class {
    constructor(options: unknown) {
      construct(options);
      const picker = document.createElement("div");
      picker.attachShadow({ mode: "open" });
      return picker;
    }
  },
}));
afterEach(() => {
  document.body.replaceChildren();
  construct.mockReset();
});
function mount(dataSource?: string) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const trigger = document.createElement("button");
  root.append(trigger);
  const close = reactionPicker(
    root,
    trigger,
    vi.fn(),
    undefined,
    "test",
    dataSource,
  );
  const custom = root.querySelector<HTMLButtonElement>(
    '[aria-label="Choose another emoji"]',
  )!;
  return { root, custom, close };
}
it("keeps quick reactions immediate and initializes pinned data only on explicit intent", async () => {
  const { root, custom, close } = mount();
  expect(construct).not.toHaveBeenCalled();
  custom.click();
  await vi.waitFor(() => expect(construct).toHaveBeenCalledOnce());
  expect(construct.mock.calls[0][0]).toMatchObject({
    dataSource:
      "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0/en/emojibase/data.json",
  });
  expect(
    (
      root.querySelector(".emoji-keyboard > div") as HTMLElement & {
        i18n: { networkErrorMessage: string };
      }
    ).i18n.networkErrorMessage,
  ).toContain("Close and try again.");
  close(true);
});
it("passes the self-hosted data URL and permits retry after load failure", async () => {
  construct.mockImplementationOnce(() => {
    throw Error("offline");
  });
  const { root, custom, close } = mount("/emoji/data.json");
  custom.click();
  await vi.waitFor(() =>
    expect(root.textContent).toContain("Close and try again."),
  );
  root
    .querySelector<HTMLButtonElement>('[aria-label="Close emoji keyboard"]')!
    .click();
  custom.click();
  await vi.waitFor(() => expect(construct).toHaveBeenCalledTimes(2));
  expect(construct.mock.calls[1][0].dataSource).toBe("/emoji/data.json");
  close(true);
});
