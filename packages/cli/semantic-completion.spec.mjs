import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initRepository } from "./src/init.mjs";

const temporaryRepository = () =>
  mkdtempSync(join(tmpdir(), "spiral-cli-semantic-completion-"));

describe("GitHub Standard Semantic Completion", () => {
  it("生成entrypointがStandard GitHub Runtimeを実行する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "standard" });
      const entrypoint = readFileSync(
        join(cwd, "scripts/spiral/main.mjs"),
        "utf8",
      );

      expect(entrypoint).toContain("createStandardGitHubRuntime");
      expect(entrypoint).toContain("SPIRAL_CYCLE_ID");
      expect(entrypoint).toContain("SPIRAL_PROCESS_NAME");
      expect(entrypoint).toContain(
        "await runtime.circulate({ cycleId, name })",
      );
      expect(entrypoint).toContain("createGitHubClient");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("workflow_dispatch入力をcycleIdとSemantic Completion名へ渡す", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "standard" });
      const workflow = readFileSync(
        join(cwd, ".github/workflows/spiral-circulate.yml"),
        "utf8",
      );

      expect(workflow).toContain("workflow_dispatch:");
      expect(workflow).toContain("cycle_id:");
      expect(workflow).toContain("process_name:");
      for (const name of [
        "Demand Definition",
        "Requirement Definition",
        "External Design",
        "Engineering",
        "QA",
        "Release",
        "Acceptance",
        "cycle",
      ]) {
        expect(workflow).toContain(`- ${name}`);
      }
      expect(workflow).toContain("SPIRAL_CYCLE_ID: ${{ inputs.cycle_id }}");
      expect(workflow).toContain(
        "SPIRAL_PROCESS_NAME: ${{ inputs.process_name }}",
      );
      expect(workflow).toContain("node scripts/spiral/main.mjs");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("構成検証workflowと実行workflowを分離する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({
        cwd,
        artifact: "github",
        process: "standard",
        quality: true,
      });
      const verify = readFileSync(
        join(cwd, ".github/workflows/spiral.yml"),
        "utf8",
      );
      const circulate = readFileSync(
        join(cwd, ".github/workflows/spiral-circulate.yml"),
        "utf8",
      );

      expect(verify).toContain("name: Spiral Verify");
      expect(verify).toContain("pnpm quality");
      expect(verify).not.toContain("SPIRAL_PROCESS_NAME");
      expect(circulate).toContain("name: Spiral Circulate");
      expect(circulate).not.toContain("pnpm quality");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
