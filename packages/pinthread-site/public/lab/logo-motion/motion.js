const stages = [...document.querySelectorAll('[data-motion]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const loopButton = document.querySelector('#loop');
let mode = 'soft';
let finishTimer;
let loopTimer;
let looping = !reduced.matches;
let inView = true;
let playing = false;
const descriptions = {
  soft: 'A gentle squeeze, a fuller lift, a soft landing.',
  ripple: 'A small wave travels through the letters.',
  wiggle: 'A quick hello, with a little elastic follow-through.',
};
function schedule() {
  clearTimeout(loopTimer);
  if (looping && !reduced.matches && inView && !document.hidden)
    loopTimer = setTimeout(() => replay(), 8000);
}
function replay(intro = false) {
  clearTimeout(finishTimer);
  clearTimeout(loopTimer);
  stages.forEach(s => s.classList.remove('play', 'intro'));
  if (reduced.matches) return;
  void document.body.offsetWidth;
  playing = true;
  stages.forEach(s => {
    s.dataset.motion = mode;
    s.classList.add(intro ? 'intro' : 'play');
  });
  finishTimer = setTimeout(() => {
    stages.forEach(s => s.classList.remove('play', 'intro'));
    playing = false;
    schedule();
  }, intro ? 1400 : 1050);
}
function updateLoop() {
  loopButton.setAttribute('aria-pressed', String(looping));
  loopButton.textContent = looping ? 'Pause loop' : 'Play loop';
  loopButton.disabled = reduced.matches;
  schedule();
}
document.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => {
  mode = b.dataset.style;
  document.querySelectorAll('[data-style]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
  document.querySelector('#description').textContent = descriptions[mode];
  document.querySelector('#download').href = 'pinthread-' + mode + '.svg';
  replay();
}));
document.querySelector('#replay').onclick = () => replay();
document.querySelector('#intro').onclick = () => replay(true);
loopButton.onclick = () => { looping = !looping; updateLoop(); };
document.querySelectorAll('.logo-lockup').forEach(s => {
  s.addEventListener('pointerenter', () => { if (!playing) replay(); });
  s.addEventListener('click', () => replay());
});
document.querySelector('#theme').onclick = e => {
  const dark = document.querySelector('.stage').classList.toggle('dark');
  e.currentTarget.textContent = dark ? 'Light preview' : 'Dark preview';
  e.currentTarget.setAttribute('aria-pressed', String(dark));
};
document.addEventListener('visibilitychange', schedule);
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  schedule();
}).observe(stages[0]);
reduced.addEventListener('change', () => {
  if (reduced.matches) { looping = false; replay(); }
  updateLoop();
});
updateLoop();
replay(true);
