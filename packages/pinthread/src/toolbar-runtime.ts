import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createElement } from "react";
import { Dock } from "./Dock.js";
import type { ToolbarProps, ToolbarIcon } from "./lazy-toolbar.js";
import { icons, initials } from "./dom.js";

function glyph(value: ToolbarIcon): ReturnType<typeof createElement> {
  if ("glyph" in value)
    return createElement("span", {
      style: { display: "contents" },
      dangerouslySetInnerHTML: { __html: icons[value.glyph] },
    });
  return createElement(
    "span",
    { className: "review-avatar" },
    value.user?.avatarUrl
      ? createElement("img", {
          src: value.user.avatarUrl,
          alt: "",
          referrerPolicy: "no-referrer",
        })
      : value.user
        ? initials(value.user.name)
        : glyph({ glyph: "person" }),
  );
}
const view = (props: ToolbarProps) =>
  createElement(Dock, {
    ...props,
    items: props.items.map((item) => ({ ...item, icon: glyph(item.icon) })),
  });
export function mountToolbar(element: HTMLElement, props: ToolbarProps) {
  element.replaceChildren();
  const root = createRoot(element);
  flushSync(() => root.render(view(props)));
  return {
    render: (next: ToolbarProps) => root.render(view(next)),
    unmount: () => root.unmount(),
  };
}
