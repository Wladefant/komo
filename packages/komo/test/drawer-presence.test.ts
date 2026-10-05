// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { drawerPresence } from "../src/drawer-presence";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
it("peeks the top half from the viewport bottom, without slicing the dock", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const toolbar = document.createElement("div");
  toolbar.innerHTML = '<div class="dock" data-view="collapsed"></div>';
  document.body.append(toolbar);
  vi.spyOn(toolbar, "getBoundingClientRect").mockReturnValue({
    left: 300,
    right: 700,
    top: 680,
    bottom: 736,
    width: 400,
    height: 56,
  } as DOMRect);
  const abort = new AbortController();
  const presence = drawerPresence(toolbar, () => false, abort.signal);
  window.dispatchEvent(new Event("load"));
  vi.advanceTimersByTime(700);
  expect(toolbar.dataset.peek).toBe("true");
  // At 768px viewport height: top + translation = 768 - height / 2.
  expect(
    680 + parseFloat(toolbar.style.getPropertyValue("--drawer-peek-y")),
  ).toBe(740);
  expect(toolbar.style.getPropertyValue("--drawer-peek-clip")).toBe("");
  presence.show();
  expect(toolbar.dataset.intro).toBeUndefined();
  expect(toolbar.dataset.away).toBeUndefined();
  abort.abort();
});
