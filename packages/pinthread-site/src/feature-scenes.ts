export function mountFeatureScenes() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const playIcon =
    document.querySelector<HTMLTemplateElement>("#play-icon")!.innerHTML;
  document
    .querySelectorAll<HTMLElement>('[data-example]:not([data-example="connect"])')
    .forEach((example) => {
      const comments = example.dataset.example === "comments";
      const durations = comments
        ? [1600, 1400, 1000, 1000]
        : [2100, 900, 900, 2000, 3200];
      const play = example.querySelector<HTMLButtonElement>(
        "[data-example-play]"
      )!;
      const pauseIcon = play.innerHTML;
      const label = comments ? "comment example" : "prompt example";
      let step = reduced.matches ? durations.length - 1 : 0;
      let paused = reduced.matches;
      let visible = false;
      let timer = 0;
      let thread = 3;
      const track = example.querySelector(".conversation-track");
      const render = () => {
        example.dataset.step = String(step);
        if (comments) {
          example.querySelector(".queue-count")!.textContent =
            step === 2 ? "1 open" : "2 open";
          example
            .querySelectorAll<HTMLElement>(".conversation-card")
            .forEach((card, index) => {
              card.setAttribute(
                "aria-hidden",
                String(index === 2 && step !== 3)
              );
              card
                .querySelector(".conversation-response")
                ?.setAttribute(
                  "aria-hidden",
                  String(index !== 0 || step === 0)
                );
              card
                .querySelector(".queue-resolved")
                ?.setAttribute("aria-hidden", String(index !== 0 || step < 2));
            });
        }
        example.dataset.paused = String(paused || !visible || document.hidden);
        example
          .querySelector(".coding-response")
          ?.setAttribute("aria-hidden", String(step < 2));
        example
          .querySelector(".coding-result")
          ?.setAttribute("aria-hidden", String(step < 3));
        example
          .querySelector(".window-comments")
          ?.setAttribute("aria-hidden", String(step > 1));
        example
          .querySelector(".window-complete")
          ?.setAttribute("aria-hidden", String(step !== 4));
        example
          .querySelectorAll<HTMLElement>("[data-reveal]")
          .forEach((node) => {
            const shown = step >= Number(node.dataset.reveal);
            node.dataset.shown = String(shown);
            node.setAttribute("aria-hidden", String(!shown));
          });
        example
          .querySelectorAll<HTMLButtonElement>("[data-example-step]")
          .forEach((button) => {
            const active = comments
              ? step === Number(button.dataset.exampleStep)
              : Math.floor(step / 2) === Number(button.dataset.exampleStep) / 2;
            button.setAttribute("aria-pressed", String(active));
          });
        example
          .querySelector(".copy-before")
          ?.setAttribute("aria-hidden", String(step === 1));
        example
          .querySelector(".copy-after")
          ?.setAttribute("aria-hidden", String(step !== 1));
        const status = example.querySelector("[data-example-status]");
        if (status)
          status.textContent = [
            "New comments arrive",
            "A teammate replies",
            "Resolved. On to the next.",
            "Making room for fresh feedback",
          ][step]!;
        play.innerHTML = paused ? playIcon : pauseIcon;
        play.setAttribute(
          "aria-label",
          `${paused ? "Play" : "Pause"} ${label}`
        );
      };
      const schedule = () => {
        clearTimeout(timer);
        render();
        if (paused || !visible || document.hidden) return;
        timer = window.setTimeout(() => {
          if (comments && step === 3 && track?.firstElementChild) {
            const oldest = track.firstElementChild as HTMLElement;
            const topics = [
              "Maya: Give the headline more room.",
              "Jules: Make the button clearer.",
              "Alex: Check the mobile spacing.",
              "Sam: Increase the contrast on this link.",
              "Maya: Keep this label on one line.",
              "Jules: Give the image rounded corners.",
            ];
            oldest.dataset.thread = String(thread % topics.length);
            oldest
              .querySelector(".product-thread")!
              .setAttribute("aria-label", topics[thread % topics.length]!);
            thread++;
            track.append(oldest);
          }
          step = (step + 1) % durations.length;
          schedule();
        }, durations[step]);
      };
      play.addEventListener("click", () => {
        paused = !paused;
        schedule();
      });
      example
        .querySelector("[data-example-replay]")!
        .addEventListener("click", () => {
          step = reduced.matches ? durations.length - 1 : 0;
          paused = reduced.matches;
          schedule();
        });
      example
        .querySelectorAll<HTMLButtonElement>("[data-example-step]")
        .forEach((button) => {
          button.addEventListener("click", () => {
            step = Number(button.dataset.exampleStep);
            paused = true;
            schedule();
          });
        });
      new IntersectionObserver(
        ([entry]) => {
          visible = !!entry?.isIntersecting;
          schedule();
        },
        { threshold: 0.2 }
      ).observe(example);
      document.addEventListener("visibilitychange", schedule);
      reduced.addEventListener("change", () => {
        paused = reduced.matches;
        if (paused) step = durations.length - 1;
        schedule();
      });
      schedule();
    });
}
