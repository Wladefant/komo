// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { iconMarkup, iconNodes, iconSvg } from "../src/icon-markup";

describe("review icons", () => {
  it.each(Object.entries(iconNodes))(
    "renders the Lucide shapes for %s as one decorative SVG",
    (name, node) => {
      const host = document.createElement("div");
      host.innerHTML = iconMarkup[name as keyof typeof iconMarkup];
      const svg = host.firstElementChild!;
      expect(host.childElementCount).toBe(1);
      expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect([...svg.children].map((child) => child.tagName)).toEqual(
        node.map(([tag]) => tag),
      );
      for (const [index, [, attributes]] of node.entries())
        for (const [key, value] of Object.entries(attributes))
          expect(svg.children[index]!.getAttribute(key)).toBe(String(value));
    },
  );
  it("escapes attribute values", () => {
    expect(iconSvg([["path", { d: '"<&>' }]])).toContain(
      'd="&quot;&lt;&amp;&gt;"',
    );
  });
});
