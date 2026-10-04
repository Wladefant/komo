import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { constrain, floatingDrag, settle } from "../src/floating-drag";

describe("floating placement", () => {
  it("snaps to a corner with a 16px clearance", () => {
    expect(settle({ x: 30, y: 500 }, 320, 180, 1000, 720)).toEqual({
      x: 16,
      y: 524,
      edgeX: "left",
      edgeY: "bottom",
    });
  });
  it("keeps a free placement away from the edges", () => {
    expect(settle({ x: 300, y: 200 }, 320, 180, 1000, 720)).toEqual({
      x: 300,
      y: 200,
    });
  });
  it("keeps a docked card against the edge after resizing", () => {
    expect(
      constrain(
        { x: 664, y: 524, edgeX: "right", edgeY: "bottom" },
        320,
        250,
        600,
        600,
      ),
    ).toEqual({ x: 264, y: 334, edgeX: "right", edgeY: "bottom" });
  });
  it("keeps an oversized surface's controls reachable", () => {
    expect(constrain({ x: -100, y: -100 }, 500, 900, 400, 700)).toEqual({
      x: 16,
      y: 16,
    });
  });

  it("drags from a toolbar tab but keeps a tap as a click", () => {
    const dom = new JSDOM(
      '<div id="toolbar"><button class="morphing-menu__shortcut">Comments</button></div>',
    );
    const { window } = dom;
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const toolbar = window.document.querySelector<HTMLElement>("#toolbar")!;
    const tab = toolbar.querySelector("button")!;
    toolbar.getBoundingClientRect = () =>
      ({ left: 100, top: 100, width: 200, height: 52 }) as DOMRect;
    toolbar.getAnimations = () => [];
    const save = vi.fn();
    const click = vi.fn();
    tab.addEventListener("click", click);
    const abort = new window.AbortController();
    floatingDrag(
      toolbar,
      toolbar,
      save,
      abort.signal,
      undefined,
      undefined,
      () => true,
      (target) => !!target.closest(".morphing-menu__shortcut"),
    );
    const pointer = (
      type: string,
      x: number,
      y: number,
      target: EventTarget,
    ) => {
      const event = new window.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
      Object.defineProperty(event, "pointerId", { value: 1 });
      target.dispatchEvent(event);
    };
    try {
      pointer("pointerdown", 120, 120, tab);
      pointer("pointermove", 140, 140, window);
      pointer("pointerup", 140, 140, window);
      tab.click();
      expect(save).toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();

      pointer("pointerdown", 120, 120, tab);
      pointer("pointerup", 120, 120, window);
      tab.click();
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      abort.abort();
      vi.unstubAllGlobals();
      dom.window.close();
    }
  });

  it("captures the pointer once dragging starts and frees the next tap", () => {
    const dom = new JSDOM(
      '<div id="toolbar"><button class="morphing-menu__shortcut">Comments</button></div><div id="sensor"></div>',
    );
    const { window } = dom;
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const toolbar = window.document.querySelector<HTMLElement>("#toolbar")!;
    const tab = toolbar.querySelector("button")!;
    const sensor = window.document.querySelector<HTMLElement>("#sensor")!;
    toolbar.getBoundingClientRect = () =>
      ({ left: 100, top: 100, width: 200, height: 52 }) as DOMRect;
    toolbar.getAnimations = () => [];
    const captured = new Set<number>();
    const capture = vi.fn((id: number) => void captured.add(id));
    Object.assign(toolbar, {
      setPointerCapture: capture,
      hasPointerCapture: (id: number) => captured.has(id),
      releasePointerCapture: (id: number) => void captured.delete(id),
    });
    const save = vi.fn();
    const click = vi.fn();
    tab.addEventListener("click", click);
    const abort = new window.AbortController();
    floatingDrag(
      toolbar,
      toolbar,
      save,
      abort.signal,
      undefined,
      undefined,
      () => true,
      (target) => !!target.closest(".morphing-menu__shortcut"),
    );
    const pointer = (type: string, x: number, y: number, target: EventTarget) => {
      const event = new window.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
      Object.defineProperty(event, "pointerId", { value: 7 });
      target.dispatchEvent(event);
    };
    vi.useFakeTimers();
    try {
      // A tap never takes capture, so the button keeps its own click.
      pointer("pointerdown", 120, 120, tab);
      pointer("pointerup", 120, 120, tab);
      expect(capture).not.toHaveBeenCalled();

      // A drag captures the pointer, then releases it when it ends, even if
      // the release happens over another element such as an edge sensor.
      pointer("pointerdown", 120, 120, tab);
      pointer("pointermove", 150, 120, sensor);
      expect(capture).toHaveBeenCalledWith(7);
      pointer("pointerup", 150, 120, sensor);
      expect(captured.size).toBe(0);
      expect(save).toHaveBeenCalled();

      // A touch drag produces no click; once the release turn has passed,
      // the next real tap must still work.
      vi.runAllTimers();
      tab.click();
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      abort.abort();
      vi.useRealTimers();
      vi.unstubAllGlobals();
      dom.window.close();
    }
  });
});
