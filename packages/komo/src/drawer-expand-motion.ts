/** Motion shared by the drawer menu expand and the drawer → edge sidebar hand-off. */

export const drawerExpandSpring = {
  type: "spring",
  duration: 0.4,
  bounce: 0.24,
} as const;

export const drawerExpandCompress = {
  duration: 0.1,
  ease: [0.4, 0, 0.2, 1],
} as const;

export const drawerCollapse = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
} as const;

export const drawerBarExit = { duration: 0.15 } as const;

export const drawerBarEnter = {
  duration: 0.22,
  delay: 0.08,
  ease: "easeOut",
} as const;

export const drawerRowEnter = {
  type: "spring",
  duration: 0.4,
  bounce: 0.3,
} as const;

export const drawerRowExit = {
  type: "spring",
  duration: 0.12,
  bounce: 0.3,
} as const;

export const drawerRowEnterDelay = 0.2;
export const drawerRowStagger = 0.02;

/** Same squish the drawer shell uses before it springs open. */
export function compressedDrawerSize(barWidth: number, barHeight: number) {
  return {
    width: Math.min(barWidth, barWidth > 250 ? 280 : 200),
    height: barHeight > 52 ? 32 : 28,
  };
}

/** Bottom-center anchor, matching `.dock__surface`. */
export function boxFromAnchor(
  anchorX: number,
  anchorBottom: number,
  width: number,
  height: number,
) {
  return {
    left: anchorX - width / 2,
    top: anchorBottom - height,
    width,
    height,
  };
}
