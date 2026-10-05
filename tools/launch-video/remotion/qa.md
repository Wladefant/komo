# Current render evidence — 2026-09-22

[Worker preview](https://427324ea-pinthread-site.off-brand.workers.dev/promo/) · [PR #28](https://github.com/Wladefant/pinthread/pull/28) · [OFF-680](https://linear.app/off-brand-studio/issue/OFF-680)

- Exact opening: “Figma comments for any site”. One 96px line, 77-frame validated reading hold, clear side margins through the final camera zoom. The other seven scenes retain their choreography.
- Render source `0237614`. H.264, 1920×1080, 30fps, 626 frames, exactly 20.866667 seconds, silent. The review label rounds to 20.9s.
- Movie: 2,963,263 bytes. Local and deployed SHA-256 match: `31ec84074f390f0abcb7ac69e7389583a8126b1d642a863e1579e36ec83934a6`.
- Local build, typecheck, 146 tests across 24 files, and size gates pass. Remotion typecheck and reading-time validation pass. Opening middle and final-zoom stills were inspected; all eight scenes were reviewed in the preceding choreography pass.
- Boundary QC has three intentional warnings: conversation/sidebar and agent/logo meet on the canvas color; drawer/copy share the settled menu camera. No other frame warnings. Native reset CSS disables animations; every filmed motion uses frame time.
- Chrome playback verifies the exact opening, advancing sidebar sequence, 20.9s label, and PR #28 link. Existing Worker preview version: `427324ea-5624-4455-a05f-d32a8290cd92`. No production deployment.
- Conversation uses fixed message slots. Resolve presses at frame78, rebounds, holds accent feedback, and exits at84. Paste/Send use continuous press/release curves. The resolved conversation remains excluded from the eleven open threads in the drawer and prompt. No agent execution is implied.
- The retired webpage film is removed. Licensed helper source and generated media stay outside Git; prior media was preserved. The owner approved the video and subsequently requested this final wording revision. Merge is coordinated separately.

Source/render commands: [README](./README.md). Previous revision evidence remains in Git history.
