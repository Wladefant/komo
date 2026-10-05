"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { animate, type AnimationPlaybackControls } from "motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { icons } from "./dom.js";

// The review dock: a pill of shortcuts that grows into a sheet listing every
// action. Styles live in dock-styles.ts and are installed in the ShadowRoot.

export type DockItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect?: () => void;
  /** Keep the sheet open after selecting, for actions that relabel in place. */
  stayOpen?: boolean;
  /** Sheet position; lower values come first. Defaults to 0. */
  sheetOrder?: number;
  /** List the action in the sheet only, without a button in the bar. */
  sheetOnly?: boolean;
};

export type DockProps = {
  items: readonly DockItem[];
  activeId?: string;
  edge?: "top" | "bottom" | "left" | "right";
  alignEnd?: boolean;
  label?: string;
  moreLabel?: string;
  closeLabel?: string;
  className?: string;
  style?: CSSProperties;
};

type Hint = { text: string; x: number; y: number };

// A hint waits this long on first hover, then follows the pointer across
// buttons instantly until it has been off the bar for HINT_COOL_MS.
const HINT_DELAY_MS = 500;
const HINT_COOL_MS = 300;
const HINT_GAP = 8;

// Motion tokens. The surface grows on a lively spring and settles back on a
// calm one; content fades with short, staggered offsets.
const growSpring = {
  type: "spring",
  visualDuration: 0.34,
  bounce: 0.2,
} as const;
const settleSpring = {
  type: "spring",
  visualDuration: 0.28,
  bounce: 0.06,
} as const;
const contentIn = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0.12,
} as const;
const contentOut = { duration: 0.1, ease: [0.4, 0, 1, 1] } as const;
const ROW_DELAY = 0.06;
const ROW_STAGGER = 0.025;
const BAR_DELAY = 0.08;
const fade = { duration: 0.15, ease: "linear" } as const;

const controlSelector = "[data-dock-item]";

