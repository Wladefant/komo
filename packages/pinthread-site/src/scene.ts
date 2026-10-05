const stories = [
  {
    author: "Designer",
    initial: "D",
    comment: "Give the headline a little more room to breathe.",
    replyAuthor: "Engineer",
    replyInitial: "E",
    reply: "On it. Adjusting the spacing without changing the mobile layout.",
  },
  {
    author: "Engineer",
    initial: "E",
    comment: "Make the add to cart button easier to find.",
    replyAuthor: "Designer",
    replyInitial: "D",
    reply: "Updated the button contrast and spacing.",
  },
  {
    author: "PM",
    initial: "P",
    comment: "Can we check the dashboard navigation with a keyboard?",
    replyAuthor: "Engineer",
    replyInitial: "E",
    reply: "Focus states are in. Tab order and Escape both checked.",
  },
];
export function mountScene() {
  const scene = document.querySelector<HTMLElement>(".review-scene");
  if (!scene) return;
  const stage = scene.querySelector<HTMLElement>(".scene-stage")!;
  const play = scene.querySelector<HTMLButtonElement>("[data-scene-play]")!;
  const card = scene.querySelector<HTMLElement>(".agent-card")!;
  const cursor = scene.querySelector<HTMLElement>(".agent-cursor")!;
  const status = scene.querySelector<HTMLElement>("[data-scene-status]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pauseIcon = play.innerHTML;
  const playIcon =
    document.querySelector<HTMLTemplateElement>("#play-icon")!.innerHTML;
  let story = 0,
    phase = 0,
    timer = 0,
    paused = reduced.matches,
    visible = true;
  const durations = [3600, 4300, 1700];
  function setText(selector: string, value: string) {
    scene!.querySelector(selector)!.textContent = value;
  }
  function alignTarget() {
    const target = stage.querySelector<HTMLElement>(
      `[data-review-target="${story}"]`,
    )!;
    const box = target.getBoundingClientRect();
    const frame = stage.getBoundingClientRect();
    const padding = 5;
    stage.style.setProperty(
      "--target-left",
      `${box.left - frame.left - padding}px`,
    );
    stage.style.setProperty(
      "--target-top",
      `${box.top - frame.top - padding}px`,
    );
    stage.style.setProperty("--target-width", `${box.width + padding * 2}px`);
    stage.style.setProperty("--target-height", `${box.height + padding * 2}px`);
    stage.querySelectorAll<HTMLElement>(".scene-pin").forEach((pin) => {
      pin.dataset.facing =
        box.left - frame.left < frame.width / 2 ? "left" : "right";
    });
  }
  new ResizeObserver(alignTarget).observe(stage);
  function render() {
    const item = stories[story]!;
    stage.dataset.story = String(story);
    stage.querySelectorAll<HTMLElement>("[data-site]").forEach((site) => {
      site.setAttribute(
        "aria-hidden",
        String(Number(site.dataset.site) !== story),
      );
    });
    setText(".hero-site-label", ["Studio", "Store", "Dashboard"][story]!);
    alignTarget();
    stage.dataset.phase = ["comment", "reply", "resolved"][phase];
    card.setAttribute("aria-hidden", String(phase === 2));
    scene!
      .querySelector(".agent-reply")!
      .setAttribute("aria-hidden", String(phase !== 1));
    scene!
      .querySelector(".scene-resolved")!
      .setAttribute("aria-hidden", String(phase !== 2));
    setText("[data-author]", item.author);
    setText("[data-author-initial]", item.initial);
    setText("[data-comment]", item.comment);
    setText("[data-reply-author]", item.replyAuthor);
    setText("[data-reply-initial]", item.replyInitial);
    setText("[data-reply]", item.reply);
    setText("[data-cursor-name]", phase === 0 ? item.author : item.replyAuthor);
    cursor.dataset.agent = phase === 0 ? item.initial : item.replyInitial;
    status.textContent =
      phase === 0
        ? `${item.author} left a comment`
        : phase === 1
          ? `${item.replyAuthor} replied`
          : `${item.replyAuthor} resolved the thread`;
    scene!
      .querySelectorAll<HTMLButtonElement>(
        "[data-scene-step], button[data-story]",
      )
      .forEach((button) => {
        if (button.matches(".scene-pin")) {
          const active = Number(button.dataset.story) === story;
          button.tabIndex = active ? 0 : -1;
          button.setAttribute("aria-hidden", String(!active));
        }
        button.setAttribute(
          "aria-pressed",
          String(
            Number(button.dataset.sceneStep ?? button.dataset.story) === story,
          ),
        );
      });
    play.innerHTML = paused ? playIcon : pauseIcon;
    play.setAttribute(
      "aria-label",
      paused ? "Play walkthrough" : "Pause walkthrough",
    );
  }
  function schedule() {
    clearTimeout(timer);
    if (paused || !visible || document.hidden) return;
    timer = window.setTimeout(() => {
      phase = (phase + 1) % 3;
      if (!phase) story = (story + 1) % stories.length;
      render();
      schedule();
    }, durations[phase]);
  }
  function choose(index: number) {
    paused = true;
    story = index;
    phase = 1;
    render();
    schedule();
    if (!reduced.matches)
      card.animate(
        [
          { opacity: 0, transform: "translateY(5px) scale(.96)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        { duration: 220, easing: "cubic-bezier(.16,1,.3,1)" },
      );
  }
  scene
    .querySelectorAll<HTMLButtonElement>(
      "[data-scene-step], button[data-story]",
    )
    .forEach((button) => {
      button.addEventListener("click", () =>
        choose(Number(button.dataset.sceneStep ?? button.dataset.story)),
      );
    });
  play.addEventListener("click", () => {
    paused = !paused;
    render();
    schedule();
  });
  scene.querySelector("[data-scene-replay]")!.addEventListener("click", () => {
    story = 0;
    phase = 0;
    paused = reduced.matches;
    render();
    schedule();
  });
  // Stop background work when the example is offscreen or the tab is hidden.
  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    schedule();
  }).observe(scene);
  document.addEventListener("visibilitychange", schedule);
  reduced.addEventListener("change", () => {
    paused = reduced.matches;
    render();
    schedule();
  });
  render();
  schedule();
}
