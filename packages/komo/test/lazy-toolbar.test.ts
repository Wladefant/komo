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

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

afterEach(() => {
  mountToolbar.mockClear();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("keeps the touched control in place until the first touch ends", async () => {
  setHover(true);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  const control = element.querySelector(".morphing-menu__shortcut")!;

  // pointerenter does not bubble: the browser fires it on every entered ancestor.
  element.dispatchEvent(
    new PointerEvent("pointerenter", { pointerType: "touch" }),
  );
  await settle();
  expect(control.isConnected).toBe(true);
  control.dispatchEvent(
    new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
  );
  await settle();
  expect(control.isConnected).toBe(true);
  expect(mountToolbar).not.toHaveBeenCalled();

  control.dispatchEvent(
    new PointerEvent("pointerup", { pointerType: "touch", bubbles: true }),
  );
  await settle();
  expect(mountToolbar).toHaveBeenCalledOnce();
  toolbar.unmount();
});

it("mounts the menu without intent when the device cannot hover", async () => {
  setHover(false);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  toolbar.render(props);
  await settle();
  expect(mountToolbar).toHaveBeenCalledOnce();
  toolbar.unmount();
});

it("waits for intent when the device can hover", async () => {
  setHover(true);
  const element = document.body.appendChild(document.createElement("div"));
  const toolbar = createToolbar(element, () => document.createElement("i"));
  toolbar.render(props);
  await settle();
  expect(mountToolbar).not.toHaveBeenCalled();

  element.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
  await settle();
  expect(mountToolbar).toHaveBeenCalledOnce();
  toolbar.unmount();
});
