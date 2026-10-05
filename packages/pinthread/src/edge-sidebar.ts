// Edge sidebar geometry: a panels-inspired floating sidebar that docks to then
// parks off a viewport edge, and peeks out while collapsed. The park/peek
// translates keep the panel's placed position stable; only the horizontal
// offset changes. See NOTICE.md for the panels reference.
import { constrain, type Placement } from "./floating-drag.js";

export const EDGE_SIDEBAR_WIDTH = 380;
export const EDGE_MARGIN = 16;
/** How many pixels of the closed sidebar stay visible while peeking. */
export const EDGE_PEEK_SLIVER = 76;
/** Clearance the closed sidebar parks beyond the viewport edge. */
export const EDGE_PARK_CLEARANCE = 24;
/** Panel height cap; a taller viewport still parks flush against the edge. */
export const EDGE_SIDEBAR_MAX_HEIGHT = 680;
export const EDGE_SIDEBAR_MIN_WIDTH = 240;
export const EDGE_SIDEBAR_MIN_HEIGHT = 200;

export type EdgeResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface EdgeBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clampSize = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Resize from an edge or corner. Same screen-space math as panels. */
export function resizeEdgeBox(
  dir: EdgeResizeDir,
  start: EdgeBox,
  dx: number,
  dy: number,
  vw: number,
  vh: number,
): EdgeBox {
  const right = start.left + start.width;
  const bottom = start.top + start.height;
  const maxHeight = Math.min(vh - 2 * EDGE_MARGIN, EDGE_SIDEBAR_MAX_HEIGHT);
  let left = start.left;
  let top = start.top;
  let width = start.width;
  let height = start.height;
  if (dir.includes("e"))
    width = clampSize(
      start.width + dx,
      EDGE_SIDEBAR_MIN_WIDTH,
      vw - start.left - EDGE_MARGIN,
    );
  if (dir.includes("w")) {
    width = clampSize(
      start.width - dx,
      EDGE_SIDEBAR_MIN_WIDTH,
      right - EDGE_MARGIN,
    );
    left = right - width;
  }
  if (dir.includes("s"))
    height = clampSize(
      start.height + dy,
      EDGE_SIDEBAR_MIN_HEIGHT,
      Math.min(vh - start.top - EDGE_MARGIN, maxHeight),
    );
  if (dir.includes("n")) {
    height = clampSize(
      start.height - dy,
      EDGE_SIDEBAR_MIN_HEIGHT,
      Math.min(bottom - EDGE_MARGIN, maxHeight),
    );
    top = bottom - height;
  }
  return { left, top, width, height };
}

export type EdgeSide = "left" | "right";

export interface EdgeSidebarGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  side: EdgeSide;
}

/** The sidebar's on-screen placement, docked to the right by default. */
export function edgeSidebarPlacement(
  placement: Placement | undefined,
  width: number,
  height: number,
  vw: number,
  vh: number
): EdgeSidebarGeometry {
  const p = constrain(
    placement ?? {
      x: Math.max(EDGE_MARGIN, vw - width - EDGE_MARGIN),
      y: EDGE_MARGIN,
    },
    width,
    height,
    vw,
    vh
  );
  const side: EdgeSide = p.edgeX === "left" ? "left" : "right";
  return { x: p.x, y: p.y, width, height, side };
}

/**
 * Horizontal translates (style px) that park the sidebar off its docked edge
 * and reveal it as a peek sliver. Applied on top of the placed position, so a
 * dragged placement keeps its park direction consistent with its dock.
 */
export function edgeSidebarOffsets(
  g: EdgeSidebarGeometry,
  vw: number
): { parked: number; peek: number } {
  const parkedLeft =
    g.side === "right"
      ? vw + EDGE_PARK_CLEARANCE
      : -(g.width + EDGE_PARK_CLEARANCE);
  const peekLeft =
    g.side === "right" ? vw - EDGE_PEEK_SLIVER : EDGE_PEEK_SLIVER - g.width;
  return { parked: parkedLeft - g.x, peek: peekLeft - g.x };
}