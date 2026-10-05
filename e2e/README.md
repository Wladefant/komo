# Komo / Pinthread e2e suite

Superboard end-to-end test suite for the Komo / Pinthread fork.
Policy: `workflows/e2e/POLICY.md`. Issue: https://github.com/Wladefant/super-board/issues/490

## Test files

- `tests/widget-flow.e2e.ts`: comment mode toggles and the dock stays reachable (inside the viewport, controls of at least 44 px, no horizontal overflow) at 390x844, 390x420 (keyboard open) and 1440x900.
- `tests/pin-reply-resolve.e2e.ts`: a guest places a pin, replies and resolves it at the same three viewports, against the stock Pinthread API that `serve.mjs` runs on a throwaway local D1 database (https://github.com/Wladefant/komo/issues/23). The viewports share one store, so the test never counts threads: it finds its own thread by a unique pin text and checks the API by thread id. Before each tap it checks the touch hit area of the composer, dialog and card controls is at least 44 by 44 px (https://github.com/Wladefant/komo/issues/32). The engine taps with a mouse, so the test applies the widget's own `@media (pointer: coarse)` rules for the measurement and removes them before the tap.
- `tests/drag-regression.e2e.ts`: PR 45 regressions, pre-fix `6fb75d7b8fc045b4c5114e042e64a5626785843d`, fixed `90df2160bc55be7bf127c3482f381d148863276c`: a dragged dock keeps its placement after a mode change, and the first touch keeps the pressed control connected until release
- `tests/request-guard.e2e.ts`: the page fetches a production host and an unlisted host, both must be aborted, and its own host must pass
- `config.test.py`: standalone check verifying host and request refusal logic. It needs a super-board checkout: set `SUPERBOARD_ROOT` (default `../super-board`, relative to this repository). A missing guard fails the test.

## Environment variables

- `APP_URL`: base URL of the served application (defaults to `http://127.0.0.1:4340`)
- `E2E_TELEMETRY_DISABLED`: set to `1` (telemetry disabled)
- `DO_NOT_TRACK`: set to `1`
- `E2E_CACHE_MODE`: `read-only` (default for replay) or `read-write` (when recording with `--record`)
- `E2E_MODEL_API_KEY`: API key for OpenCode Go `qwen3.8-flash` (record mode only, masked)

## App start command

Serve the static site build on port 4340:

```bash
python -m http.server 4340 -d packages/pinthread-site/dist
```

## Running the e2e suite

Run cached replay (default, 0 model tokens, through build_slot):

```bash
python ../super-board/workflows/e2e/e2e_run.py --dir e2e --app-url http://127.0.0.1:4340
```

Run record pass (allocates browser slot, records interaction cache):

```bash
python ../super-board/workflows/e2e/e2e_run.py --dir e2e --app-url http://127.0.0.1:4340 --record
```

Generate FLOW-QA receipt:

```bash
python ../super-board/workflows/e2e/e2e_receipt.py --report e2e/.e2e/report.json --expected-sha <HEAD_SHA> --base-url http://127.0.0.1:4340
```

Verify config host refusal:

```bash
python e2e/config.test.py
python ../super-board/workflows/e2e/e2e_guard.py config e2e/e2e.config.ts --package-json e2e/package.json
```
