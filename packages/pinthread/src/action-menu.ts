import { button, el, icon, type icons } from "./dom.js";

type MenuAction = {
  label: string;
  icon: keyof typeof icons;
  onSelect: () => void;
  destructive?: boolean;
};

export function actionMenu(label: string, actions: MenuAction[]) {
  const root = el("details", "comment-menu");
  const toggle = el("summary", "icon");
  toggle.setAttribute("aria-label", label);
  toggle.setAttribute("aria-haspopup", "menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.title = label;
  toggle.append(icon("more"));
  const menu = el("div", "comment-menu-items");
  menu.popover = "manual";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", label);
  const items = actions.map((action) => {
    const item = button(
      action.label,
      () => {
        root.open = false;
        toggle.focus({ preventScroll: true });
        action.onSelect();
      },
      `menu-action${action.destructive ? " destructive" : ""}`,
      action.icon,
    );
    item.append(el("span", "", action.label));
    item.setAttribute("role", "menuitem");
    item.tabIndex = -1;
    menu.append(item);
    return item;
  });
  root.addEventListener("toggle", () => {
    toggle.setAttribute("aria-expanded", String(root.open));
    if (root.open) {
      menu.showPopover();
      const rect = toggle.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - menu.offsetHeight - 8))}px`;
      (
        items.find((item) => item.getAttribute("aria-checked") === "true") ??
        items[0]
      )?.focus({ preventScroll: true });
    } else menu.hidePopover();
  });
  root.addEventListener("keydown", (event) => {
    if (!root.open) return;
    const index = items.indexOf(event.target as HTMLButtonElement);
    let next: number | undefined;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    if (event.key === "ArrowUp")
      next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      items[next]?.focus();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      root.open = false;
      toggle.focus({ preventScroll: true });
    }
    if (event.key === "Tab") root.open = false;
  });
  root.append(toggle, menu);
  return root;
}

export function selectionMenu(
  label: string,
  choices: readonly (readonly [string, string])[],
  value: string,
  onSelect: (value: string) => void,
) {
  const root = actionMenu(
    label,
    choices.map(([key, text]) => ({
      label: text,
      icon: "check",
      onSelect: () => onSelect(key),
    })),
  );
  root.classList.add("selection-menu");
  const summary = root.querySelector("summary")!;
  summary.className = "selection-trigger";
  summary.replaceChildren(
    el("span", "selection-label", choices.find(([key]) => key === value)?.[1]),
    icon("chevron"),
  );
  root
    .querySelectorAll<HTMLElement>("[role=menuitem]")
    .forEach((item, index) => {
      item.setAttribute("role", "menuitemradio");
      item.setAttribute("aria-checked", String(choices[index][0] === value));
    });
  return root;
}
