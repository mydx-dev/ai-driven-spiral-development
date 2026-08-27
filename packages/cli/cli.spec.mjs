import {
  existsSync,
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
      "@mydx-dev/ai-driven-spiral-development",
      "@mydx-dev/spiral-github",
      "@mydx-dev/spiral-standard",
      "@mydx-dev/spiral-standard-github",
    ]);
  });

  it("does not pull Standard packages into GitHub + custom", () => {
    const composition = resolveComposition({
      artifact: "github",
      process: "custom",
    });
    expect(
      composition.dependencies["@mydx-dev/spiral-standard"],
    ).toBeUndefined();
    expect(
      composition.dependencies["@mydx-dev/spiral-standard-github"],
    ).toBeUndefined();
    expect(composition.requiresProjectBinding).toBe(true);
  });

  it("adds Quality Guard only when requested", () => {
    expect(
      resolveComposition({ quality: true }).devDependencies,
    ).toHaveProperty("@mydx-dev/spiral-quality");
    expect(
      resolveComposition({ quality: false }).devDependencies,
    ).not.toHaveProperty("@mydx-dev/spiral-quality");
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
      expect(packageJson.dependencies).toHaveProperty(
        "@mydx-dev/spiral-github",
      );
      expect(packageJson.dependencies).toHaveProperty(
        "@mydx-dev/spiral-standard",
      );
      expect(packageJson.dependencies).toHaveProperty(
        "@mydx-dev/spiral-standard-github",
      );
      expect(packageJson.devDependencies).toHaveProperty(
        "@mydx-dev/spiral-quality",
      );
      expect(packageJson.scripts.quality).toBe("spiral-quality");
      expect(readFileSync(join(cwd, "spiral.config.mjs"), "utf8")).toContain(
        '"binding": "@mydx-dev/spiral-standard-github"',
      );
      expect(readFileSync(join(cwd, "spiral.config.mjs"), "utf8")).toContain(
        '"executionChannel": "./scripts/spiral/execution-channel.mjs"',
      );
      expect(
        readFileSync(join(cwd, "scripts/spiral/execution-channel.mjs"), "utf8"),
      ).toContain("TODO: project固有Execution Channel");
      expect(existsSync(join(cwd, "scripts/spiral/main.mjs"))).toBe(true);
      expect(existsSync(join(cwd, "src/spiral"))).toBe(false);
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

  it("does not move or delete legacy src/spiral files automatically", () => {
    const cwd = temporaryRepository();
    try {
      writeFileSync(join(cwd, "package.json"), '{"name":"existing"}\n');
      mkdirSync(join(cwd, "src/spiral"), { recursive: true });
      writeFileSync(
        join(cwd, "src/spiral/execution-channel.mjs"),
        "export const execute = async () => {};\n",
      );
      const legacy = readFileSync(
        join(cwd, "src/spiral/execution-channel.mjs"),
        "utf8",
      );

      expect(() =>
        initRepository({ cwd, artifact: "github", process: "standard" }),
      ).toThrow("legacy Spiral files detected under src/spiral/**");
      expect(
        readFileSync(join(cwd, "src/spiral/execution-channel.mjs"), "utf8"),
      ).toBe(legacy);
      expect(existsSync(join(cwd, "scripts/spiral"))).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects an existing dependency with a different requested version", () => {
    const cwd = temporaryRepository();
    try {
      writeFileSync(
        join(cwd, "package.json"),
        `${JSON.stringify({ dependencies: { "@mydx-dev/spiral-github": "0.1.0" } }, null, 2)}\n`,
      );
      const before = readFileSync(join(cwd, "package.json"), "utf8");

      expect(() =>
        initRepository({ cwd, artifact: "github", process: "custom" }),
      ).toThrow(
        "manual decision required: @mydx-dev/spiral-github requires latest but dependencies has 0.1.0",
      );
      expect(readFileSync(join(cwd, "package.json"), "utf8")).toBe(before);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects Quality Guard when it already exists in dependencies", () => {
    const cwd = temporaryRepository();
    try {
      writeFileSync(
        join(cwd, "package.json"),
        `${JSON.stringify({ dependencies: { "@mydx-dev/spiral-quality": "latest" } }, null, 2)}\n`,
      );
      const before = readFileSync(join(cwd, "package.json"), "utf8");

      expect(() =>
        initRepository({
          cwd,
          artifact: "github",
          process: "custom",
          quality: true,
        }),
      ).toThrow(
        "manual decision required: @mydx-dev/spiral-quality already exists in dependencies as latest",
      );
      expect(readFileSync(join(cwd, "package.json"), "utf8")).toBe(before);
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
      expect(result.stdout).toContain("safe create: scripts/spiral/main.mjs");
      expect(
        readJson(join(cwd, "package.json")).devDependencies,
      ).toHaveProperty("@mydx-dev/spiral-quality");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
