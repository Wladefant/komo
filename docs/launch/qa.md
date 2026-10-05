# Launch asset QA

Verified 2026-09-17.

- Master: 1920×1080, 42.000 seconds, 1,260 frames, H.264, 30fps.
- Portrait: 1080×1920, 42.000 seconds, 1,260 frames, H.264, 30fps. Website and agent windows stack; comment cards move below the website.
- Teaser: 1920×1080, 12.000 seconds, 360 frames, H.264, 30fps.
- All streams fully decode with ffmpeg without errors. The films are silent, with readable on-screen captions and separate SRT/VTT captions. The ending holds the install and URL without looping.
- Inspection frames cover the intro, first comment, second comment, reaction/reply, sidebar, copied state, pasted prompt, agent response, matching improvement, verification, resolution, and final URL. Final encoded frames were also extracted for review.
- Corrected the landscape target to enclose the headline, switched the second target to the actual button, retained visible reviewer names, and clarified that the hook call belongs inside a React component.
- The text and matching page improvement stay consistent: headline line height increases, and the primary button gains the lavender fill. The agent explicitly says it updates the code. Resolution follows verification.
- No live API calls or customer comments enter the film. The source reuses existing hero/window/card/logo styling and the actual drawer component; the fixture sidebar is arranged for recording.
- Post counts range from 161 to 231 weighted characters, below 280. Three standalone options, four thread posts, and four replies are prepared. Nothing has been posted to a social account.

`render-evidence.json` records exact media properties and SHA-256 hashes. Full media stays in the ignored output directory and the deployed review gallery.

Remaining: owner review of the creative assets and public launch decision. Linear reconciliation remains blocked by the official connector's authorization error. Google branding review is still pending.

Browser playback on the deployed gallery reached the clean ending for all three files: master 42s, portrait 42s, teaser 12s; all reported `ended: true` with no media error. The final immutable review gallery is linked from this folder's README.

## Beat studio revision — 2026-09-17

