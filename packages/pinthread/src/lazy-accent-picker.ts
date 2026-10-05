import { button, el } from "./dom.js";

export function accentPicker(
  initial: string,
  onChange: (color: string) => void
) {
  const element = el("div", "account-accent-mount");
  element.style.minHeight = "62px";
  let disposed = false;
  let destroy: (() => void) | undefined;
  const load = async () => {
    element.replaceChildren();
    element.setAttribute("aria-busy", "true");
    try {
      const module = await import("./accent-picker.js");
      if (disposed) return;
      const picker = module.accentPicker(initial, onChange);
      destroy = picker.destroy;
      element.replaceChildren(picker.element);
    } catch {
      if (!disposed)
        element.replaceChildren(
          button("Load accent colors", () => void load(), "secondary")
        );
    } finally {
      element.removeAttribute("aria-busy");
    }
  };
  void load();
  return {
    element,
    destroy: () => {
      disposed = true;
      destroy?.();
    },
  };
}
