# Public beta readiness

Verification date: 2026-09-17. This is evidence, not a launch approval.

## Product

pinthread keeps website feedback attached to elements or areas, with discussions and an explicit handoff to a coding agent. The README is the product overview and source for setup guidance. Product name stays lowercase. Preserve the existing visual system, customer data, project boundaries, and authentication behavior.

- [Website](https://pinthread.dev/)
- [Repository](https://github.com/Wladefant/pinthread)
- [npm](https://www.npmjs.com/package/pinthread)
- [Install](https://pinthread.dev/install/), [configuration](https://pinthread.dev/configuration/), [hosting](https://pinthread.dev/hosting/), [agent workflow](https://pinthread.dev/agent-prompts/)

## Verified implementation milestones

- [PR #9](https://github.com/Wladefant/pinthread/pull/9) merged as `0758e6a`: React hook, peer declarations, option types, and public project-key guidance. Publication is a separate milestone.
- [PR #6](https://github.com/Wladefant/pinthread/pull/6): same-domain hosted API and OAuth routing. Website Worker retains the `PINTHREAD_API` service binding.
- [PR #8](https://github.com/Wladefant/pinthread/pull/8): final navigation logo sizing. This launch work leaves that production geometry unchanged.
- Private projects, invitations, export/import, cleanup, optimistic writes, and CLI have implementation and test evidence in `docs/release-0.3.md`. Do not confuse that historical evidence with new device testing.

## Release verification

Initial registry version was 0.3.2. The selected release is 0.4.0 because the React entry point and peer requirements expand the package surface during the pre-1.0 beta.

- Build and typecheck pass; 111 tests across 18 files pass.
- Initial browser JavaScript: 93,609 bytes gzip; all features: 186,726 bytes gzip. These pass the repository budgets.
- Packed artifact installs in an empty directory. Main and React exports load; server rendering returns `<p>SSR works</p>` without mounting the widget. CLI help and schema execute.
- Publication and production documentation status must be read from the release evidence below, not inferred from the version field.

## External review

Google Verification Center was refreshed on 2026-09-17 and still says “Your branding is currently under review.” No branding edits or resubmission occurred. Data access says verification is not required because no sensitive or restricted scopes are requested. Check the existing appeal for a decision; do not submit a duplicate.

## Linear tracking

Official MCP authentication succeeded after restart. Searches for komo, Komo and the repository found no existing project. Created [komo in Off-brand](https://linear.app/off-brand-studio/project/komo-9f81aa4f25a3), with release readiness, launch assets and beta rollout milestones. [Product guide](https://linear.app/off-brand-studio/document/komo-product-and-beta-launch-guide-6baf97d909c4).

| Issue | Work | State |
| --- | --- | --- |
| [OFF-672](https://linear.app/off-brand-studio/issue/OFF-672) | Beat-driven launch webpage | Review in PR #10 |
| [OFF-673](https://linear.app/off-brand-studio/issue/OFF-673) | Publish and verify 0.4.0 | Done |
| [OFF-674](https://linear.app/off-brand-studio/issue/OFF-674) | Matching production docs | Done; depends on 673 |
| [OFF-675](https://linear.app/off-brand-studio/issue/OFF-675) | Google branding appeal | Await external decision |
| [OFF-676](https://linear.app/off-brand-studio/issue/OFF-676) | Deleted-project logout cleanup | In Review in PR #29 |
| [OFF-677](https://linear.app/off-brand-studio/issue/OFF-677) | Announcement copy | In Review |
| [OFF-678](https://linear.app/off-brand-studio/issue/OFF-678) | Remaining device/accessibility QA | Todo |
| [OFF-679](https://linear.app/off-brand-studio/issue/OFF-679) | Owner rollout approval | Depends on 672, 677, 678 |
| [OFF-680](https://linear.app/off-brand-studio/issue/OFF-680) | Export approved beat sequence | Deferred; depends on 672 |
| [OFF-681](https://linear.app/off-brand-studio/issue/OFF-681) | Triage beta feedback | After approved rollout |

The owner's revised direction is a fast animated webpage with adjustable BPM. No new video render in this pass. Existing films remain historical assets. No dates, assignees or traction claims invented. Merge and social publication still require explicit owner approval.

## QA limits

Physical-phone testing is excluded by user instruction. Prior simulator evidence is documented in `docs/release-0.3.md`; this session does not claim new iOS Google-owner coverage. Android and screen-reader usability remain open. Automated tests and the launch fixture do not establish those results.

## Published release evidence

- npm publication succeeded for `pinthread@0.4.0`; `latest` resolves to 0.4.0. Registry integrity: `sha512-IE7Ne4Ir+XpXZB8eoespu7XhwaikpH+SRkq/i6Jis08ztOp1Bg1pu7lrgD8UV6ndjWVtWVnTNrHY3nF87fPO6A==`.
- Production website Worker version: `67849e9a-40fc-4819-9597-abf1d6a41979`. Live install HTML includes `usePinthread` and `pinthread/react`; configuration HTML includes the Type column. `/health` returns `{"ok":true}`. The `PINTHREAD_API` service binding remains intact; no API or database deployment was needed.
- A second empty-directory install fetched 0.4.0 from npm, loaded both exports, rendered the hook on the server, and executed CLI schema.
- Browser fixture built from that registry install: React Strict Mode mounts one tool; disabling removes it; re-enabling remounts one tool. The fixture uses isolated data, not public demo comments.
- Real hosted setup: the registry CLI completed `init`, opened the hosted account, created a temporary QA project through the existing Google owner, and wrote the project key/configuration and agent instructions. A separate CLI Google OAuth flow completed through the same-domain callback. `project info` and `comments list` returned successful scoped responses with zero threads.
- Self-hosted server export builds with the normal Wrangler dry run and `nodejs_compat`. This verifies the shipped Worker artifact; a new paid infrastructure deployment was not performed.
- The temporary QA project contained zero threads and was deleted after the read checks. Project deletion revoked its server sessions. The now-invalid local QA credential file was removed without reading its contents. Existing projects and customer comments were preserved.

## Follow-up found during cleanup

`pinthread logout` returns 404 after its project has already been deleted, leaving the local credential file. Server-side sessions are removed by project deletion, so this is a local cleanup/UX issue. Reproduce with a disposable project; accept 404 during logout and remove its local session file, with a regression test. Tracked in OFF-676.

## September 22 package readiness follow-up

PR #29 fixes the deleted-project CLI cleanup noted above: logout accepts an already absent or expired session, skips project discovery, and removes the local credential file. Unexpected server errors still preserve credentials and report the failure. Existing CLI and real Worker tests also verify imported feedback IDs. Publication remains separate; current package and integration evidence lives in [package safety](../package-safety.md) and [optimization checks](../package-optimization.md).
