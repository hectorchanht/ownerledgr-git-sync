# ownerledgr-git-sync

Standalone Cloudflare Worker that keeps the OwnerLedgr card in Dawn Studio's
App Traffic Space current — without any agent in the loop.

Hourly (Cron Trigger) it fetches the latest commit of the private repo
`hectorchanht/ownerledgr` and checks `ownerledgr.com`; the same data is
served on demand as JSON at `/latest/<SYNC_TOKEN>` for the Space's
`refreshGit` to pull.

## Setup (one-time, in Cloudflare)

1. Workers & Pages → Create → connect this repo (Workers Builds):
   build command *(none)*, deploy command `npx wrangler deploy`.
2. Settings → Variables and Secrets → add secrets:
   - `GITHUB_PAT` — fine-grained PAT, read-only access to
     `hectorchanht/ownerledgr` only.
   - `SYNC_TOKEN` — any long random string; share the full
     `/latest/<SYNC_TOKEN>` URL only with the App Traffic Space config.
3. Triggers: the hourly cron (`0 * * * *`) ships in `wrangler.toml`.

## Endpoints

- `GET /health` → `{ ok: true }`
- `GET /latest/<SYNC_TOKEN>` → latest commit + live status JSON
