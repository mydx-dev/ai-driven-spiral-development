import { describe, expect, it } from "vitest";
import * as standard from "./index.js";

describe("@mydx-dev/spiral-standard public API", () => {
  it("8工程のStage名を唯一のStandard工程名として公開する", () => {
    expect(standard.standardStageNames).toEqual([
      "要求定義",
      "システム要件定義",
      "ソフトウェア要件定義",
      "実装",
      "統合",
      "QA",
      "検収",
      "フィードバック",
    ]);
    expect(standard.standardProcessNames).toEqual(
      standard.standardStageNames.slice(0, -1),
    );
    expect(standard.standardFeedbackName).toBe("フィードバック");
  });

  it("8工程で利用するArtifactとGateをpackage rootから公開する", () => {
    expect([
      standard.StandardCycle,
      standard.StakeholderRequirementsSpecification,
      standard.SystemRequirementsSpecification,
      standard.SystemArchitectureDescription,
      standard.SoftwareRequirementsSpecification,
      standard.SoftwareArchitectureDescription,
      standard.SoftwareElementDesign,
      standard.ImplementedSoftwareElements,
      standard.IntegratedSoftware,
      standard.VerificationResult,
      standard.ValidationResult,
      standard.RequirementsGate,
      standard.SystemRequirementsGate,
      standard.SoftwareRequirementsGate,
      standard.ImplementationGate,
      standard.IntegrationGate,
      standard.VerificationGate,
      standard.ValidationGate,
    ]).not.toContain(undefined);
  });

  it("旧APIは移行用legacy namespaceに隔離されている", () => {
    expect([
      standard.legacy.Demand,
      standard.legacy.ExternalSpec,
      standard.legacy.Implementation,
      standard.legacy.QAReport,
      standard.legacy.Release,
      standard.legacy.AcceptanceReport,
    ]).not.toContain(undefined);

    expect(standard.standardStageNames).not.toEqual(
      expect.arrayContaining([
        "Demand Definition",
        "Requirement Definition",
        "External Design",
        "Engineering",
        "Release",
        "Acceptance",
      ]),
    );
  });
});
