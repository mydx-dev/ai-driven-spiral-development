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
import {
  renderStandardGitHubArtifactIssueTemplate,
  standardGitHubArtifactIssueMappingsByKey,
  standardGitHubArtifactIssueTemplates,
} from "./src/generated/standard-github-issue-templates.mjs";

const temporaryRepository = () =>
  mkdtempSync(join(tmpdir(), "spiral-cli-template-test-"));

const machineManagedTemplateNames = [
  "spiral-implemented-software-elements.md",
  "spiral-integrated-software.md",
  "spiral-verification-result.md",
  "spiral-validation-result.md",
  "spiral-standard-feedback-state.md",
];

describe("Standard × GitHub Issue Templates", () => {
  it("github × standardではIssue管理する6種の正式Artifact Templateだけを生成する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "standard" });

      expect(standardGitHubArtifactIssueTemplates).toHaveLength(6);
      for (const template of standardGitHubArtifactIssueTemplates) {
        const path = join(cwd, ".github/ISSUE_TEMPLATE", template.filename);
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toBe(
          renderStandardGitHubArtifactIssueTemplate(template),
        );
        expect(content).toContain(
          `<!-- spiral-artifact-type: ${template.artifactType} -->`,
        );
        expect(content).toContain(`- Process: \`${template.stage}\``);
        expect(content).toContain("## Artifact Data");
        expect(content).toContain("## Traceability");
      }

      for (const filename of machineManagedTemplateNames) {
        expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE", filename))).toBe(
          false,
        );
      }
      expect(
        existsSync(join(cwd, ".github/ISSUE_TEMPLATE/spiral-artifact.md")),
      ).toBe(false);
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/demand.md"))).toBe(
        false,
      );
      expect(existsSync(join(cwd, ".github/ISSUE_TEMPLATE/feature.md"))).toBe(
        false,
      );
      expect(
        existsSync(
          join(cwd, ".github/ISSUE_TEMPLATE/requirement-allocation.md"),
        ),
      ).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("Verification / Validation / FeedbackはRuntime管理でTemplate対象外と明示する", () => {
    expect(
      standardGitHubArtifactIssueMappingsByKey.verificationResult.template,
    ).toBe(false);
    expect(
      standardGitHubArtifactIssueMappingsByKey.validationResult.template,
    ).toBe(false);
    expect(
      standardGitHubArtifactIssueMappingsByKey.feedbackState.template,
    ).toBe(false);
    expect(
      standardGitHubArtifactIssueMappingsByKey.implementedSoftwareElements,
    ).toBe(undefined);
    expect(standardGitHubArtifactIssueMappingsByKey.integratedSoftware).toBe(
      undefined,
    );
  });

  it("Artifact Dataは各Issue-backed Standard Artifactの構造を提示する", () => {
    const byKey = standardGitHubArtifactIssueMappingsByKey;
    expect(byKey.stakeholderRequirements.artifactData).toHaveProperty(
      "stakeholders",
    );
    expect(byKey.systemRequirements.artifactData).toHaveProperty(
      "requirements",
    );
    expect(byKey.systemArchitectureDescription.artifactData).toHaveProperty(
      "requirementAllocations",
    );
    expect(byKey.softwareRequirements.artifactData).toHaveProperty(
      "requirements",
    );
    expect(byKey.softwareArchitectureDescription.sections).toContain(
      "## Dependency Graph",
    );
    expect(byKey.softwareElementDesign.artifactData).toHaveProperty(
      "architectureElement",
    );
  });

  it("github × customでは汎用Artifact Templateだけを生成する", () => {
    const cwd = temporaryRepository();
    try {
      initRepository({ cwd, artifact: "github", process: "custom" });
      expect(
        existsSync(join(cwd, ".github/ISSUE_TEMPLATE/spiral-artifact.md")),
      ).toBe(true);
      for (const template of standardGitHubArtifactIssueTemplates) {
        expect(
          existsSync(join(cwd, ".github/ISSUE_TEMPLATE", template.filename)),
        ).toBe(false);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("既存Standard Artifact Templateと競合した場合は無断上書きしない", () => {
    const cwd = temporaryRepository();
    try {
      mkdirSync(join(cwd, ".github/ISSUE_TEMPLATE"), { recursive: true });
      const filename = standardGitHubArtifactIssueTemplates[0].filename;
      const path = join(cwd, ".github/ISSUE_TEMPLATE", filename);
      writeFileSync(path, "existing artifact template\n");
      expect(() =>
        initRepository({ cwd, artifact: "github", process: "standard" }),
      ).toThrow(`manual decision required: .github/ISSUE_TEMPLATE/${filename}`);
      expect(readFileSync(path, "utf8")).toBe("existing artifact template\n");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
