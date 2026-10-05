# Mobile floating comments sidebar

Compact screens (up to 760px wide, or up to 1000px wide and 500px tall) use a floating comments sidebar at 90% of the visible viewport height. The expanded panel is inset 12px from the sides and 6px from the bottom, has 24px rounded corners on every side, and adds 20px of top and horizontal padding plus 10px of bottom padding. The toolbar remains pinned above Safari's bottom controls as they resize; the sidebar follows the same visible viewport bottom. Opening and closing scales the panel between the toolbar's bounds and its full size. The close button uses an X icon on mobile and desktop. There is no drag handle, backdrop, theme metadata change, or page background change.

The mobile mode reuses the existing sidebar DOM and comments controls. The comments list scrolls inside the panel. Tapping a sidebar comment closes the panel and smoothly scrolls its page anchor to about 35% of the visible viewport height; reduced-motion preferences keep the jump immediate. The account card sits at least 8px inside each edge of the expanded sidebar, with a transparent, non-intercepting layer instead of a backdrop. Reply and new-comment cards still use the visual viewport for keyboard placement. Desktop Edge and Frame modes remain gated by the compact breakpoint and retain their existing behavior and saved preference. The marketing site's same-page navigation still closes its mobile menu without a new navigation.

The preceding pull-down design stuttered while following a finger on the owner's iPhone 18 Pro running iOS 27, despite several gesture implementations and a direct package trial. The owner chose this fixed sidebar instead. The historical experiments remain in git history; the current package and site have no gesture dependency or diagnostic comparison page.

## Validation

- `pnpm build`, `pnpm typecheck`, `pnpm test`, and `pnpm size` pass. The suite now contains 205 tests; three retired gesture-controller tests were removed with their controller.
- All-features consumer bundle: 194,364 / 196,000 gzip bytes. Initial bundle: 96,878 / 100,000 gzip bytes.
- Headless Chrome at 390 × 844 shows the open panel at x=12, y=78.4, width=366, height=759.6 (90% of 844), leaving a 6px bottom gap and 10px inside the card beneath the toolbar. It returns to the toolbar's 296 × 56 bounds on close. The page body, theme metadata, and overlay remain untouched.
- In the 390 × 844 mobile fixture, tapping a sidebar comment issued `scrollBy({ top: 1391.475, behavior: "smooth" })`; page scroll advanced through 143px and 1209px before settling at 1391px, with the target at y≈282px. The sidebar closed and the comment dialog opened.
- The account card's enclosing layer measured x=20, y=86.4, right=370, bottom=830 against the sidebar's x=12, y=78.4, right=378, bottom=838: an 8px inset on every edge. Its computed background was transparent, the layer did not receive pointer events, and the card did.
- Device Hub computer-use attachment last failed with `Computer Use server error -10005: timeoutReached`. Native iOS feel and keyboard placement for this replacement await owner testing on the Worker preview.

The owner approved the fixed sidebar, final spacing, and X icon on iPhone. Smooth comment navigation and the inset account card await owner review on this Worker preview: https://6dc9b9ab-pinthread-site.off-brand.workers.dev/
