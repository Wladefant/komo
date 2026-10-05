// Base layout for the review dock (src/Dock.tsx). Theme and placement live in
// styles.ts; this sheet only sizes the pill, the bar and the expanded sheet.
export const dockStyles = `
.dock {
  --dock-button: 44px;
  --dock-inset: 4px;
  --dock-height: calc(var(--dock-button) + var(--dock-inset) * 2);
  --dock-width: min(calc(var(--dock-count) * var(--dock-button) + var(--dock-inset) * 2), calc(100vw - 32px));
  --dock-sheet-width: min(268px, calc(100vw - 32px));
  --dock-sheet-padding: 8px;
  --dock-radius: calc(var(--dock-height) / 2);
  --dock-surface: #0d0d0d;
  --dock-ink: #f8f7f4;
  --dock-hover: #ffffff12;
  position: relative;
  flex: none;
  width: var(--dock-width);
  height: var(--dock-height);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.dock, .dock * { box-sizing: border-box; }
.dock__surface, .dock__bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  translate: -50% 0;
  width: var(--dock-width);
  height: var(--dock-height);
}
.dock__surface {
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--dock-radius);
  background: var(--dock-surface);
  color: var(--dock-ink);
}
.dock__bar {
  display: flex;
  align-items: center;
  padding: var(--dock-inset);
}
.dock__sheet {
  position: absolute;
  top: 0;
  left: 50%;
  translate: -50% 0;
  width: var(--dock-sheet-width);
  max-height: calc(100dvh - 64px);
  padding: var(--dock-sheet-padding);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.dock [aria-hidden="true"] { pointer-events: none; }
.dock__button, .dock__row {
  display: flex;
  flex: none;
  align-items: center;
  margin: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  transition: background-color 150ms ease, scale 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.dock__button {
  flex: 1;
  justify-content: center;
  width: 0;
  height: var(--dock-button);
  padding: 0;
  border-radius: 999px;
}
.dock__row {
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: calc(var(--dock-radius) - var(--dock-sheet-padding));
  text-align: left;
}
.dock__sheet[aria-hidden="true"] .dock__row { opacity: 0; }
.dock__glyph { display: grid; flex: none; place-items: center; }
.dock__glyph > * { display: grid; place-items: center; }
.dock__glyph > *, .dock__label > * { grid-area: 1 / 1; }
.dock__label { display: grid; min-width: 0; }
.dock__label > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dock svg { flex: none; width: 20px; height: 20px; }
.dock__svg { display: contents; }
.dock__button:focus-visible, .dock__row:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; }
@media (hover: hover) {
  .dock__button:hover, .dock__row:hover { background: var(--dock-hover); }
}
@media (pointer: coarse) {
  .dock {
    --dock-button: 48px;
    --dock-width: min(296px, calc(100vw - 32px));
    --dock-sheet-width: min(296px, calc(100vw - 32px));
    --dock-sheet-padding: 12px;
  }
  .dock__row { min-height: 44px; padding-block: 12px; }
}
@media (prefers-reduced-motion: no-preference) {
  .dock__button:active { scale: 0.95; transition-duration: 100ms; }
  .dock__row:active { scale: 0.96; transition-duration: 100ms; }
}
@media (prefers-reduced-motion: reduce) {
  .dock__button, .dock__row { transition: none; }
}
.dock-hint {
  position: absolute;
  padding: 6px 10px;
  border-radius: 14px;
  background: light-dark(#fff, #171717);
  color: light-dark(#111, #fefefe);
  box-shadow: 0 0 0 1px light-dark(#0000000f, #ffffff1a), 0 2px 4px #0000000a;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  pointer-events: none;
}
.dock > .dock-hint {
  transition: left 160ms cubic-bezier(0.22, 1, 0.36, 1), top 160ms cubic-bezier(0.22, 1, 0.36, 1);
  animation: dock-hint-in 140ms ease-out;
}
@keyframes dock-hint-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .dock > .dock-hint { transition: none; animation: none; }
}
`;
