import { describe, expect, it } from "vitest";
import { ApiError } from "../src/api";
import { connectionIssue } from "../src/connection-issue";

describe("connection issues", () => {
  it("tells visitors on an unapproved site who can turn comments on", () => {
    const issue = connectionIssue(
      new ApiError(403, "not approved", "site_not_approved")
    );
    expect(issue).toMatchObject({
      kind: "site",
      title: "Comments aren’t on for this site",
    });
    expect(issue.detail).toContain("Turn comments on");
  });
  it("separates offline from an unreachable server", () => {
    expect(connectionIssue(new ApiError(0, "", "offline")).title).toBe(
      "You’re offline"
    );
    expect(connectionIssue(new ApiError(0, "", "unreachable")).title).toBe(
      "Can’t connect"
    );
  });
  it("passes server messages through", () => {
    const issue = connectionIssue(new ApiError(500, "Comments are down."));
    expect(issue).toMatchObject({
      kind: "server",
      detail: "Comments are down.",
    });
  });
});
