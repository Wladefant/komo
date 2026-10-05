import './logo.css';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll<HTMLElement>('.pinthread-logo').forEach((logo) => {
  let visible = false;
  let introduced = false;
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    clearTimeout(finish);
    logo.classList.remove('play', 'intro');
    playing = false;
  };
  const schedule = () => {
    clearTimeout(timer);
    if (visible && !document.hidden && !reducedMotion.matches)
      timer = setTimeout(() => play(), 8000);
  };
  const play = (intro = false) => {
    if (playing || !visible || document.hidden || reducedMotion.matches) return;
    clearTimeout(timer);
    playing = true;
    logo.classList.add(intro ? 'intro' : 'play');
    finish = setTimeout(() => {
      logo.classList.remove('play', 'intro');
      playing = false;
      schedule();
    }, intro ? 1400 : 1050);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { stop(); return; }
    if (!introduced) { introduced = true; play(true); }
    else schedule();
  });
  observer.observe(logo);
  logo.closest('a')?.addEventListener('pointerenter', () => play());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else schedule();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stop();
    else schedule();
  });
});
