// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createToolbar, type ToolbarProps } from "../src/lazy-toolbar.js";

const { mountToolbar } = vi.hoisted(() => ({
  mountToolbar: vi.fn((element: HTMLElement) => {
    element.replaceChildren(document.createElement("nav"));
    return { render: vi.fn(), unmount: vi.fn() };
  }),
}));
vi.mock("../src/toolbar-runtime.js", () => ({ mountToolbar }));

const props: ToolbarProps = {
  label: "Review",
  items: [{ id: "browse", label: "Browse", icon: { glyph: "pin" } }],
};

function setHover(hover: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(hover: none)" ? !hover : false,
  }));
}

// For "nothing happened" checks: once the runtime import has settled, a mount
// that was not held back has already run. Positive checks poll with vi.waitFor.
const imported = () => vi.dynamicImportSettled();

afterEach(() => {
  vi.useRealTimers();
  mountToolbar.mockClear();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("keeps the touched control in place until the first touch ends", async () => {
  setHover(true);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  const control = element.querySelector(".dock__button")!;

  // pointerenter does not bubble: the browser fires it on every entered ancestor.
  element.dispatchEvent(
    new PointerEvent("pointerenter", { pointerType: "touch" }),
  );
  await imported();
  expect(control.isConnected).toBe(true);
  control.dispatchEvent(
    new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
  );
  await imported();
  expect(control.isConnected).toBe(true);
  expect(mountToolbar).not.toHaveBeenCalled();

  control.dispatchEvent(
    new PointerEvent("pointerup", { pointerType: "touch", bubbles: true }),
  );
  await vi.waitFor(() => expect(mountToolbar).toHaveBeenCalledOnce());
  toolbar.unmount();
});

it("keeps the touched control while a second finger comes and goes", async () => {
  setHover(true);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  const control = element.querySelector(".dock__button")!;
  const touch = (type: string, pointerId: number) =>
    new PointerEvent(type, {
      pointerType: "touch",
      pointerId,
      isPrimary: pointerId === 1,
      bubbles: true,
    });

  element.dispatchEvent(touch("pointerenter", 1));
  control.dispatchEvent(touch("pointerdown", 1));
  await imported();

  // The second finger lifts while the first one still holds the control.
  vi.useFakeTimers();
  control.dispatchEvent(touch("pointerdown", 2));
  control.dispatchEvent(touch("pointerup", 2));
  vi.runAllTimers();
  vi.useRealTimers();
  await imported();
  expect(control.isConnected).toBe(true);
  expect(mountToolbar).not.toHaveBeenCalled();

  control.dispatchEvent(touch("pointerup", 1));
  await vi.waitFor(() => expect(mountToolbar).toHaveBeenCalledOnce());
  toolbar.unmount();
});

it("keeps the touched shell when the touch lands before the idle mount", async () => {
  setHover(false);
  let idle: (() => void) | undefined;
  vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
    idle = callback;
    return 1;
  });
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  const control = element.querySelector(".dock__button")!;

  // The finger lands first; the page only goes idle while it is still down.
  element.dispatchEvent(
    new PointerEvent("pointerenter", { pointerType: "touch" }),
  );
  control.dispatchEvent(
    new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
  );
  expect(idle).toBeDefined();
  idle!();
  await imported();
  expect(control.isConnected).toBe(true);
  expect(mountToolbar).not.toHaveBeenCalled();

  control.dispatchEvent(
    new PointerEvent("pointerup", { pointerType: "touch", bubbles: true }),
  );
  await vi.waitFor(() => expect(mountToolbar).toHaveBeenCalledOnce());
  expect(control.isConnected).toBe(false);
  toolbar.unmount();
});

it("mounts the menu without intent when the device cannot hover", async () => {
  setHover(false);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  toolbar.render(props);
  await vi.waitFor(() => expect(mountToolbar).toHaveBeenCalled());
  await imported();
  expect(mountToolbar).toHaveBeenCalledOnce();
  toolbar.unmount();
});

it("mounts the menu on a busy page that never goes idle", async () => {
  setHover(false);
  vi.useFakeTimers();
  // The browser runs an idle callback on a busy page only when its timeout expires.
  vi.stubGlobal(
    "requestIdleCallback",
    (callback: () => void, options?: IdleRequestOptions) =>
      options?.timeout === undefined ? 0 : setTimeout(callback, options.timeout),
  );
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await vi.waitFor(() => expect(mountToolbar).toHaveBeenCalledOnce());
  toolbar.unmount();
});

it("waits for intent when the device can hover", async () => {
  setHover(true);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  await imported();
  expect(mountToolbar).not.toHaveBeenCalled();

  element.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
  await vi.waitFor(() => expect(mountToolbar).toHaveBeenCalledOnce());
  toolbar.unmount();
});
