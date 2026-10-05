export function mountUsageScene() {
  const demo = document.querySelector<HTMLElement>("[data-usage-demo]");
  if (!demo) return;
  const count = demo.querySelector<HTMLElement>("[data-usage-comments]")!;
  const projects = demo.querySelector<HTMLElement>("[data-usage-projects]")!;
  const slots = [...demo.querySelectorAll<HTMLElement>(".product-slots span")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const frames = [
    { comments: 42, projects: 1 },
    { comments: 98, projects: 2 },
    { comments: 186, projects: 3 },
    { comments: 218, projects: 3 },
    { comments: 132, projects: 2 },
    { comments: 42, projects: 1 },
  ];
  let elapsed = 0;
  let last = 0;
  let raf = 0;
  let visible = false;
  let paused = reduced.matches;
  function draw() {
    const position = elapsed / 2400;
    const index = Math.floor(position) % frames.length;
    const from = frames[index]!;
    const to = frames[(index + 1) % frames.length]!;
    const fraction = Math.min(1, Math.max(0, ((position % 1) - 0.25) / 0.55));
    const eased = fraction * fraction * (3 - 2 * fraction);
    const comments = Math.round(
      from.comments + (to.comments - from.comments) * eased,
    );
    const projectCount = from.projects + (to.projects - from.projects) * eased;
    count.textContent = String(comments);
    projects.textContent = String(Math.round(projectCount));
    demo!.style.setProperty("--usage-progress", `${(comments / 250) * 100}%`);
    slots.forEach((slot, i) =>
      slot.style.setProperty(
        "--slot-progress",
        String(Math.max(0, Math.min(1, projectCount - i))),
      ),
    );
  }
  function tick(now: number) {
    if (last) elapsed += Math.min(now - last, 100);
    last = now;
    draw();
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(raf);
    last = 0;
    demo!.setAttribute(
      "aria-label",
      paused ? "Play usage animation" : "Pause usage animation",
    );
    demo!.setAttribute("aria-pressed", String(paused));
    if (!paused && visible && !document.hidden && !reduced.matches)
      raf = requestAnimationFrame(tick);
  }
  const toggle = () => {
    paused = !paused;
    sync();
  };
  demo.addEventListener("click", toggle);
  demo.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });
  new IntersectionObserver(
    ([entry]) => {
      visible = !!entry?.isIntersecting;
      sync();
    },
    { threshold: 0.25 },
  ).observe(demo);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", () => {
    paused = reduced.matches;
    elapsed = 0;
    draw();
    sync();
  });
  draw();
  sync();
}
