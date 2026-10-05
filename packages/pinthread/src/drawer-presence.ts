// Panels-inspired edge reveal; see NOTICE.md.
export function drawerPresence(
  toolbar: HTMLElement,
  keepOpen: () => boolean,
  signal: AbortSignal,
  autoHide = true
) {
  if (!autoHide) return { show() {}, update() {} };
  let timer = 0;
  let pointerFrame = 0;
  let peekTimer = 0;
  let peekEndTimer = 0;
  let introEndTimer = 0;
  let pointer: { x: number; y: number } | undefined;
  const canHide = matchMedia("(hover: hover) and (pointer: fine)");
  if (canHide.matches) {
    toolbar.dataset.away = "true";
    toolbar.dataset.intro = "true";
    toolbar.dataset.introWait = "true";
  }
  const setDirection = () => {
    const rect = toolbar.getBoundingClientRect();
    const gaps = [
      rect.left,
      window.innerWidth - rect.right,
      rect.top,
      window.innerHeight - rect.bottom,
    ];
    const side = gaps.indexOf(Math.min(...gaps));
    // Move the intact dock through the viewport edge; never clip its top away.
    toolbar.style.setProperty(
      "--drawer-peek-y",
      `${window.innerHeight - rect.top - rect.height / 2}px`
    );
    toolbar.style.setProperty(
      "--drawer-intro-y",
      `${window.innerHeight - rect.top + 8}px`
    );
    toolbar.style.setProperty(
      "--drawer-away-x",
      `${side === 0 ? -24 : side === 1 ? 24 : 0}px`
    );
    toolbar.style.setProperty(
      "--drawer-away-y",
      `${side === 2 ? -24 : side === 3 ? 24 : 0}px`
    );
  };
  const show = () => {
    clearTimeout(peekTimer);
    clearTimeout(peekEndTimer);
    delete toolbar.dataset.peek;
    delete toolbar.dataset.intro;
    delete toolbar.dataset.introWait;
    clearTimeout(introEndTimer);
    clearTimeout(timer);
    timer = 0;
    delete toolbar.dataset.away;
  };
  const update = () => {
    if (!canHide.matches || keepOpen()) {
      show();
      return;
    }
    const rect = toolbar.getBoundingClientRect();
    const near =
      pointer &&
      pointer.x >= rect.left - 72 &&
      pointer.x <= rect.right + 72 &&
      pointer.y >= rect.top - 72 &&
      pointer.y <= rect.bottom + 72;
    const menu = toolbar.querySelector(".dock");
    const focused =
      toolbar.getRootNode() instanceof ShadowRoot &&
      toolbar.contains((toolbar.getRootNode() as ShadowRoot).activeElement);
    if (
      !canHide.matches ||
      keepOpen() ||
      near ||
      focused ||
      toolbar.dataset.dragging ||
      (menu && menu.getAttribute("data-view") !== "collapsed")
    ) {
      show();
      return;
    }
    if (timer || toolbar.dataset.away) return;
    timer = window.setTimeout(() => {
      timer = 0;
      setDirection();
      toolbar.dataset.away = "true";
    }, 450);
  };
  const schedulePeek = () => {
    if (!canHide.matches || signal.aborted) return;
    peekTimer = window.setTimeout(() => {
      if (!toolbar.dataset.away || keepOpen()) return;
      setDirection();
      // Establish the just-offscreen position before enabling the entrance transition.
      const menu = toolbar.querySelector<HTMLElement>(".dock");
      if (menu) getComputedStyle(menu).translate;
      delete toolbar.dataset.introWait;
      toolbar.dataset.peek = "true";
      peekEndTimer = window.setTimeout(() => {
        delete toolbar.dataset.peek;
        introEndTimer = window.setTimeout(() => {
          delete toolbar.dataset.intro;
        }, 300);
      }, 900);
    }, 700);
  };
  if (document.readyState === "complete") schedulePeek();
  else window.addEventListener("load", schedulePeek, { once: true, signal });
  document.addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!pointerFrame)
        pointerFrame = requestAnimationFrame(() => {
          pointerFrame = 0;
          update();
        });
    },
    { passive: true, signal }
  );
  toolbar.addEventListener("focusin", show, { signal });
  toolbar.addEventListener("focusout", () => queueMicrotask(update), {
    signal,
  });
  const observer = new MutationObserver(update);
  observer.observe(toolbar, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-view", "data-dragging"],
  });
  signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
      cancelAnimationFrame(pointerFrame);
      clearTimeout(peekTimer);
      clearTimeout(peekEndTimer);
      clearTimeout(introEndTimer);
      observer.disconnect();
    },
    { once: true }
  );
  return { show, update };
}
