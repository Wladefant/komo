import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalProject, isQuotaError } from "../server/validation";
import { withLegacyEnv } from "../cli/config.mjs";
import { runAgent } from "../cli/agent.mjs";
import { initKomo, initPinthread } from "../src/index";
import { useKomo } from "../src/react";
import { usePinthread } from "../src/react";
import { defineKomo, definePinthread } from "../src/setup";

describe("pre-rename compatibility", () => {
  it("matches both quota messages and nothing else", () => {
    expect(isQuotaError(new Error("pinthread_quota_exceeded"))).toBe(true);
    expect(isQuotaError(new Error("D1_ERROR: komo_quota_exceeded: x"))).toBe(
      true
    );
    expect(isQuotaError(new Error("other_quota_exceeded"))).toBe(false);
    expect(isQuotaError("komo_quota_exceeded")).toBe(false);
  });

  it("maps the legacy dashboard project key", () => {
    expect(canonicalProject("_komo")).toBe("_pinthread");
    expect(canonicalProject("_pinthread")).toBe("_pinthread");
    expect(canonicalProject("site")).toBe("site");
    expect(canonicalProject(null)).toBeNull();
  });

  it("reads KOMO_* variables unless PINTHREAD_* is set", () => {
    const env = withLegacyEnv({
      KOMO_PROJECT: "old",
      KOMO_TOKEN: "t",
      PINTHREAD_PROJECT: "new",
    });
    expect(env.PINTHREAD_PROJECT).toBe("new");
    expect(env.PINTHREAD_TOKEN).toBe("t");
  });

  it("keeps the old export names bound to the new ones", () => {
    expect(initKomo).toBe(initPinthread);
    expect(useKomo).toBe(usePinthread);
    expect(defineKomo).toBe(definePinthread);
  });

  it("CLI finds a legacy .komo/project.json and KOMO_TOKEN", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pinthread-legacy-"));
    try {
      await mkdir(join(dir, ".komo"));
      await writeFile(
        join(dir, ".komo/project.json"),
        JSON.stringify({ project: "legacy-project", endpoint: "http://127.0.0.1:1" })
      );
      const logs: string[] = [];
      const original = console.log;
      console.log = (value: unknown) => void logs.push(String(value));
      try {
        await runAgent(["whoami"], {
          cwd: dir,
          env: { KOMO_TOKEN: "t", PINTHREAD_CONFIG_HOME: dir },
        }).catch((error: Error) => logs.push(error.message));
      } finally {
        console.log = original;
      }
      expect(logs.join("\n")).not.toContain("pinthread init");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
