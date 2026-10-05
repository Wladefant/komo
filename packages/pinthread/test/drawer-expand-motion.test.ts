import { describe, expect, it } from "vitest";
import {
  boxFromAnchor,
  compressedDrawerSize,
  drawerExpandSpring,
} from "../src/drawer-expand-motion";

describe("drawer expand motion", () => {
  it("uses the drawer open spring", () => {
    expect(drawerExpandSpring).toEqual({
      type: "spring",
      duration: 0.4,
      bounce: 0.24,
    });
  });

  it("compresses the bar the way the drawer shell does", () => {
    expect(compressedDrawerSize(320, 52)).toEqual({ width: 280, height: 28 });
    expect(compressedDrawerSize(180, 60)).toEqual({ width: 180, height: 32 });
  });

  it("keeps the bottom center fixed while the surface changes size", () => {
    expect(boxFromAnchor(200, 800, 52, 52)).toEqual({
      left: 174,
      top: 748,
      width: 52,
      height: 52,
    });
  });
});
