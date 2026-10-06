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
      '<div id="toolbar"><button class="dock__button">Comments</button></div>',
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
      (target) => !!target.closest(".dock__button"),
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
      '<div id="toolbar"><button class="dock__button">Comments</button></div><div id="sensor"></div>',
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
      (target) => !!target.closest(".dock__button"),
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

describe("floating drag end paths", () => {
  // One toolbar under a drag, with pointer capture tracked the way a browser
  // does it. Every event carries an explicit time, so the release coast is
  // predictable.
  function mountDrag() {
    const dom = new JSDOM('<div id="toolbar"></div>');
    const { window } = dom;
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const toolbar = window.document.querySelector<HTMLElement>("#toolbar")!;
    toolbar.getBoundingClientRect = () =>
      ({ left: 100, top: 100, width: 200, height: 52 }) as DOMRect;
    toolbar.getAnimations = () => [];
    const captured = new Set<number>();
    Object.assign(toolbar, {
      setPointerCapture: (id: number) => void captured.add(id),
      hasPointerCapture: (id: number) => captured.has(id),
      releasePointerCapture: (id: number) => void captured.delete(id),
    });
    const save = vi.fn();
    const settled = vi.fn();
    const abort = new window.AbortController();
    floatingDrag(toolbar, toolbar, save, abort.signal, undefined, settled);
    const pointer = (
      type: string,
      id: number,
      at: number,
      x: number,
      target: EventTarget = window,
    ) => {
      const event = new window.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
        clientY: 120,
      });
      // The first finger is the primary pointer; a second one never is.
      Object.defineProperties(event, {
        pointerId: { value: id },
        isPrimary: { value: id === 1 },
        timeStamp: { value: at },
      });
      target.dispatchEvent(event);
    };
    // Where the dock rests when a drag ends without a coast.
    const resting = () =>
      settle(
        { x: 100, y: 100 },
        200,
        52,
        window.document.documentElement.clientWidth,
        window.innerHeight,
      );
    const close = () => {
      abort.abort();
      vi.unstubAllGlobals();
      dom.window.close();
    };
    return { toolbar, captured, save, settled, pointer, resting, close };
  }

  it("keeps the first drag when a second finger touches the handle", () => {
    const { toolbar, captured, save, settled, pointer, resting, close } =
      mountDrag();
    try {
      pointer("pointerdown", 1, 0, 120, toolbar);
      pointer("pointermove", 1, 16, 160);
      expect(toolbar.dataset.dragging).toBe("true");

      pointer("pointerdown", 2, 20, 260, toolbar);
      expect(toolbar.dataset.dragging).toBe("true");
      expect(captured.has(1)).toBe(true);

      // The first finger still moves the dock; the second one does not.
      save.mockClear();
      pointer("pointermove", 1, 32, 180);
      expect(save).toHaveBeenCalledTimes(1);
      pointer("pointermove", 2, 40, 300);
      pointer("pointerup", 2, 50, 300);
      expect(save).toHaveBeenCalledTimes(1);
      expect(settled).not.toHaveBeenCalled();

      // The first finger's release settles and saves the placement.
      pointer("pointerup", 1, 300, 180);
      expect(settled).toHaveBeenCalledOnce();
      expect(save).toHaveBeenLastCalledWith(resting());
      expect(toolbar.dataset.dragging).toBeUndefined();
      expect(captured.size).toBe(0);
    } finally {
      close();
    }
  });

  it("settles once and leaves nothing behind when a pinch cancels the drag", () => {
    const { toolbar, captured, save, settled, pointer, resting, close } =
      mountDrag();
    try {
      pointer("pointerdown", 1, 0, 120, toolbar);
      pointer("pointermove", 1, 16, 160);
      // A second finger lands and the browser takes both pointers for a pinch.
      pointer("pointerdown", 2, 20, 260, toolbar);
      pointer("pointercancel", 2, 30, 260);
      expect(settled).not.toHaveBeenCalled();
      expect(toolbar.dataset.dragging).toBe("true");

      // A cancel never coasts, even right after a fast move.
      pointer("pointercancel", 1, 40, 160);
      expect(settled).toHaveBeenCalledOnce();
      expect(save).toHaveBeenLastCalledWith(resting());
      expect(toolbar.dataset.dragging).toBeUndefined();
      expect(toolbar.dataset.snapX).toBeUndefined();
      expect(captured.size).toBe(0);

      // No listener survives: later events for the same pointer do nothing.
      save.mockClear();
      pointer("pointermove", 1, 60, 200);
      pointer("pointerup", 1, 70, 200);
      expect(save).not.toHaveBeenCalled();
      expect(settled).toHaveBeenCalledOnce();
    } finally {
      close();
    }
  });

  it("ends the drag like a cancel when the browser takes the pointer capture", () => {
    const { toolbar, captured, save, settled, pointer, resting, close } =
      mountDrag();
    try {
      pointer("pointerdown", 1, 0, 120, toolbar);
      pointer("pointermove", 1, 16, 160);
      expect(captured.has(1)).toBe(true);

      captured.delete(1);
      pointer("lostpointercapture", 1, 30, 160, toolbar);
      expect(settled).toHaveBeenCalledOnce();
      expect(save).toHaveBeenLastCalledWith(resting());
      expect(toolbar.dataset.dragging).toBeUndefined();
      expect(toolbar.dataset.snapX).toBeUndefined();

      save.mockClear();
      pointer("pointermove", 1, 40, 200);
      pointer("pointerup", 1, 50, 200);
      pointer("lostpointercapture", 1, 60, 200, toolbar);
      expect(save).not.toHaveBeenCalled();
      expect(settled).toHaveBeenCalledOnce();
    } finally {
      close();
    }
  });
});
