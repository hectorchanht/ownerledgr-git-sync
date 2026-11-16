// ownerledgr-git-sync — standalone Cloudflare Worker.
// Hourly (Cron Trigger) it validates the GitHub PAT by fetching the latest
// commit of the PRIVATE repo hectorchanht/ownerledgr; on demand it serves
// that commit + a live check of ownerledgr.com as JSON at a token-guarded
// path, for the App Traffic Space's refreshGit to pull. No Muse, no
// Muse agent, no other service in the loop.
//
// Secrets (set in Cloudflare dashboard / wrangler secret put — never in code):
//   GITHUB_PAT   fine-grained PAT, read-only, hectorchanht/ownerledgr only
//   SYNC_TOKEN   random string; the read path is /latest/<SYNC_TOKEN>

const REPO = "hectorchanht/ownerledgr";
const LIVE_URL = "https://ownerledgr.com";

async function fetchLatest(env) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ownerledgr-git-sync",
    },
  });
  if (!res.ok) throw new Error(`github ${res.status}`);
  const [c] = await res.json();
  let live_code = 0;
  try {
    const live = await fetch(LIVE_URL, { redirect: "follow" });
    live_code = live.status;
  } catch { live_code = 0; }
  return {
    slug: "ownerledgr",
    commit_message: c.commit.message.split("\n")[0],
    commit_at: c.commit.committer.date,
    commit_sha: c.sha.slice(0, 7),
    commit_author: c.commit.author.name,
    live_status: live_code >= 200 && live_code < 400 ? "up" : "down",
    live_code,
    checked_at: new Date().toISOString(),
  };
}

export default {
  async scheduled(event, env, ctx) {
    // Hourly health run: proves the PAT + GitHub path work with zero callers.
    ctx.waitUntil((async () => {
      try {
        const d = await fetchLatest(env);
        console.log(`sync ok ${d.commit_sha} ${d.commit_at} live=${d.live_code}`);
      } catch (e) {
        console.error(`sync failed: ${e.message}`);
      }
    })());
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "ownerledgr-git-sync" });
    }
    if (env.SYNC_TOKEN && url.pathname === `/latest/${env.SYNC_TOKEN}`) {
      try {
        return Response.json(await fetchLatest(env));
      } catch (e) {
        return Response.json({ error: e.message }, { status: 502 });
      }
    }
    return new Response("not found", { status: 404 });
  },
};