The current deliverable is the [animated webpage](https://483be0f8.pinthread-wb5.pages.dev/launch-demo/?bpm=144). No new video render. Previous media checks above apply only to the earlier film.

- Visually inspected logo, comment/reaction/reply, sidebar/copy, jumbo title, agent/website improvement and held ending in Chrome.
- Scrub pauses exactly; changing BPM synchronizes numeric and range controls without resetting the beat; ramp toggles; non-loop playback stops at beat 64 with the URL held.
- Clock inverse checks pass at 60, 144, 180 and 240 BPM with both steady and ramp timing. Loop carries elapsed remainder to avoid cumulative frame drift.
- Browser console showed no errors. Deployed route loaded and autoplayed at 144 BPM.
- Local build, typecheck, 111 tests and bundle budgets pass. Initial/all-feature gzip remains 93,609 / 186,726 bytes.
- Audio click is optional, off by default; music selection/mixing and final video exports are deferred. No new mobile-device or screen-reader coverage claimed.

## Close-up revision — 2026-09-17

[Current preview](https://dfbbdb3b.pinthread-wb5.pages.dev/launch-demo/?bpm=144). One large primary element per shot replaces the wider compositions. Inspected readable comment/reply, drawer expansion, left-edge snap, sidebar, agent handoff and cropped desktop improvement. The desktop is 1920×1080, viewed at 1.55–1.65×. Fixture request “Make the button lavender” precedes agent action and the matching button change. BPM controls and 64-beat timing remain intact. No new video export.

Local build, typecheck, all 111 tests and size budgets pass again. Production browser/package code is unchanged.

## Production motion revision — 2026-09-17

[Current preview](https://8f2edb35.pinthread-wb5.pages.dev/launch-demo/?bpm=144). The preview imports and mounts the unmodified production dock component, rather than recreating shell/row motion. Production edge CSS is copied at build time. Dock travel uses the product's 680/32/0.55 spring. The global animation seek now targets only the logo, so it cannot pause native drawer springs.

Visually inspected typed partial comment and caret, native drawer expansion/settling, right-edge orientation, and simplified title. The inert fixture preserves transport focus. Deployed route loads and plays with no console errors. Build, typecheck, 111 tests and size budgets pass; browser package gzip remains unchanged. Native drawer transitions settle after narrative pause/scrub: exact intermediate drawer frames are not promised by seekBeat. No new video files.

## Full production widget revision — 2026-09-17

[Current preview](https://ce922826.pinthread-wb5.pages.dev/launch-demo/?bpm=144). Imports the full unmodified initComments implementation. Product pins, composer, thread, drawer and sidebar render inside a 1280×720 fixture iframe. The camera crops that desktop; product shadow styles and animation timings are unchanged.

Visually inspected real pin/thread text, partial typing in the actual composer, successful fixture posting with a stacked pin, native drawer expansion, sidebar list and website framing, and selecting a sidebar row to open its thread. Adjusted the final camera so the sidebar and corresponding thread remain visible together. All data is fabricated; the iframe fetch adapter blocks external API destinations. No agent execution or website improvement is depicted. Native animations settle independently of narrative seeking.

Local build, typecheck, 111 tests and size checks pass. Initial/all-feature gzip: 93,609 / 186,726 bytes, unchanged. No new video export.

## Entrances and ending — 2026-09-17

[Preview](https://abdf39ab.pinthread-wb5.pages.dev/launch-demo/?bpm=144). Verified a partially transparent/rising opening headline at beat 4.25, actual nearby thread at beat 8, and incoming fixture comment at beat 41.1 preceding existing sidebar rows. The product supplies row entrance/displacement. The camera remains still for the native sidebar opening before zooming in. Preview-only WAAPI adds entrance motion to actual pin nodes; product markup/styles are unchanged. Comment/composer camera scale increased to 2.2.

Sequence extended to 72 beats (30 seconds at 144 BPM), with final URL held for 12 beats/five seconds and looping off by default. Inspected final frame near beat 72. Local build, typecheck, 111 tests and size checks pass; browser bundle sizes unchanged. Video export remains deferred.

## Comment-to-agent narrative — 2026-09-17

[Preview](https://574b9dc4.pinthread-wb5.pages.dev/launch-demo/?bpm=144). Visually inspected the title with two opposing real pins and unnamed cursor/click pulse, centered real three-person conversation, second detail-thread close-up, actual sidebar additions plus editorial emoji burst, centered native drawer, its Copied prompt confirmation, and readable captured feedback in the reused site agent window. Pin entrance progress survives product DOM replacement instead of being lost when pins redraw.

Clipboard writes are intercepted only inside the isolated fixture iframe; the real agentPrompt formatter runs, and excerpts of its output appear in the agent window. No agent executes changes. The 76-beat sequence retains a five-second ending at 144 BPM. Replay/backward seeking reset fixture data; paused framing continues to follow settling product UI.

Build/typecheck/111 tests/size checks pass; final isolated bundle build and JS syntax check pass. Production package sizes remain unchanged. No video files rendered.

## Fade, framing and loop refinement — 2026-09-17

[Preview](https://2300081a.pinthread-wb5.pages.dev/launch-demo/?bpm=144). Removed text translation/scale; headline and intertitle use opacity-only word staggering. Actual pins doubled to 2×. Camera reads comment layout bounds instead of animated bounds and prepares the comment during the invisible part of the opening transition.

Visually inspected retained fullscreen conversation, centered drawer moving down with the website behind it, 2× indicators, centered drawer cursor hover on copy, and focused homepage agent window with captured feedback and an illustrative working state. Sidebar now receives eight comments every half beat, with six right-side emoji pops. Extra copy/paste headlines removed. Finale fades to the animated pinthread logo and loops by default.

Build, typecheck, all 111 tests and size checks pass. Final isolated build, JS syntax and whitespace checks pass. Production package/bundle sizes unchanged. No new video export or actual agent execution.

## Transition diagnosis and prompt bar — 2026-09-17

[Preview](https://e5325afd.pinthread-wb5.pages.dev/launch-demo/?bpm=144). Reproduced a camera defect by pausing at beat 22.1 during drawer collapse: the camera continued moving because it followed the animated shell height. The camera now uses stable expanded-panel layout bounds anchored to the toolbar. Repeating the paused-collapse check showed no camera drift. Temporary debug instrumentation was removed.

Removed the independent website fade that exposed outgoing content; new views remain hidden until their native UI exists. Short background-colored mattes cover camera/component resets at hard scene cuts while continuous drawer docking and native sidebar opening retain their animations. Initial headline opacity prevents a pre-runtime flash.

Replaced the agent window with one centered abstract prompt bar. Cursor arrival/click precedes a single full-prompt paste; the bar expands and scrolls through the actual feedback. Verified all 12 fixture threads and replies remain in the field; inspected the readable first conversation after paste. No reply or working state is simulated.

Local build, typecheck, all 111 tests and size checks pass (93,609 / 186,726 gzip bytes, unchanged). Final isolated build, JS syntax and whitespace checks pass. Video export remains deferred.

## Dedicated drawer reveal — 2026-09-17

[Preview](https://a51ec679.pinthread-wb5.pages.dev/launch-demo/?bpm=144). Hide the entire toolbar through a fixture shadow-host rule before its lazy UI mounts, preserving layout for camera measurement and preventing shell/handle flashes. Explicit visibility windows: beats 16–24 and 52–60. Visually verified clean title/pins at 4.5, centered native panel entrance at 17, and website/pins without toolbar at 34 (computed visibility hidden). Native drawer motion is unchanged.
