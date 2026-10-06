# Migrating from komo to pinthread

The product was renamed from komo to pinthread. Widgets already embedded in live sites keep working. This file lists every rename and the compatibility behaviour for each.

## Package and exports

| Old | New | Compatibility |
| --- | --- | --- |
| `komo` npm package | `pinthread` | Install `pinthread`. Nothing is published under the old name by this repo. |
| `initKomo` | `initPinthread` | `initKomo` still exported, same function. |
| `useKomo` (`/react`) | `usePinthread` | `useKomo` still exported, same function. |
| `defineKomo` (`/setup`) | `definePinthread` | `defineKomo` still exported, same function. |
| `KomoConfig` | `PinthreadConfig` | Type alias kept. |

## CLI and files

| Old | New | Compatibility |
| --- | --- | --- |
| `komo` command | `pinthread` | Use the new command. |
| `.komo/project.json` | `.pinthread/project.json` | CLI reads `.komo/` when `.pinthread/` is absent. New writes go to `.pinthread/`. |
| `KOMO_*` env vars | `PINTHREAD_*` | `KOMO_X` is read when `PINTHREAD_X` is unset (CLI and `KOMO_PROXY_HOPS` on the Node server). |
| `~/.config/komo` | `~/.config/pinthread` | Run `pinthread login` once. |
| `komo.config.js` | `pinthread.config.js` | Run `pinthread sync`. |

## Wire protocol and server

| Old | New | Compatibility |
| --- | --- | --- |
| `_komo` hosted dashboard project key | `_pinthread` | Server maps `_komo` to `_pinthread`. |
| `komo_` project keys | `pinthread_` | Both prefixes are accepted by the widget. |
| `komo:setup` window message | `pinthread:setup` | Widget accepts both. |
| `komo:setup:*` storage keys | `pinthread:setup:*` | Widget falls back to the old key. |
| `komo_quota_exceeded` DB error | `pinthread_quota_exceeded` | Server matches both. |
| Postgres `komo_schema` table | `pinthread_schema` | Renamed on first start; the old table is detected. |

## Database migrations

Migrations 0004, 0006 (SQLite) and `001_initial.sql` (Postgres) are unchanged, because databases have already applied them. New migrations `0016_pinthread_quota_message.sql` (SQLite) and `002_pinthread_quota_message.sql` (Postgres) recreate the quota triggers with the new message. Run `pinthread deploy` to apply them. Until then the server accepts either message.

## Left as is on purpose

Hosted config `repo` identifiers such as `tjcages/pinthread` in `server/hosted.jsonc` and `server/wrangler.jsonc` are stored data keys, not links. Changing them would orphan existing comments. `https://pinthread.dev` is the canonical origin. `https://pinthread.wladefant.de` stays allowed during the move.
