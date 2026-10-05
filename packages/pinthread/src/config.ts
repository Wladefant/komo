import type { CommentsOptions } from "./types.js";

export type PinthreadConfig = Omit<
  CommentsOptions,
  "repo" | "branch" | "endpoint"
> & {
  /** Defaults to the hosted pinthread service. */
  endpoint?: string;
  repo?: string;
  /** Shared feedback across deployments by default. */
  scope?: "project" | "branch";
  /** Required only for branch scope; normally injected by the setup command. */
  branch?: string;
};

export function resolveConfig(config: PinthreadConfig): CommentsOptions {
  const { scope = "project", ...options } = config;
  if (scope === "branch" && !config.branch?.trim())
    throw new Error(
      "Branch scope needs a build-time branch. Run pinthread sync before your build or set branch explicitly."
    );
  return {
    ...options,
    endpoint: options.endpoint || "https://pinthread.dev",
    repo: config.repo || config.project,
    branch: scope === "branch" ? config.branch! : "shared",
  };
}
