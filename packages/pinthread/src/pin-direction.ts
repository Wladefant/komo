type Bounds = { left: number; top: number; right: number; bottom: number };

export function pinDirection(
  point: { x: number; y: number; component?: Bounds },
  viewportWidth: number
): "left" | "right" {
  const fallback = point.x < viewportWidth / 2 ? "right" : "left";
  const bounds = point.component;
  if (!bounds) return fallback;
  const { left, top, right, bottom } = bounds;
  if (right <= left || bottom <= top) return fallback;
  // Distance to the rectangular perimeter, including just outside the component.
  const outside = Math.hypot(
    Math.max(left - point.x, 0, point.x - right),
    Math.max(top - point.y, 0, point.y - bottom)
  );
  const distance =
    outside ||
    Math.min(point.x - left, right - point.x, point.y - top, bottom - point.y);
  const center = (left + right) / 2;
  if (distance > 100 || point.x === center) return fallback;
  return point.x < center ? "right" : "left";
}
