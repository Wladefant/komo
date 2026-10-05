# Review dock

`src/Dock.tsx` and `src/dock-styles.ts` are original pinthread code: a bar of shortcuts that grows into a sheet listing every review action.

## Icons

Review icons come from Lucide (https://lucide.dev, https://github.com/lucide-icons/lucide) version 1.52.0, used under the ISC License. Some Lucide icons (among those used here: check, chevron-down, arrow-up, info) derive from Feather and are also under the MIT License. The package build serializes the icon data from the `lucide` package to SVG strings, so the shipped bundle contains that artwork. Both license texts are reproduced below; the complete Lucide license file, including the list of Feather-derived icons, is copied into `dist/THIRD_PARTY_NOTICES.txt`.

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

The MIT License (MIT) (for the Feather-derived icons)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Interaction reference

Component highlighting, compact growing composers, pin previews, and target-aware feedback copying were informed by Mesurer (https://github.com/ibelick/mesurer), by Julien Thibeaut, reviewed at version 0.1.5. These interactions are implemented here against the shared comments API and use Lucide icons.

## Floating drag and edge snapping

`src/floating-drag.ts` and `resizeEdgeBox` adapt the gesture geometry, velocity smoothing, edge thresholds, and edge resize from https://github.com/tjcages/panels (`src/hooks/use-drag-resize.ts`).

The edge sidebar (`sidebar: "edge"`) reuses that drag math and follows the panels floating-panel pattern: a panel that docks to a viewport edge, parks off-screen while closed, and peeks out at the edge while collapsed (`src/edge-sidebar.ts` and the `--edge-park-x` / `--edge-peek-x` offsets). The open animation is the drawer expand: the same compress-then-spring, with the comment rows staggering in. The drawer stays at the bottom of the sidebar as tabs. The account dialog sits inside that panel, inset from the sides and top, with no scrim. Background mode keeps the viewport account column and overlay.

MIT License

Copyright (c) 2026 tjcages

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Bundled dependencies

The production build includes selected Motion and picker modules and the Lucide icon artwork. Their original licenses are collected in `dist/THIRD_PARTY_NOTICES.txt`. React remains an external dependency.
