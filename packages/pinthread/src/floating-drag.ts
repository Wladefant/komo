// Drag geometry adapted from tjcages/panels (MIT); see NOTICE.md.
export interface Placement {
  x: number;
  y: number;
  edgeX?: "left" | "right";
  edgeY?: "top" | "bottom";
}
const clamp = (n: number, max: number) => Math.max(16, Math.min(n, max));
export function constrain(
  p: Placement,
  width: number,
  height: number,
  vw: number,
  vh: number
): Placement {
  return {
    ...p,
    x:
      p.edgeX === "left"
        ? 16
        : p.edgeX === "right"
          ? Math.max(16, vw - width - 16)
          : clamp(p.x, vw - width - 16),
    y:
      p.edgeY === "top"
        ? 16
        : p.edgeY === "bottom"
          ? Math.max(16, vh - height - 16)
          : clamp(p.y, vh - height - 16),
  };
}
export function settle(
  p: Placement,
  width: number,
  height: number,
  vw: number,
  vh: number
): Placement {
  const next = constrain(p, width, height, vw, vh);
  const right = vw - width - 16 - next.x,
    bottom = vh - height - 16 - next.y;
  if (Math.min(next.x - 16, right) < vw * 0.05)
    next.edgeX = next.x - 16 <= right ? "left" : "right";
  if (Math.min(next.y - 16, bottom) < vh * 0.05)
    next.edgeY = next.y - 16 <= bottom ? "top" : "bottom";
  return constrain(next, width, height, vw, vh);
}
export function floatingDrag(
  element: HTMLElement,
  handle: HTMLElement,
  save: (p: Placement) => void,
  signal: AbortSignal,
  beforeDrag?: () => void,
  onSettled?: () => void,
  enabled: () => boolean = () => true,
  allowInteractiveStart: (target: Element) => boolean = () => false
) {
  let cleanup: (() => void) | undefined;
  handle.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as Element;
      if (
        !enabled() ||
        event.button !== 0 ||
        (target.closest("button,input,textarea,a,summary,[role=menu]") &&
          !allowInteractiveStart(target))
      )
        return;
      cleanup?.();
      const start = element.getBoundingClientRect();
      let moved = false,
        lastX = event.clientX,
        lastY = event.clientY,
        lastT = event.timeStamp,
        vx = 0,
        vy = 0;
      const move = (e: PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        if (!enabled()) {
          cleanup?.();
          return;
        }
        const dx = e.clientX - event.clientX,
          dy = e.clientY - event.clientY;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        if (!moved) {
          beforeDrag?.();
          for (const animation of element.getAnimations()) animation.cancel();
          element.dataset.dragging = "true";
          moved = true;
        }
        e.preventDefault();
        const dt = e.timeStamp - lastT;
        if (dt > 0) {
          vx = (0.8 * (e.clientX - lastX)) / dt + 0.2 * vx;
          vy = (0.8 * (e.clientY - lastY)) / dt + 0.2 * vy;
        }
        lastX = e.clientX;
        lastY = e.clientY;
        lastT = e.timeStamp;
        const p = constrain(
          { x: start.left + dx, y: start.top + dy },
          start.width,
          start.height,
          document.documentElement.clientWidth,
          window.innerHeight
        );
        save(p);
        const snap = settle(
          p,
          start.width,
          start.height,
          document.documentElement.clientWidth,
          window.innerHeight
        );
        element.dataset.snapX = snap.edgeX ?? "";
        element.dataset.snapY = snap.edgeY ?? "";
      };
      const end = (e: PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        if (!enabled()) {
          cleanup?.();
          return;
        }
        cleanup?.();
        if (!moved) return;
        const rect = element.getBoundingClientRect();
        const coast =
          e.type !== "pointercancel" && e.timeStamp - lastT < 80 ? 120 : 0;
        save(
          settle(
            { x: rect.left + vx * coast, y: rect.top + vy * coast },
            rect.width,
            rect.height,
            document.documentElement.clientWidth,
            window.innerHeight
          )
        );
        onSettled?.();
        const target = element.getBoundingClientRect();
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
          element.animate(
            [
              {
                translate: `${rect.left - target.left}px ${rect.top - target.top}px`,
              },
              { translate: "0px 0px" },
            ],
            { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" }
          );
        handle.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
          },
          { capture: true, once: true }
        );
      };
      cleanup = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("pointercancel", end, true);
        delete element.dataset.dragging;
        delete element.dataset.snapX;
        delete element.dataset.snapY;
        signal.removeEventListener("abort", cleanup!);
      };
      signal.addEventListener("abort", cleanup, { once: true });
      window.addEventListener("pointermove", move, {
        capture: true,
        passive: false,
      });
      window.addEventListener("pointerup", end, true);
      window.addEventListener("pointercancel", end, true);
    },
    { signal }
  );
}
