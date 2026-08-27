import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { initRepository } from "./src/init.mjs";
import { resolveComposition } from "./src/registry.mjs";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const temporaryRepository = () =>
  mkdtempSync(join(tmpdir(), "spiral-cli-test-"));

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

describe("composition resolution", () => {
  it("composes GitHub + Standard with the compatibility binding", () => {
    const composition = resolveComposition({
      artifact: "github",
      process: "standard",
    });
    expect(Object.keys(composition.dependencies)).toEqual([
      "ai-driven-spiral-development",
      "@mydx/spiral-github",
      "@mydx/spiral-standard",
      "@mydx/spiral-standard-github",
    ]);
  });

  it("does not pull Standard packages into GitHub + custom", () => {
    const composition = resolveComposition({
      artifact: "github",
      process: "custom",
    });
    expect(composition.dependencies["@mydx/spiral-standard"]).toBeUndefined();
    expect(
      composition.dependencies["@mydx/spiral-standard-github"],
    ).toBeUndefined();
    expect(composition.requiresProjectBinding).toBe(true);
  });

  it("adds Quality Guard only when requested", () => {
    expect(
      resolveComposition({ quality: true }).devDependencies,
    ).toHaveProperty("@mydx/spiral-quality");
    expect(
      resolveComposition({ quality: false }).devDependencies,
    ).not.toHaveProperty("@mydx/spiral-quality");
  });
});

describe("portable init", () => {
  it("initializes an empty repository", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({
        cwd,
        artifact: "github",
        process: "standard",
        quality: true,
      });
      const packageJson = readJson(join(cwd, "package.json"));
      expect(packageJson.dependencies).toHaveProperty("@mydx/spiral-github");
      expect(packageJson.dependencies).toHaveProperty("@mydx/spiral-standard");
      expect(packageJson.dependencies).toHaveProperty(
        "@mydx/spiral-standard-github",
      );
      expect(packageJson.devDependencies).toHaveProperty(
        "@mydx/spiral-quality",
      );
      expect(packageJson.scripts.quality).toBe("spiral-quality");
      expect(readFileSync(join(cwd, "spiral.config.mjs"), "utf8")).toContain(
        '"binding": "@mydx/spiral-standard-github"',
      );
      expect(
        readFileSync(join(cwd, "src/spiral/execution-channel.mjs"), "utf8"),
      ).toContain("TODO: project固有Execution Channel");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("preserves an existing TypeScript repository and unrelated workflow", () => {
    const cwd = temporaryRepository();
    try {
      writeFileSync(
        join(cwd, "package.json"),
        `${JSON.stringify({ name: "existing", scripts: { test: "vitest" }, dependencies: { react: "19.0.0" } }, null, 2)}\n`,
      );
      writeFileSync(
        join(cwd, "tsconfig.json"),
        '{"compilerOptions":{"strict":true}}\n',
      );
      mkdirSync(join(cwd, ".github/workflows"), { recursive: true });
      writeFileSync(
        join(cwd, ".github/workflows/ci.yml"),
        "name: Existing CI\n",
      );

      initRepository({ cwd, artifact: "github", process: "standard" });

      const packageJson = readJson(join(cwd, "package.json"));
      expect(packageJson.dependencies.react).toBe("19.0.0");
      expect(packageJson.scripts.test).toBe("vitest");
      expect(readFileSync(join(cwd, "tsconfig.json"), "utf8")).toBe(
        '{"compilerOptions":{"strict":true}}\n',
      );
      expect(readFileSync(join(cwd, ".github/workflows/ci.yml"), "utf8")).toBe(
        "name: Existing CI\n",
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("is idempotent when run twice with the same options", () => {
    const cwd = temporaryRepository();
    try {
      const first = initRepository({
        cwd,
        artifact: "github",
        process: "standard",
        quality: true,
      });
      const packageAfterFirst = readFileSync(join(cwd, "package.json"), "utf8");
      const second = initRepository({
        cwd,
        artifact: "github",
        process: "standard",
        quality: true,
      });
      expect(first.changes.length).toBeGreaterThan(0);
      expect(second.alreadySatisfied).toBe(true);
      expect(readFileSync(join(cwd, "package.json"), "utf8")).toBe(
        packageAfterFirst,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("aborts before writing when an existing generated file conflicts", () => {
    const cwd = temporaryRepository();
    try {
      writeFileSync(join(cwd, "package.json"), '{"name":"existing"}\n');
      writeFileSync(
        join(cwd, "spiral.config.mjs"),
        "export default { custom: true };\n",
      );
      const before = readFileSync(join(cwd, "package.json"), "utf8");
      expect(() =>
        initRepository({
          cwd,
          artifact: "github",
          process: "standard",
          quality: true,
        }),
      ).toThrow("manual decision required: spiral.config.mjs");
      expect(readFileSync(join(cwd, "package.json"), "utf8")).toBe(before);
      expect(readFileSync(join(cwd, "spiral.config.mjs"), "utf8")).toBe(
        "export default { custom: true };\n",
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("runs fully specified init without prompting", () => {
    const cwd = temporaryRepository();
    try {
      const result = spawnSync(
        process.execPath,
        [
          join(packageRoot, "src/cli.mjs"),
          "init",
          "--artifact",
          "github",
          "--process",
          "standard",
          "--quality",
          "--cwd",
          cwd,
        ],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("safe create: spiral.config.mjs");
      expect(
        readJson(join(cwd, "package.json")).devDependencies,
      ).toHaveProperty("@mydx/spiral-quality");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
