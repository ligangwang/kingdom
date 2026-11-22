// Fails a pull request that changes what the package ships (src/, assets/
// or package.json) unless its version is one not released yet, so every
// change dingn installs is published as a new release.
// Usage: node scripts/check-version.mjs <base ref>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "origin/main";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

const changed = git("diff", "--name-only", `${base}...HEAD`)
  .split("\n")
  .filter(Boolean);
const shipped = changed.filter(
  (file) => /^(src|assets)\//.test(file) || file === "package.json",
);
if (shipped.length === 0) {
  console.log("Nothing the package ships changed; no new version needed.");
  process.exit(0);
}

const before = JSON.parse(git("show", `${base}:package.json`)).version;
const after = JSON.parse(readFileSync("package.json", "utf8")).version;
const released = git("tag", "--list", `v${after}`).trim() !== "";
if (!released && !newer(before, after)) {
  console.log(
    `This change will be released as ${after} (main is at ${before}).`,
  );
  process.exit(0);
}
console.error(
  `This change ships ${shipped.length} changed file(s) but ${after} is already released.\n` +
    'Raise "version" in package.json (and package-lock.json): patch for a fix,\n' +
    "minor for a new reward or rule, major for a change dingn must adapt to.",
);
process.exit(1);

function newer(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i];
  }
  return false;
}