export function Dock({
  items,
  activeId,
  edge = "bottom",
  alignEnd = false,
  label = "App navigation",
  moreLabel = "More",
  closeLabel = "Close drawer",
  className = "",
  style,
}: DockProps) {
  const sheetId = `${useId()}-sheet`;
  const reduced = !!useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(open);
  // Where focus goes once the next open or close has rendered.
  const focusAfter = useRef<"sheet" | "more" | null>(null);
  const restoring = useRef(false);
  const hintTimer = useRef<number>(undefined);
  const coolTimer = useRef<number>(undefined);
  const warm = useRef(false);
  const hintTarget = useRef<HTMLElement | null>(null);

  const barItems = items.filter((item) => !item.sheetOnly);
  const sheetItems = [...items].sort(
    (a, b) => (a.sheetOrder ?? 0) - (b.sheetOrder ?? 0),
  );

  function clearHint() {
    clearTimeout(hintTimer.current);
    hintTarget.current = null;
    setHint(null);
  }

  // Pressing or closing ends the hover session: the next hint waits again.
  function dismissHint() {
    clearHint();
    clearTimeout(coolTimer.current);
    warm.current = false;
  }

  function anchor(target: HTMLElement): Hint | null {
    const root = rootRef.current;
    if (!root) return null;
    const box = root.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const midX = rect.left - box.left + rect.width / 2;
    const midY = rect.top - box.top + rect.height / 2;
    const text = target.getAttribute("aria-label") ?? "";
    if (edge === "left") return { text, x: box.width + HINT_GAP, y: midY };
    if (edge === "right") return { text, x: -HINT_GAP, y: midY };
    if (edge === "top") return { text, x: midX, y: box.height + HINT_GAP };
    return { text, x: midX, y: -HINT_GAP };
  }

  function requestHint(target: HTMLElement, immediate: boolean) {
    if (open || restoring.current || hintTarget.current === target) return;
    clearTimeout(hintTimer.current);
    hintTarget.current = target;
    const show = () => {
      warm.current = true;
      setHint(anchor(target));
    };
    if (immediate || warm.current) show();
    else hintTimer.current = window.setTimeout(show, HINT_DELAY_MS);
  }

  function openSheet(keyboard: boolean) {
    dismissHint();
    focusAfter.current = "sheet";
    restoring.current = keyboard;
    setOpen(true);
  }

  function closeSheet(keyboard: boolean) {
    dismissHint();
    focusAfter.current = keyboard ? "more" : null;
    setOpen(false);
  }

  function choose(item: DockItem, keyboard: boolean) {
    if (open && !item.stayOpen) closeSheet(keyboard);
    else dismissHint();
    item.onSelect?.();
  }

  // Grow, shrink and crossfade. Every run starts from the geometry on screen,
  // so a toggle mid-flight reverses smoothly instead of jumping.
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const bar = barRef.current;
    const sheet = sheetRef.current;
    if (!surface || !bar || !sheet) return;
    const toggled = wasOpen.current !== open;
    wasOpen.current = open;
    const running: AnimationPlaybackControls[] = [];
    const run = (animation: AnimationPlaybackControls) => {
      running.push(animation);
      return animation;
    };
    const rows = [...sheet.querySelectorAll<HTMLElement>(".dock__row")];
    const target = open ? sheet : bar;
    const from = { width: surface.offsetWidth, height: surface.offsetHeight };
    const to = { width: target.offsetWidth, height: target.offsetHeight };

    if (toggled && reduced) {
      if (open) Object.assign(surface.style, px(to));
      else Object.assign(surface.style, { width: "", height: "" });
      run(animate(bar, { opacity: open ? 0 : 1, scale: 1 }, fade));
      for (const row of rows)
        run(animate(row, { opacity: open ? 1 : 0, y: 0 }, fade));
    } else if (toggled && open) {
      run(
        animate(
          surface,
          { width: [from.width, to.width], height: [from.height, to.height] },
          growSpring,
        ),
      );
      run(animate(bar, { opacity: 0, scale: 0.92 }, contentOut));
      rows.forEach((row, index) =>
        run(
          animate(
            row,
            { opacity: [0, 1], y: [10, 0] },
            { ...contentIn, delay: ROW_DELAY + index * ROW_STAGGER },
          ),
        ),
      );
    } else if (toggled) {
      for (const row of rows)
        run(animate(row, { opacity: 0, y: 4 }, contentOut));
      run(
        animate(
          surface,
          { width: [from.width, to.width], height: [from.height, to.height] },
          settleSpring,
        ),
      ).finished.then(
        // Hand the collapsed size back to CSS so it tracks the viewport.
        () => Object.assign(surface.style, { width: "", height: "" }),
        () => {},
      );
      run(
        animate(
          bar,
          { opacity: 1, scale: 1 },
          { ...contentIn, delay: BAR_DELAY },
        ),
      );
    }

    const focus = focusAfter.current;
    focusAfter.current = null;
    const next =
      focus === "sheet"
        ? sheet.querySelector<HTMLElement>(controlSelector)
        : focus === "more"
          ? bar.querySelector<HTMLElement>('[data-dock-item="more"]')
          : null;
    if (next) {
      // Returning focus is navigation, not a request to read a hint.
      restoring.current = true;
      next.focus({ preventScroll: true });
      restoring.current = false;
    }
    return () => running.forEach((animation) => animation.stop());
  }, [open, reduced]);

  // While open, follow the sheet's size: viewport changes and added rows.
  useEffect(() => {
    const surface = surfaceRef.current;
    const sheet = sheetRef.current;
    if (!open || !surface || !sheet || typeof ResizeObserver === "undefined")
      return;
    let first = true;
    let running: AnimationPlaybackControls | undefined;
    const observer = new ResizeObserver(() => {
      // The first report is the size the opening spring is already heading to.
      if (first) return void (first = false);
      running?.stop();
      const size = { width: sheet.offsetWidth, height: sheet.offsetHeight };
      if (reduced) Object.assign(surface.style, px(size));
      else running = animate(surface, size, settleSpring);
    });
    observer.observe(sheet);
    return () => {
      observer.disconnect();
      running?.stop();
    };
  }, [open, reduced]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && !event.composedPath().includes(root)) closeSheet(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  // Keep the hint inside the viewport after it is placed.
  useLayoutEffect(() => {
    const element = hintRef.current;
    if (!element || !hint) return;
    const rect = element.getBoundingClientRect();
    const dx = Math.max(
      HINT_GAP - rect.left,
      Math.min(0, window.innerWidth - HINT_GAP - rect.right),
    );
    const dy = Math.max(
      HINT_GAP - rect.top,
      Math.min(0, window.innerHeight - HINT_GAP - rect.bottom),
    );
    element.style.left = `${hint.x + dx}px`;
    element.style.top = `${hint.y + dy}px`;
  }, [hint]);

  useEffect(
    () => () => {
      clearTimeout(hintTimer.current);
      clearTimeout(coolTimer.current);
    },
    [],
  );

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      dismissHint();
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      closeSheet(true);
      return;
    }
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : event.key === "Home"
            ? -Infinity
            : event.key === "End"
              ? Infinity
              : 0;
    const current =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>(controlSelector)
        : null;
    const group = current?.parentElement;
    if (!step || !current || !group) return;
    const controls = [...group.querySelectorAll<HTMLElement>(controlSelector)];
    const index = controls.indexOf(current);
    const next =
      step === -Infinity
        ? 0
        : step === Infinity
          ? controls.length - 1
          : (index + step + controls.length) % controls.length;
    event.preventDefault();
    controls[next]?.focus({ preventScroll: true });
  }

  const hintHandlers = {
    // Move, not enter: a bar settling under a resting cursor shows no hint.
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse")
        requestHint(event.currentTarget, false);
    },
    onPointerLeave: clearHint,
    onPointerDown: dismissHint,
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(":focus-visible"))
        requestHint(event.currentTarget, true);
    },
    onBlur: clearHint,
  };
  const layoutTransition = reduced ? { duration: 0 } : settleSpring;

  return (
    <nav
      ref={rootRef}
      aria-label={label}
      className={["dock", className].filter(Boolean).join(" ")}
      data-view={open ? "sheet" : "collapsed"}
      data-edge={edge}
      data-vertical={edge === "left" || edge === "right"}
      data-align-end={alignEnd}
      style={{ "--dock-count": barItems.length + 1, ...style } as CSSProperties}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        if (open && next instanceof Node) closeSheet(false);
        else if (!open) dismissHint();
      }}
    >
      <div ref={surfaceRef} className="dock__surface">
        <div
          ref={barRef}
          className="dock__bar"
          aria-hidden={open}
          inert={open}
          onPointerEnter={() => clearTimeout(coolTimer.current)}
          onPointerLeave={(event) => {
            if (event.pointerType !== "mouse") return;
            clearHint();
            clearTimeout(coolTimer.current);
            coolTimer.current = window.setTimeout(() => {
              warm.current = false;
            }, HINT_COOL_MS);
          }}
        >
          {barItems.map((item) => (
            <motion.button
              key={item.id}
              layout="position"
              transition={layoutTransition}
              type="button"
              className="dock__button"
              data-dock-item={item.id}
              aria-label={item.label}
              aria-current={item.id === activeId ? "page" : undefined}
              onClick={(event) => choose(item, event.detail === 0)}
              {...hintHandlers}
            >
              {item.icon}
            </motion.button>
          ))}
          <motion.button
            layout="position"
            transition={layoutTransition}
            type="button"
            className="dock__button"
            data-dock-item="more"
            aria-label={moreLabel}
            aria-expanded={open}
            aria-controls={sheetId}
            onClick={(event) => openSheet(event.detail === 0)}
            {...hintHandlers}
          >
            <Svg markup={icons.drawer} />
          </motion.button>
        </div>
        <div
          ref={sheetRef}
          id={sheetId}
          className="dock__sheet"
          aria-hidden={!open}
          inert={!open}
        >
          {sheetItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="dock__row"
              data-dock-item={item.id}
              aria-current={item.id === activeId ? "page" : undefined}
              onClick={(event) => choose(item, event.detail === 0)}
            >
              <span className="dock__glyph" aria-hidden="true">
                <Relabel id={item.label} reduced={reduced} icon>
                  {item.icon}
                </Relabel>
              </span>
              <span className="dock__label">
                <Relabel id={item.label} reduced={reduced}>
                  {item.label}
                </Relabel>
              </span>
            </button>
          ))}
          <button
            type="button"
            className="dock__row"
            data-dock-item="close"
            onClick={(event) => closeSheet(event.detail === 0)}
          >
            <span className="dock__glyph" aria-hidden="true">
              <Svg markup={icons.close} />
            </span>
            <span className="dock__label">
              <span>{closeLabel}</span>
            </span>
          </button>
        </div>
      </div>
      {hint && !open && (
        <div
          ref={hintRef}
          className="dock-hint"
          aria-hidden="true"
          style={{ left: hint.x, top: hint.y }}
        >
          {hint.text}
        </div>
      )}
    </nav>
  );
}

const px = (size: { width: number; height: number }) => ({
  width: `${size.width}px`,
  height: `${size.height}px`,
});

function Svg({ markup }: { markup: string }) {
  return (
    <span
      className="dock__svg"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

// Crossfade content when an item relabels in place, e.g. Copy → Copied.
// Both copies share one grid cell, so the row never changes size mid-swap.
function Relabel({
  id,
  icon = false,
  reduced,
  children,
}: {
  id: string;
  icon?: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  const shift = reduced ? {} : icon ? { scale: 0.7 } : { y: 4 };
  const leave = reduced ? {} : icon ? { scale: 0.7 } : { y: -4 };
  return (
    <AnimatePresence initial={false}>
      <motion.span
        key={id}
        initial={{ opacity: 0, ...shift }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, ...leave }}
        transition={
          reduced ? fade : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
