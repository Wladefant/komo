import { check, originAllowed, sitePattern } from "./validation";
import type { Project } from "./workspaces";

const MAX_SITES = 10;

type SiteRow = { origin: string; removed?: number };

/** Owner edits to a configured project's sites, oldest schema first. */
export async function siteEdits(env: Env, project: string) {
  const query = (sql: string) =>
    env.DB.prepare(sql).bind(project).all<SiteRow>();
  // Only missing migration schema permits fallback. Operational errors must
  // never restore configured origins that the owner has revoked.
  const missing = (error: unknown, pattern: RegExp) =>
    error instanceof Error && pattern.test(error.message);
  const emptyIfMissing = (error: unknown) => {
    if (missing(error, /no such table: (?:main\.)?project_sites\b/i))
      return { results: [] as SiteRow[] };
    throw error;
  };
  const rows = await query(
    "SELECT origin,removed FROM project_sites WHERE project=?"
  )
    .catch((error: unknown) => {
      if (missing(error, /no such column: (?:project_sites\.)?removed\b/i))
        return query("SELECT origin FROM project_sites WHERE project=?").catch(emptyIfMissing);
      return emptyIfMissing(error);
    });
  return {
    added: rows.results.filter((row) => !row.removed).map((row) => row.origin),
    removed: rows.results.filter((row) => row.removed).map((row) => row.origin),
  };
}

/** Apply owner edits on top of a configured project's origins. */
export function editedOrigins(
  origins: string[],
  edits: { added: string[]; removed: string[] }
) {
  return [
    ...origins.filter((origin) => !edits.removed.includes(origin)),
    ...edits.added.filter((origin) => !origins.includes(origin)),
  ];
}

/**
 * Every site allowed to load a project's comments, all owner-editable.
 * Hosted workspaces store them in workspace_domains; configured projects
 * keep their PROJECTS origins with owner edits from project_sites.
 */
export async function projectSites(env: Env, project: string) {
  const configured = (JSON.parse(env.PROJECTS) as Record<string, Project>)[
    project
  ];
  if (configured)
    return editedOrigins(
      configured.origins,
      await siteEdits(env, project)
    ).sort();
  const rows = await env.DB.prepare(
    "SELECT origin FROM workspace_domains WHERE project=? ORDER BY origin"
  )
    .bind(project)
    .all<{ origin: string }>();
  return rows.results.map((row) => row.origin);
}

export async function saveProjectSites(
  env: Env,
  project: string,
  value: unknown,
  origin?: string
) {
  check(Array.isArray(value), 400, "Send a list of sites.");
  const sites = [...new Set(value.map(sitePattern))];
  const before = await projectSites(env, project);
  check(
    !origin || !originAllowed(origin, before) || originAllowed(origin, sites),
    400,
    "You can’t remove the site you’re on."
  );
  const configured = (JSON.parse(env.PROJECTS) as Record<string, Project>)[
    project
  ];
  const now = Date.now();
  if (configured) {
    const added = sites.filter((site) => !configured.origins.includes(site));
    const removed = configured.origins.filter((site) => !sites.includes(site));
    check(added.length <= MAX_SITES, 400, `Add up to ${MAX_SITES} sites.`);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM project_sites WHERE project=?").bind(project),
      ...added.map((site) =>
        env.DB.prepare(
          "INSERT INTO project_sites(project,origin,added_at) VALUES(?,?,?)"
        ).bind(project, site, now)
      ),
      ...removed.map((site) =>
        env.DB.prepare(
          "INSERT INTO project_sites(project,origin,added_at,removed) VALUES(?,?,?,1)"
        ).bind(project, site, now)
      ),
    ]);
  } else {
    check(sites.length <= MAX_SITES, 400, `Approve up to ${MAX_SITES} sites.`);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM workspace_domains WHERE project=?").bind(
        project
      ),
      ...sites.map((site) =>
        env.DB.prepare(
          "INSERT INTO workspace_domains(project,origin,verified_at) VALUES(?,?,?)"
        ).bind(project, site, now)
      ),
    ]);
  }
  return projectSites(env, project);
}
