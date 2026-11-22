// Builds the kingdom as a plugin bundle that dingn loads at run time, like a
// game: dist/plugin/ with
//   reward.json     what the bundle is (system, version, plugin API)
//   rules.mjs       the rules (src/rules.mjs), for dingn's server and pages
//   ui.js + chunks  the pages (src/ui/mount.tsx), with their own React and three
//   kingdom.css     the pages' styles
//   assets/kingdom/ the models, land textures and sky
// and, with --zip, dist/kingdom-<version>.zip, which the Release workflow
// uploads to dingn (POST /api/rewards/upload with an upload key).
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { PLUGIN_API } from "../src/rules.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "dist", "plugin");
const { version } = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);

rmSync(path.join(root, "dist"), { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(root, "src", "rules.mjs")],
  outfile: path.join(out, "rules.mjs"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  legalComments: "none",
});

await build({
  entryPoints: { ui: path.join(root, "src", "ui", "mount.tsx") },
  outdir: out,
  bundle: true,
  // The 3D scene is its own file, loaded when a page first draws it.
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  minify: true,
  chunkNames: "chunk-[hash]",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});

cpSync(
  path.join(root, "src", "ui", "kingdom.css"),
  path.join(out, "kingdom.css"),
);
cpSync(
  path.join(root, "assets", "kingdom"),
  path.join(out, "assets", "kingdom"),
  {
    recursive: true,
  },
);
writeFileSync(
  path.join(out, "reward.json"),
  JSON.stringify(
    {
      system: "kingdom",
      version,
      api: PLUGIN_API,
      rules: "rules.mjs",
      ui: "ui.js",
      css: "kingdom.css",
      assets: "assets/kingdom/",
    },
    null,
    2,
  ) + "\n",
);

if (process.argv.includes("--zip")) {
  const zip = path.join(root, "dist", `kingdom-${version}.zip`);
  execFileSync("zip", ["-q", "-r", "-X", zip, "."], { cwd: out });
  console.log(`Built ${path.relative(root, zip)}`);
} else console.log(`Built ${path.relative(root, out)}/`);
