import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardMotion } from "../src/card-motion.js";

describe("card following motion", () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let time: number;
  let nextId: number;
  let reduced: { matches: boolean };
  const element = () => ({ isConnected: true, style: {} }) as HTMLElement;
  const advance = (frames: number) => {
    for (let i = 0; i < frames; i++) {
      time += 1000 / 60;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(time));
    }
  };
  beforeEach(() => {
    callbacks = new Map();
    time = 0;
    nextId = 0;
    reduced = { matches: false };
    vi.stubGlobal("matchMedia", () => reduced);
    vi.spyOn(performance, "now").mockImplementation(() => time);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it("moves promptly, compresses in motion, and settles without residual transforms", () => {
    const node = element();
    const motion = cardMotion(() => {});
    motion.place("thread", node, 100, 100, false);
    motion.place("thread", node, 400, 100, true);
    expect(node.style.translate).toBe("-300px 0px");
    advance(12);
    expect(Math.abs(parseFloat(node.style.translate))).toBeLessThan(20);
    expect(parseFloat(node.style.scale)).toBeLessThan(1);
    advance(100);
    expect(node.style.translate).toBe("");
    expect(node.style.scale).toBe("");
    expect(callbacks.size).toBe(0);
  });
  it("preserves the current position when saving replaces the card", () => {
    const node = element();
    const motion = cardMotion(() => {});
    motion.place("thread", node, 100, 100, false);
    motion.place("thread", node, 400, 100, true);
    advance(4);
    const translate = node.style.translate;
    const replacement = element();
    motion.place("thread", replacement, 400, 100, true);
    expect(replacement.style.translate).toBe(translate);
    advance(100);
    expect(replacement.style.translate).toBe("");
  });
  it("retargets mid-flight and cancels for reduced motion", () => {
    const node = element();
    const motion = cardMotion(() => {});
    motion.place("thread", node, 100, 100, false);
    motion.place("thread", node, 400, 100, true);
    advance(4);
    const visualX = 400 + parseFloat(node.style.translate);
    motion.place("thread", node, 200, 300, true);
    expect(200 + parseFloat(node.style.translate)).toBeCloseTo(visualX);
    reduced.matches = true;
    advance(1);
    expect(node.style.translate).toBe("");
    expect(node.style.scale).toBe("");
    expect(callbacks.size).toBe(0);
  });
});
