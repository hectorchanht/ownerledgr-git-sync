# Decisions — ownerledgr-git-sync

- 2026-11-16 (Hector directive): the hourly OwnerLedgr private-repo sync must
  be a standalone Cloudflare Worker "on its own", not depending on another
  service — it replaces the Muse cron `apps-overview-ownerledgr-sync`
  (which chained Muse + GitHub connector + Space action).
- Design (recommended answers auto-applied per Hector's standing rule):
  - Own repo (one project = one repo): hectorchanht/ownerledgr-git-sync.
  - No storage bindings: the read endpoint live-fetches GitHub on each call
    (call volume = App Traffic's hourly refreshGit + manual refreshes), the
    hourly Cron Trigger run validates PAT/GitHub health. Fewer moving parts.
  - Read path is token-guarded (/latest/<SYNC_TOKEN>) because the source repo
    is private; the URL is treated as a secret, held as the App Traffic
    server-side constant OWNERLEDGR_SYNC_URL.
  - GITHUB_PAT: fine-grained, read-only, ownerledgr repo only, stored as a
    Worker secret by Hector in the Cloudflare dashboard (never in chat/code).
- Deploy: Cloudflare Workers Builds git integration on this repo
  (build: none, deploy: `npx wrangler deploy`), then set the two secrets.
- Cutover: once the endpoint is verified, App Traffic refreshGit pulls it,
  and the Muse cron is deleted.
