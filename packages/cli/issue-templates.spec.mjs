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
  it("github × standardでBinding対応Template群を生成する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "standard" });

      expect(
        existsSync(join(cwd, ".github/ISSUE_TEMPLATE/spiral-cycle.md")),
      ).toBe(true);
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/demand.md"))).toBe(
        true,
      );
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/feature.md"))).toBe(
        true,
      );
      expect(
        existsSync(join(cwd, ".github/ISSUE_TEMPLATE/spiral-artifact.md")),
      ).toBe(false);
      expect(
        readFileSync(join(cwd, ".github/ISSUE_TEMPLATE/demand.md"), "utf8"),
      ).toContain("## 要件");
      expect(
        readFileSync(join(cwd, ".github/ISSUE_TEMPLATE/feature.md"), "utf8"),
      ).toContain("## 対象要件");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("github × customではStandard固有Templateを生成しない", () => {
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
      const path = join(cwd, ".github/ISSUE_TEMPLATE/demand.md");
      writeFileSync(path, "existing demand template\n");

      expect(() =>
        initRepository({ cwd, artifact: "github", process: "standard" }),
      ).toThrow("manual decision required: .github/ISSUE_TEMPLATE/demand.md");
      expect(readFileSync(path, "utf8")).toBe("existing demand template\n");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
