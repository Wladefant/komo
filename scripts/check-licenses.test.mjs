import assert from "node:assert/strict";
import { test } from "node:test";
import { permits, violations } from "./check-licenses.mjs";

test("allow-listed licences and SPDX expressions", () => {
  for (const expression of [
    "MIT",
    "ISC",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "0BSD",
    "Apache-2.0",
    "MIT OR Apache-2.0",
    "(MIT OR GPL-3.0-only)",
    "GPL-3.0-only OR MIT",
    "MIT OR GPL-3.0-only AND MPL-2.0",
    "GPL-3.0-only AND MPL-2.0 OR MIT",
    "MIT AND ISC",
  ])
    assert.equal(permits(expression), true, expression);
  for (const expression of [
    "GPL-3.0-only",
    "MPL-2.0",
    "MIT AND GPL-3.0-only",
    "(MIT OR GPL-3.0-only) AND MPL-2.0",
    "Apache-2.0 WITH LLVM-exception",
    "SEE LICENSE IN LICENSE.md",
    "UNLICENSED",
    "Unknown",
    "(MIT",
    "",
  ])
    assert.equal(permits(expression), false, expression);
});

const pkg = (name, license) => ({ name, versions: ["1.0.0"], license });

test("a new dependency outside the allow-list fails", () => {
  const report = {
    MIT: [pkg("react", "MIT")],
    "GPL-3.0-only": [pkg("copyleft-widget", "GPL-3.0-only")],
  };
  assert.deepEqual(
    violations(report).map(({ name }) => name),
    ["copyleft-widget"],
  );
});

test("exceptions cover only their package and exact licence", () => {
  const report = {
    "MPL-2.0": [
      pkg("lightningcss", "MPL-2.0"),
      pkg("lightningcss-linux-x64-gnu", "MPL-2.0"),
      pkg("mpl-newcomer", "MPL-2.0"),
    ],
    "LGPL-3.0-or-later": [
      pkg("@img/sharp-libvips-linux-x64", "LGPL-3.0-or-later"),
    ],
    "GPL-3.0-only": [pkg("lru-cache", "GPL-3.0-only")],
  };
  assert.deepEqual(
    violations(report).map(({ name }) => name),
    ["mpl-newcomer", "lru-cache"],
  );
});
