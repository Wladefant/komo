import { expect, it } from "vitest";
import { pinDirection } from "../src/pin-direction";
const component = { left: 50, right: 450, top: 100, bottom: 500 };
it("keeps viewport direction for detached pins and component interiors", () => {
  expect(pinDirection({ x: 100, y: 200 }, 1000)).toBe("right");
  expect(pinDirection({ x: 800, y: 200 }, 1000)).toBe("left");
  expect(pinDirection({ x: 300, y: 300, component }, 1000)).toBe("right");
});
it("points inward within 100px of any component edge, including the threshold", () => {
  expect(pinDirection({ x: 350, y: 300, component }, 1000)).toBe("left");
  expect(pinDirection({ x: 349, y: 300, component }, 1000)).toBe("right");
  expect(pinDirection({ x: 300, y: 150, component }, 1000)).toBe("left");
  expect(pinDirection({ x: 300, y: 450, component }, 1000)).toBe("left");
  expect(
    pinDirection(
      { x: 650, y: 300, component: { ...component, left: 550, right: 950 } },
      1000
    )
  ).toBe("right");
});
it("handles dragging outside, center ties, and invalid component bounds", () => {
  expect(pinDirection({ x: 475, y: 300, component }, 1200)).toBe("left");
  expect(pinDirection({ x: 551, y: 300, component }, 1200)).toBe("right");
  expect(pinDirection({ x: 530, y: 20, component }, 1200)).toBe("right");
  expect(pinDirection({ x: 250, y: 100, component }, 1000)).toBe("right");
  expect(
    pinDirection(
      { x: 350, y: 300, component: { ...component, right: 50 } },
      1000
    )
  ).toBe("right");
});
