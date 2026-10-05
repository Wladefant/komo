type Point = { x: number; y: number };

// Sample once, then let the browser animate transforms without a JS frame loop.
export function createTryCursors(block: HTMLElement) {
  const tracks = [...block.querySelectorAll<HTMLElement>(".try-cursor-track")];
  let animations: Animation[] = [];
  let playing = false;
  let size = "";
  const rebuild = (width: number, height: number) => {
    if (!width || !height || size === `${width}:${height}`) return;
    size = `${width}:${height}`;
    const content = block.querySelector<HTMLElement>(".try-content");
    const center = { x: width / 2, y: height / 2 };
    const innerX = (content?.offsetWidth ?? 140) / 2 + 48;
    const innerY = (content?.offsetHeight ?? 120) / 2 + 44;
    const outerX = Math.max(innerX, width / 2 - 34);
    const outerY = Math.max(innerY, height / 2 - 28);
    const position = (phase: number, spread: number): Point => {
      const x = Math.cos(phase),
        y = Math.sin(phase);
      // A rounded rectangular route clears the label without orbiting at a fixed speed.
      return {
        x:
          (center.x +
            Math.sign(x) *
              Math.pow(Math.abs(x), 0.25) *
              (innerX + (outerX - innerX) * spread)) /
          width,
        y:
          (center.y +
            Math.sign(y) *
              Math.pow(Math.abs(y), 0.25) *
              (innerY + (outerY - innerY) * spread)) /
          height,
      };
    };
    const times = animations.map((animation) =>
      Number(animation.currentTime ?? 0),
    );
    animations.forEach((animation) => animation.cancel());
    animations = [];
    tracks.forEach((track, index) => {
      const pointer = track.querySelector<HTMLElement>(
        ".agent-cursor > .glyph",
      );
      if (!pointer) return;
      let seed = 73 + index * 191;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const frames: { point: Point; angle: number; time: number }[] = [];
      let time = 0;
      let angle = 0;
      const startPhase = -2.6 + index * 2.1;
      let phase = startPhase;
      let spread = 0.6;
      let previous = position(phase, spread);
      let firstAngle = 0;
      const turn = (target: number) =>
        angle + ((((target - angle + 180) % 360) + 360) % 360) - 180;
      const add = () => frames.push({ point: previous, angle, time });
      add();
      for (let leg = 0; leg < 10; leg++) {
        const nextPhase =
          leg === 9
            ? phase +
              Math.atan2(
                Math.sin(startPhase - phase),
                Math.cos(startPhase - phase),
              )
            : phase +
              (random() > 0.25 ? 1 : -1) *
                (leg % 3 === 1 ? 0.18 : 0.65 + random() * 1.25);
        const nextSpread = leg === 9 ? 0.6 : 0.2 + random() * 0.8;
        time += 260 + random() * 850;
        add();
        const sample = (t: number) =>
          position(
            phase + (nextPhase - phase) * t,
            spread + (nextSpread - spread) * t,
          );
        const lead = sample(0.01);
        angle = turn(
          (Math.atan2(
            (lead.y - previous.y) * height,
            (lead.x - previous.x) * width,
          ) *
            180) /
            Math.PI +
            135,
        );
        if (!leg) {
          firstAngle = angle;
          frames[0].angle = angle;
        }
        time += 160;
        add();
        const duration =
          380 + Math.abs(nextPhase - phase) * 430 + random() * 220;
        const startTime = time;
        const steps = Math.max(60, Math.ceil(Math.abs(nextPhase - phase) * 60));
        for (let step = 1; step <= steps; step++) {
          const progress = step / steps;
          const t = progress * progress * (3 - 2 * progress);
          const point = sample(t);
          angle = turn(
            (Math.atan2(
              (point.y - previous.y) * height,
              (point.x - previous.x) * width,
            ) *
              180) /
              Math.PI +
              135,
          );
          previous = point;
          time = startTime + duration * progress;
          add();
        }
        phase = nextPhase;
        spread = nextSpread;
      }
      time += 500;
      add();
      time += 220;
      angle = turn(firstAngle);
      add();
      const positions = frames.map((frame) => ({
        offset: frame.time / time,
        transform: `translate(${frame.point.x * 100}%, ${frame.point.y * 100}%)`,
      }));
      const rotations = frames.map((frame) => ({
        offset: frame.time / time,
        transform: `rotate(${frame.angle}deg)`,
      }));
      const movement = track.animate(positions, {
        duration: time,
        iterations: Infinity,
      });
      const rotation = pointer.animate(rotations, {
        duration: time,
        iterations: Infinity,
      });
      for (const animation of [movement, rotation]) {
        animation.currentTime = times[animations.length] ?? index * 2400;
        if (!playing) animation.pause();
        animations.push(animation);
      }
    });
  };
  new ResizeObserver(([entry]) => {
    if (entry) rebuild(block.clientWidth, block.clientHeight);
  }).observe(block);
  return {
    setPlaying(value: boolean) {
      playing = value;
      animations.forEach((animation) =>
        value ? animation.play() : animation.pause(),
      );
    },
  };
}
