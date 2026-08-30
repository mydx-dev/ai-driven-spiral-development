import { describe, expect, it } from "vitest";
import * as standard from "./index.js";

describe("@mydx-dev/spiral-standard public API", () => {
  it("8工程のStage名を公開する", () => {
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

  it("旧Standard Process APIをpackage rootへ公開しない", () => {
    for (const name of [
      "Demand",
      "DemandDefinitionGate",
      "Requirement",
      "RequirementDefinitionGate",
      "ExternalSpec",
      "ExternalDesignGate",
      "Implementation",
      "EngineeringGate",
      "QAReport",
      "QAGate",
      "Release",
      "ReleaseGate",
      "AcceptanceReport",
      "AcceptanceGate",
      "RequirementAllocation",
      "SystemArchitecture",
      "SoftwareDesign",
    ]) {
      expect(name in standard).toBe(false);
    }
  });
});
