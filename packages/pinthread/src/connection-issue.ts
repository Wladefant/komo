import { ApiError } from "./api.js";

export type ConnectionIssue = {
  kind: "site" | "offline" | "unreachable" | "server";
  title: string;
  detail: string;
};

/** Say why comments didn't load, in words a visitor can act on. */
export function connectionIssue(reason: unknown): ConnectionIssue {
  const code = reason instanceof ApiError ? reason.code : undefined;
  if (code === "site_not_approved")
    return {
      kind: "site",
      title: "Comments aren’t on for this site",
      detail: "Own this site? Turn comments on. Otherwise, send this link to the owner.",
    };
  if (code === "offline")
    return {
      kind: "offline",
      title: "You’re offline",
      detail: "Comments will come back when you do.",
    };
  if (code === "unreachable")
    return {
      kind: "unreachable",
      title: "Can’t connect",
      detail:
        "You might be offline, or this site isn’t set up for comments yet.",
    };
  return {
    kind: "server",
    title: "Comments didn’t load",
    detail: reason instanceof Error ? reason.message : "Something went wrong.",
  };
}
