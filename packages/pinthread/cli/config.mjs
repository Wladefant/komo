import { execFileSync } from "node:child_process";

export function gitValue(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
export function repository(remote) {
  const match = remote.match(
    /^(?:https?:\/\/[^/]+\/|ssh:\/\/(?:[^@/]+@)?[^/]+\/|(?:[^@/]+@)?[^:/]+:)(.+?)(?:\.git)?\/?$/
  );
  return match?.[1] || "";
}
export function branchName(env, cwd) {
  return (
    env.PINTHREAD_BRANCH ||
    env.CF_PAGES_BRANCH ||
    env.WORKERS_CI_BRANCH ||
    env.VERCEL_GIT_COMMIT_REF ||
    env.GITHUB_HEAD_REF ||
    env.GITHUB_REF_NAME ||
    env.BRANCH ||
    gitValue(["symbolic-ref", "--short", "HEAD"], cwd)
  );
}
export function clientModule(config) {
  return `import { definePinthread } from 'pinthread/setup';\n\nexport const initPinthread = definePinthread(${JSON.stringify(config, null, 2)});\n`;
}
