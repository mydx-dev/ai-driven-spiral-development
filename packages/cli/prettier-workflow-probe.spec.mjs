import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { initRepository, planInit } from "./src/init.mjs";

it("prints formatted workflow", () => {
  const cwd = mkdtempSync(join(tmpdir(), "spiral-workflow-probe-"));
  try {
    initRepository({ cwd, artifact: "github", process: "standard" });
    const path = ".github/workflows/spiral-circulate.yml";
    const packageRoot = dirname(fileURLToPath(import.meta.url));
    const prettier = join(packageRoot, "../../node_modules/.bin/prettier");
    spawnSync(prettier, ["--write", "--single-quote", "--tab-width", "4", path], {
      cwd,
      encoding: "utf8",
    });
    console.log("WORKFLOW_START");
    console.log(readFileSync(join(cwd, path), "utf8"));
    console.log("WORKFLOW_END");
    console.log("PLAN", planInit({ cwd, artifact: "github", process: "standard" }).conflicts);
    expect.fail("workflow probe");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
