import { describe, expect, it } from "vitest";
import { pinStacks } from "../src/pin-stacks";
import type { Thread } from "../src/types";
const thread = (id: string, selector = "#hero", unstacked = false): Thread => ({
  id,
  createdAt: Number(id),
  updatedAt: 0,
  page: "/",
  resolved: false,
  resolvedBy: null,
  comments: [],
  anchor: {
    selector,
    text: "",
    x: 0.5,
    y: 0.5,
    width: 0,
    height: 0,
    pageX: 20,
    pageY: 20,
    viewportWidth: 1000,
    unstacked,
  },
});
describe("component indicator stacks", () => {
  it("keeps a stable oldest anchor even when API order changes", () => {
    const first = thread("1"),
      second = thread("2"),
      other = thread("3", "#footer");
    const stacks = pinStacks([second, other, first], (t) => t.anchor.selector);
    expect(stacks.get("2")).toEqual([first, second]);
    expect(stacks.has("3")).toBe(false);
  });
  it("leaves moved and resolved comments out of the stack", () => {
    const moved = thread("2", "#hero", true),
      resolved = { ...thread("3"), resolved: true };
    expect(
      pinStacks([thread("1"), moved, resolved], (t) => t.anchor.selector).size
    ).toBe(0);
  });
  it("groups aliases of one component but not missing targets", () => {
    const element = {};
    expect(
      pinStacks([thread("1"), thread("2", "main > h1")], () => element).size
    ).toBe(2);
    expect(pinStacks([thread("1"), thread("2")], () => null).size).toBe(0);
  });
});
