import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { standardGitHubArtifactIssueTemplates } from "../src/generated/standard-github-issue-templates.mjs";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), "spiral-cli-pack-smoke-"));

try {
  const pack = spawnSync(
    "npm",
    ["pack", "--json", "--pack-destination", temporaryRoot],
    { cwd: packageRoot, encoding: "utf8" },
  );
  if (pack.status !== 0) {
    throw new Error(`npm pack failed:\n${pack.stderr || pack.stdout}`);
  }

  const [{ filename }] = JSON.parse(pack.stdout);
  const archive = join(temporaryRoot, filename);
  const untar = spawnSync("tar", ["-xzf", archive, "-C", temporaryRoot], {
    encoding: "utf8",
  });
  if (untar.status !== 0) {
    throw new Error(`tar extraction failed:\n${untar.stderr || untar.stdout}`);
  }

  const target = join(temporaryRoot, "target");
  const cli = join(temporaryRoot, "package", "src", "cli.mjs");
  const init = spawnSync(
    process.execPath,
    [
      cli,
      "init",
      "--artifact",
      "github",
      "--process",
      "standard",
      "--cwd",
      target,
    ],
    { encoding: "utf8" },
  );
  if (init.status !== 0) {
    throw new Error(`packed CLI init failed:\n${init.stderr || init.stdout}`);
  }

  for (const template of standardGitHubArtifactIssueTemplates) {
    const path = join(target, ".github", "ISSUE_TEMPLATE", template.filename);
    if (!existsSync(path)) {
      throw new Error(`Packed CLI did not generate ${template.filename}`);
    }
    const body = readFileSync(path, "utf8");
    if (
      !body.includes(
        `<!-- spiral-artifact-type: ${template.artifactType} -->`,
      )
    ) {
      throw new Error(
        `Packed CLI generated an invalid Artifact type for ${template.filename}`,
      );
    }
  }

  if (existsSync(join(target, ".github", "ISSUE_TEMPLATE", "demand.md"))) {
    throw new Error("Packed CLI generated legacy demand.md");
  }
  if (existsSync(join(target, ".github", "ISSUE_TEMPLATE", "feature.md"))) {
    throw new Error("Packed CLI generated legacy feature.md");
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
