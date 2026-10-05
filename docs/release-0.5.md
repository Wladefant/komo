# pinthread 0.5.0 release candidate

This branch prepares 0.5.0. The registry already contains 0.4.1; reusing that version would prevent publication. Preparing the version does not publish it or approve production rollout.

## Changes

- More precise element context and conservative anchor recovery for agent handoffs.
- Immediate last-known account/comments/sidebar restoration, persistent comment mode, and improved sidebar transitions.
- Adaptive polling, bounded caches, cursor pagination, reduced anchor work, and offscreen list rendering.
- API/project-scoped secure sessions, explicit trusted preview sharing, cross-tab account reconciliation, and protection against obsolete requests/queued edits.
- Safe host mounting without moving framework-owned body children, imported feedback actions, and reliable CLI logout after project deletion.

## Integration changes

Cookie sharing now requires explicit `sessionDomain` configuration across trusted hosts. Default sessions stay on the current host. Existing endpoint-scoped local sessions migrate; legacy cookie-only sessions may require one sign-in. HTTP development stores sessions locally without bearer cookies.

pinthread no longer inserts a body-content wrapper. It can frame a sole existing content root, or an explicit mounted `pageRoot` with a layout box. Multi-root pages and `display: contents` use Floating until configured with a suitable root. Passing body, html, or an unmounted root is rejected. The website's explicit root retains its existing Frame behavior.

## Rollout

1. Accept PR #29 after reviewing its deployed preview and local evidence in [package safety](package-safety.md).
2. Apply additive migration `0015_query_efficiency.sql` to the intended production database during the approved rollout.
3. Roll out the matching API and website. Preserve the documented session and approved-site boundaries.
4. Publish the prepared npm artifact as 0.5.0 and verify a fresh registry consumer. A merged website does not update package consumers automatically.

Merge, production changes, and npm publication require their separate owner approval. Cross-tab polling deduplication and deeper bundle restructuring remain performance follow-ups; they are not represented as completed. Device/accessibility review limitations remain listed in [launch readiness](launch/readiness.md).
