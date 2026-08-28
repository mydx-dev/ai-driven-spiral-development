import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { initRepository } from "./src/init.mjs";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const prettier = join(packageRoot, "../../node_modules/.bin/prettier");
const temporaryRepository = () =>
  mkdtempSync(join(tmpdir(), "spiral-cli-semantic-idempotency-"));

const generatedPaths = [
  "package.json",
  "spiral.config.mjs",
  "quality.config.mjs",
  "scripts/spiral/main.mjs",
  "scripts/spiral/execution-channel.mjs",
  ".github/ISSUE_TEMPLATE/spiral-cycle.md",
  ".github/ISSUE_TEMPLATE/demand.md",
  ".github/ISSUE_TEMPLATE/feature.md",
  ".github/pull_request_template.md",
  ".github/workflows/spiral.yml",
];

const init = (cwd) =>
  initRepository({
    cwd,
    artifact: "github",
    process: "standard",
    quality: true,
  });

describe("formatter適用後のportable init", () => {
  it("Prettier適用後もalready satisfiedになり既存fileを書き換えない", () => {
    const cwd = temporaryRepository();
    try {
      init(cwd);
      const formatted = spawnSync(
        prettier,
        ["--write", "--single-quote", "--tab-width", "4", ...generatedPaths],
        { cwd, encoding: "utf8" },
      );
      expect(formatted.status).toBe(0);

      const before = Object.fromEntries(
        generatedPaths.map((path) => [
          path,
          readFileSync(join(cwd, path), "utf8"),
        ]),
      );
      const result = init(cwd);

      expect(result.alreadySatisfied).toBe(true);
      for (const path of generatedPaths) {
        expect(readFileSync(join(cwd, path), "utf8")).toBe(before[path]);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("package.jsonのproperty順とindentだけが違う場合は書き換えない", () => {
    const cwd = temporaryRepository();
    try {
      init(cwd);
      const packageJson = JSON.parse(
        readFileSync(join(cwd, "package.json"), "utf8"),
      );
      const reordered = {
        scripts: packageJson.scripts,
        devDependencies: packageJson.devDependencies,
        dependencies: packageJson.dependencies,
      };
      writeFileSync(
        join(cwd, "package.json"),
        `${JSON.stringify(reordered, null, 4)}\n`,
      );
      const before = readFileSync(join(cwd, "package.json"), "utf8");

      expect(init(cwd).alreadySatisfied).toBe(true);
      expect(readFileSync(join(cwd, "package.json"), "utf8")).toBe(before);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("configの意味変更は競合として検出する", () => {
    const cwd = temporaryRepository();
    try {
      init(cwd);
      const path = join(cwd, "spiral.config.mjs");
      writeFileSync(
        path,
        readFileSync(path, "utf8").replace(
          "./scripts/spiral/execution-channel.mjs",
          "./custom/execution-channel.mjs",
        ),
      );

      expect(() => init(cwd)).toThrow(
        "manual decision required: spiral.config.mjs",
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("scriptの意味変更は競合として検出する", () => {
    const cwd = temporaryRepository();
    try {
      init(cwd);
      const path = join(cwd, "scripts/spiral/execution-channel.mjs");
      writeFileSync(
        path,
        readFileSync(path, "utf8").replace(
          "void message;",
          "console.log(message);",
        ),
      );

      expect(() => init(cwd)).toThrow(
        "manual decision required: scripts/spiral/execution-channel.mjs",
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
