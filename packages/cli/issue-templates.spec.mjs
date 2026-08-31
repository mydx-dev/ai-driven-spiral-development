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
import { describe, expect, it } from "vitest";
import { initRepository } from "./src/init.mjs";

const temporaryRepository = () =>
  mkdtempSync(join(tmpdir(), "spiral-cli-template-test-"));

describe("Standard × GitHub Issue Templates", () => {
  it("github × standardでは8工程Artifact用の汎用Templateを生成する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "standard" });

      const path = join(cwd, ".github/ISSUE_TEMPLATE/spiral-artifact.md");
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("## Artifact");
      expect(readFileSync(path, "utf8")).toContain("- Process:");
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/demand.md"))).toBe(
        false,
      );
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/feature.md"))).toBe(
        false,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("github × customでも汎用Artifact Templateを生成する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "custom" });

      expect(
        existsSync(join(cwd, ".github/ISSUE_TEMPLATE/spiral-artifact.md")),
      ).toBe(true);
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/demand.md"))).toBe(
        false,
      );
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/feature.md"))).toBe(
        false,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("既存Templateと競合した場合は無断上書きしない", () => {
    const cwd = temporaryRepository();
    try {
      mkdirSync(join(cwd, ".github/ISSUE_TEMPLATE"), { recursive: true });
      const path = join(cwd, ".github/ISSUE_TEMPLATE/spiral-artifact.md");
      writeFileSync(path, "existing artifact template\n");

      expect(() =>
        initRepository({ cwd, artifact: "github", process: "standard" }),
      ).toThrow(
        "manual decision required: .github/ISSUE_TEMPLATE/spiral-artifact.md",
      );
      expect(readFileSync(path, "utf8")).toBe("existing artifact template\n");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
