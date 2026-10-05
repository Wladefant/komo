"use client";

import { useEffect, useRef } from "react";
import { initPinthread } from "./index.js";
import type { PinthreadConfig } from "./config.js";
import type { CommentsController } from "./types.js";

export type { PinthreadConfig } from "./config.js";

function sameConfig(a: PinthreadConfig, b: PinthreadConfig): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<
    keyof PinthreadConfig
  >;
  return [...keys].every((key) => {
    if (key !== "onboarding") return Object.is(a[key], b[key]);
    const before = a.onboarding;
    const after = b.onboarding;
    if (!before || !after) return before === after;
    return Object.keys({ ...before, ...after }).every((field) => {
      if (field === "sites")
        return (
          before.sites?.length === after.sites?.length &&
          (before.sites ?? []).every(
            (site, index) => site === after.sites?.[index],
          )
        );
      return Object.is(
        before[field as keyof typeof before],
        after[field as keyof typeof after],
      );
    });
  });
}

/** Mount once near the React app root. Memoize callback options with useCallback. */
export function usePinthread(config: PinthreadConfig): void {
  const mounted = useRef<{
    config: PinthreadConfig;
    controller: CommentsController;
  } | null>(null);

  useEffect(() => {
    if (mounted.current && sameConfig(mounted.current.config, config)) return;
    mounted.current?.controller.destroy();
    mounted.current = null;
    if (config.enabled === false) return;
    const snapshot = {
      ...config,
      ...(config.onboarding
        ? {
            onboarding: {
              ...config.onboarding,
              ...(config.onboarding.sites
                ? { sites: [...config.onboarding.sites] }
                : {}),
            },
          }
        : {}),
    };
    mounted.current = { config: snapshot, controller: initPinthread(snapshot) };
  });

  useEffect(
    () => () => {
      mounted.current?.controller.destroy();
      mounted.current = null;
    },
    [],
  );
}
