import type { DockItem, DockProps } from "./Dock.js";
import { button, el, icon, type icons } from "./dom.js";
import type { Identity } from "./types.js";

export type ToolbarIcon =
  | { glyph: keyof typeof icons }
  | { user: Identity | null };
export type ToolbarItem = Omit<DockItem, "icon"> & {
  icon: ToolbarIcon;
};
export type ToolbarProps = Omit<DockProps, "items"> & {
  items: readonly ToolbarItem[];
};

/** Pins and the compact drawer work immediately; React's menu loads on intent. */
export function createToolbar(
  element: HTMLElement,
  glyph: (id: string) => Node,
) {
  let props: ToolbarProps;
  let mounted:
    | ReturnType<(typeof import("./toolbar-runtime.js"))["mountToolbar"]>
    | undefined;
  let loading: Promise<void> | undefined;
  let disposed = false;
  let pressed = false;
  let release: (() => void) | undefined;
  const events = new AbortController();
  element.addEventListener(
    "pointerdown",
    () => {
      pressed = true;
    },
    { capture: true, signal: events.signal },
  );
  const finish = () => {
    pressed = false;
    setTimeout(() => {
      release?.();
      release = undefined;
    }, 0);
  };
  document.addEventListener("pointerup", finish, {
    capture: true,
    signal: events.signal,
  });
  document.addEventListener("pointercancel", finish, {
    capture: true,
    signal: events.signal,
  });
  const load = () => {
    if (mounted || disposed) return Promise.resolve();
    if (loading) return loading;
    loading = import("./toolbar-runtime.js")
      .then(async (module) => {
        if (pressed)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        if (disposed) return;
        const focused = (element.getRootNode() as ShadowRoot)
          .activeElement as HTMLElement | null;
        const focusId = focused?.dataset.dockItem;
        mounted = module.mountToolbar(element, props);
        if (focusId)
          element
            .querySelector<HTMLElement>(`[data-dock-item="${focusId}"]`)
            ?.focus({ preventScroll: true });
      })
      .catch(() => {
        loading = undefined;
      });
    return loading;
  };
  element.addEventListener("pointerenter", () => void load(), { once: true });
  element.addEventListener("focusin", () => void load(), { once: true });
  return {
    render(next: ToolbarProps) {
      props = next;
      if (disposed) return;
      if (mounted) {
        mounted.render(props);
        return;
      }
      const nav = el("nav", "dock");
      nav.setAttribute("aria-label", props.label ?? "Website review");
      nav.dataset.view = "collapsed";
      nav.dataset.edge = props.edge ?? "bottom";
      nav.dataset.vertical = String(
        props.edge === "left" || props.edge === "right",
      );
      nav.dataset.alignEnd = String(!!props.alignEnd);
      const items = props.items.filter((item) => !item.sheetOnly);
      nav.style.setProperty("--dock-count", String(items.length + 1));
      const shell = el("div", "dock__surface"),
        bar = el("div", "dock__bar");
      for (const item of items) {
        const control = button(
          item.label,
          () => {
            item.onSelect?.();
            void load();
          },
          "dock__button",
        );
        control.title = item.label;
        control.dataset.dockItem = item.id;
        if (item.id === props.activeId)
          control.setAttribute("aria-current", "page");
        control.replaceChildren(glyph(item.id));
        bar.append(control);
      }
      const more = button(
        props.moreLabel ?? "More review tools",
        () =>
          void load().then(() => {
            if (mounted)
              element
                .querySelector<HTMLButtonElement>('[data-dock-item="more"]')
                ?.click();
            else {
              more.title = "Could not load menu. Tap to retry.";
              more.setAttribute("aria-label", more.title);
            }
          }),
        "dock__button",
      );
      more.dataset.dockItem = "more";
      more.setAttribute("aria-expanded", "false");
      more.replaceChildren(icon("drawer"));
      bar.append(more);
      shell.append(bar);
      nav.append(shell);
      element.replaceChildren(nav);
    },
    unmount() {
      disposed = true;
      events.abort();
      release?.();
      mounted?.unmount();
      element.replaceChildren();
    },
  };
}
