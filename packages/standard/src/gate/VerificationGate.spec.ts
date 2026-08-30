import { describe, expect, it } from "vitest";
import { IntegratedSoftware } from "../artifact/IntegratedSoftware.js";
import { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import { VerificationResult } from "../artifact/VerificationResult.js";
import { VerificationGate } from "./VerificationGate.js";

const createSrs = () =>
  new SoftwareRequirementsSpecification(
    "srs-1",
    "cycle-1",
    "purpose",
    "scope",
    [
      {
        id: "functional-1",
        statement: "機能要求",
        category: "functional",
        verificationCriteria: ["works"],
        tracesTo: [],
      },
      {
        id: "quality-1",
        statement: "品質要求",
        category: "quality",
        verificationCriteria: ["fast"],
        tracesTo: [],
      },
    ],
    [],
  );

const createIntegratedSoftware = () =>
  new IntegratedSoftware(
    "integration-1",
    "cycle-1",
    [],
    [],
    [],
    ["dist/software.js"],
    [],
    [],
  );

const createVerification = () =>
  new VerificationResult("verification-1", "cycle-1", [
    {
      id: "functional-result",
      requirement: {
        specificationId: "srs-1",
        requirementId: "functional-1",
      },
      integratedSoftwareId: "integration-1",
      method: "test",
      evidence: ["reports/functional.xml"],
      passed: true,
      failureCause: null,
      unresolvedItems: [],
      qualityReferences: null,
    },
    {
      id: "quality-result",
      requirement: {
        specificationId: "srs-1",
        requirementId: "quality-1",
      },
      integratedSoftwareId: "integration-1",
      method: "analysis",
      evidence: ["reports/performance.json"],
      passed: true,
      failureCause: null,
      unresolvedItems: [],
      qualityReferences: ["ISO/IEC 25010:performance efficiency"],
    },
  ]);

describe("VerificationGate", () => {
  it("全Software Requirementがobjective evidence付きでPASSならPASSする", () => {
    expect(
      new VerificationGate(
        [createSrs()],
        [createIntegratedSoftware()],
      ).verifyStructuralComplete([createVerification()]),
    ).toEqual({ passed: true });
  });

  it("SRS requirementsが未判断ならFAILする", () => {
    const srs = new SoftwareRequirementsSpecification(
      "srs-1",
      "cycle-1",
      null,
      null,
      undefined,
      null,
    );
    const result = new VerificationGate(
      [srs],
      [createIntegratedSoftware()],
    ).verifyStructuralComplete([
      new VerificationResult("verification-1", "cycle-1", null),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Software Requirementsが未確定"),
        ]),
      );
    }
  });

  it("Integrated SoftwareのVerification対象成果物が未判断ならFAILする", () => {
    const integratedSoftware = new IntegratedSoftware(
      "integration-1",
      "cycle-1",
      [],
      [],
      [],
      undefined,
      [],
      [],
    );
    const result = new VerificationGate(
      [createSrs()],
      [integratedSoftware],
    ).verifyStructuralComplete([createVerification()]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Integrated Softwareが未確定"),
        ]),
      );
    }
  });

  it("Integrated SoftwareのVerification対象成果物がnullならVerification対象外として扱う", () => {
    const integratedSoftware = new IntegratedSoftware(
      "integration-1",
      "cycle-1",
      [],
      [],
      [],
      null,
      [],
      [],
    );
    const result = new VerificationGate(
      [createSrs()],
      [integratedSoftware],
    ).verifyStructuralComplete([createVerification()]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Integrated Softwareを特定できません"),
        ]),
      );
      expect(result.errors).not.toEqual(
        expect.arrayContaining([
          expect.stringContaining("Integrated Softwareが未確定"),
        ]),
      );
    }
  });

  it("quality requirementを含む未検証Requirementを検出する", () => {
    const verification = createVerification();
    const result = new VerificationGate(
      [createSrs()],
      [createIntegratedSoftware()],
    ).verifyStructuralComplete([
      new VerificationResult(verification.id, verification.cycleId, [
        verification.results![0],
      ]),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "srs-1:quality-1: Verification結果がありません",
          ),
        ]),
      );
    }
  });

  it("未知のIntegrated Software参照を検出する", () => {
    const verification = createVerification();
    const invalid = new VerificationResult(
      verification.id,
      verification.cycleId,
      verification.results!.map((result, index) =>
        index === 0
          ? { ...result, integratedSoftwareId: "unknown-integration" }
          : result,
      ),
    );
    const result = new VerificationGate(
      [createSrs()],
      [createIntegratedSoftware()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Integrated Softwareを特定できません"),
        ]),
      );
    }
  });

  it("objective evidenceがなければFAILする", () => {
    const verification = createVerification();
    const invalid = new VerificationResult(
      verification.id,
      verification.cycleId,
      verification.results!.map((result, index) =>
        index === 0 ? { ...result, evidence: [] } : result,
      ),
    );
    const result = new VerificationGate(
      [createSrs()],
      [createIntegratedSoftware()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("objective evidenceがありません"),
        ]),
      );
    }
  });

  it("FAILしたRequirementを検出し原因を要求する", () => {
    const verification = createVerification();
    const invalid = new VerificationResult(
      verification.id,
      verification.cycleId,
      verification.results!.map((result, index) =>
        index === 0 ? { ...result, passed: false, failureCause: null } : result,
      ),
    );
    const result = new VerificationGate(
      [createSrs()],
      [createIntegratedSoftware()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("fail原因がありません"),
          expect.stringContaining("VerificationがFAILしています"),
        ]),
      );
    }
  });
});
