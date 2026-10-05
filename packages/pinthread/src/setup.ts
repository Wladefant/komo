import { initComments } from "./index.js";
import { resolveConfig, type PinthreadConfig } from "./config.js";
export type { PinthreadConfig } from "./config.js";

/** Bind generated public settings once; mount with optional per-site overrides. */
export function definePinthread(config: PinthreadConfig) {
  return (overrides: Partial<PinthreadConfig> = {}) =>
    initComments(resolveConfig({ ...config, ...overrides }));
}

/** @deprecated Pre-rename name for definePinthread. */
export const defineKomo = definePinthread;
