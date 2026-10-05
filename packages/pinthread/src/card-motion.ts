export function springStep(
  value: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness = 600,
  damping = 34
) {
  const nextVelocity =
    velocity + ((target - value) * stiffness - velocity * damping) * dt;
  return { value: value + nextVelocity * dt, velocity: nextVelocity };
}

export function cardMotion(onFrame: () => void) {
  let key: string | null = null;
  let node: HTMLElement | null = null;
  let frame = 0;
  let lastTime = 0;
  let x = 0,
    y = 0,
    vx = 0,
    vy = 0;
  let targetX = 0,
    targetY = 0;
  let squeeze = 0,
    squeezeVelocity = 0;
  let horizontal = 1;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const paint = () => {
    if (!node) return;
    node.style.translate = `${x - targetX}px ${y - targetY}px`;
    node.style.scale = `${1 - squeeze * horizontal} ${1 - squeeze * (1 - horizontal)}`;
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    vx = vy = squeeze = squeezeVelocity = 0;
    if (node) {
      node.style.translate = "";
      node.style.scale = "";
      node.style.willChange = "";
    }
  };
  const tick = (time: number) => {
    if (!node?.isConnected || reduced.matches) {
      stop();
      return;
    }
    const elapsed = Math.min((time - lastTime) / 1000, 0.032);
    lastTime = time;
    // Small substeps keep the spring stable on slower displays.
    const steps = Math.max(1, Math.ceil(elapsed / 0.008));
    for (let i = 0; i < steps; i++) {
      const dt = elapsed / steps;
      const sx = springStep(x, vx, targetX, dt);
      const sy = springStep(y, vy, targetY, dt);
      x = sx.value;
      vx = sx.velocity;
      y = sy.value;
      vy = sy.velocity;
      const speed = Math.hypot(vx, vy);
      if (speed > 30) horizontal = Math.abs(vx) / (Math.abs(vx) + Math.abs(vy));
      const shape = springStep(
        squeeze,
        squeezeVelocity,
        Math.min(0.035, speed / 24000),
        dt,
        220,
        15
      );
      squeeze = Math.max(-0.012, Math.min(0.04, shape.value));
      squeezeVelocity = shape.velocity;
    }
    paint();
    onFrame();
    if (
      Math.hypot(x - targetX, y - targetY) < 0.1 &&
      Math.hypot(vx, vy) < 1 &&
      Math.abs(squeeze) < 0.0002 &&
      Math.abs(squeezeVelocity) < 0.002
    ) {
      x = targetX;
      y = targetY;
      stop();
      onFrame();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  return {
    place(
      nextKey: string | null,
      element: HTMLElement,
      left: number,
      top: number,
      follow: boolean
    ) {
      if (key !== nextKey) {
        stop();
        key = nextKey;
        x = left;
        y = top;
      }
      node = element;
      targetX = left;
      targetY = top;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      if (reduced.matches || (!follow && !frame)) {
        x = left;
        y = top;
        stop();
        return;
      }
      paint();
      element.style.willChange = "translate, scale";
      if (!frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    },
    stop,
  };
}
