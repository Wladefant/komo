// Fail when any installed workspace dependency carries a licence outside the
// allow-list. Every exception names one package, its exact licence and why it
// never ships to customers, so a new or relicensed dependency fails the check.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const allowed = new Set([
  "MIT",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "Apache-2.0",
]);

// `name` matches exactly; a trailing `*` matches platform builds of a package.
export const exceptions = [
  {
    name: "@csstools/color-helpers",
    licenses: ["MIT-0"],
    reason: "jsdom test environment only; MIT without the attribution clause",
  },
  {
    name: "@csstools/css-syntax-patches-for-csstree",
    licenses: ["MIT-0"],
    reason: "jsdom test environment only; MIT without the attribution clause",
  },
  {
    name: "mdn-data",
    licenses: ["CC0-1.0"],
    reason: "jsdom test environment only; public-domain data",
  },
  {
    name: "lru-cache",
    licenses: ["BlueOak-1.0.0"],
    reason: "jsdom test environment only; permissive",
  },
  {
    name: "lightningcss*",
    licenses: ["MPL-2.0"],
    reason: "Vite inside Vitest only; never bundled",
  },
  {
    name: "@speed-highlight/core",
    licenses: ["CC0-1.0"],
    reason: "Wrangler local dev server error pages only",
  },
  {
    name: "@img/sharp-*",
    licenses: ["Apache-2.0 AND LGPL-3.0-or-later", "LGPL-3.0-or-later"],
    reason: "Wrangler local image binding only; never bundled or deployed",
  },
];

function tokenize(expression) {
  return expression.match(/\(|\)|[^\s()]+/g) ?? [];
}

// True when the SPDX expression grants use under allow-listed licences only:
// OR needs one allowed side, AND needs both. Anything unparseable fails.
export function permits(expression) {
  const tokens = tokenize(expression);
  let at = 0;
  const atom = () => {
    const token = tokens[at++];
    if (token === "(") {
      const value = either();
      if (tokens[at++] !== ")") throw new Error("unbalanced");
      return value;
    }
    if (!token || /^(AND|OR|WITH|\))$/.test(token))
      throw new Error("unexpected");
    if (tokens[at] === "WITH") {
      at += 2;
      return false;
    }
    return allowed.has(token);
  };
  const both = () => {
    let value = atom();
    while (tokens[at] === "AND") {
      at++;
      value = atom() && value;
    }
    return value;
  };
  const either = () => {
    let value = both();
    while (tokens[at] === "OR") {
      at++;
      value = both() || value;
    }
    return value;
  };
  try {
    const value = either();
    return at === tokens.length && value;
  } catch {
    return false;
  }
}

const covers = (pattern, name) =>
  pattern.endsWith("*")
    ? name.startsWith(pattern.slice(0, -1))
    : pattern === name;

// `report` is the object printed by `pnpm licenses list --json`.
export function violations(report) {
  const found = [];
  for (const packages of Object.values(report))
    for (const { name, versions, license } of packages) {
      if (permits(license)) continue;
      const exception = exceptions.find((entry) => covers(entry.name, name));
      if (exception?.licenses.includes(license)) continue;
      found.push({ name, versions, license });
    }
  return found;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file] = process.argv.slice(2);
  const report = JSON.parse(
    file
      ? readFileSync(file, "utf8")
      : execSync("pnpm licenses list --json", {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          timeout: 120000,
          windowsHide: true,
        }),
  );
  const count = Object.values(report).flat().length;
  if (count === 0)
    throw new Error("pnpm reported no packages; run pnpm install");
  const found = violations(report);
  for (const { name, versions, license } of found)
    console.error(`${name}@${versions.join(", ")}: ${license}`);
  if (found.length > 0) {
    console.error(
      `${found.length} package(s) outside the licence allow-list (${[...allowed].join(", ")}).`,
    );
    process.exit(1);
  }
  console.log(`Licence check passed for ${count} packages.`);
}
