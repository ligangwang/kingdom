// The plugin bundle builds, and its rules run on their own in Node, as on
// dingn's server, where nothing else of this package is installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "dist", "plugin");

test("builds a plugin bundle whose rules stand alone", async () => {
  execFileSync(process.execPath, [
    path.join(root, "scripts", "build-plugin.mjs"),
  ]);
  const manifest = JSON.parse(
    readFileSync(path.join(out, "reward.json"), "utf8"),
  );
  const { version } = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  assert.deepEqual(manifest, {
    system: "kingdom",
    version,
    api: 1,
    rules: "rules.mjs",
    ui: "ui.js",
    css: "kingdom.css",
    assets: "assets/kingdom/",
  });
  for (const file of ["ui.js", "kingdom.css", "assets/kingdom/CREDITS.md"])
    assert.ok(existsSync(path.join(out, file)), file);
  const rules = await import(pathToFileURL(path.join(out, "rules.mjs")).href);
  assert.equal(rules.PLUGIN_API, 1);
  assert.equal(rules.levels.levelFor(0), 1);
  assert.equal(typeof rules.rewards.grant, "function");
  // Only its own code: no import of another file or package.
  assert.doesNotMatch(
    readFileSync(path.join(out, "rules.mjs"), "utf8"),
    /^import /m,
  );
});
