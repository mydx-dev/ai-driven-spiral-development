import { describe, expect, it } from "vitest";
import { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";
import { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { ValidationResult } from "../artifact/ValidationResult.js";
import { VerificationResult } from "../artifact/VerificationResult.js";
import { ValidationGate } from "./ValidationGate.js";

const createStrs = () =>
  new StakeholderRequirementsSpecification(
    "strs-1",
    "cycle-1",
    ["customer"],
    "purpose",
    "scope",
    "business",
    "operation",
    [
      {
        id: "stakeholder-1",
        statement: "利用者が目的を達成できる",
        source: "customer",
      },
    ],
    [],
    ["利用シナリオ"],
    [],
  );

const createSyrs = () =>
  new SystemRequirementsSpecification(
    "syrs-1",
    "cycle-1",
    "purpose",
    "scope",
    "overview",
    [
      {
        id: "system-1",
        statement: "System Requirement",
        category: "functional",
        tracesTo: [
          {
            specificationId: "strs-1",
            requirementId: "stakeholder-1",
          },
        ],
      },
    ],
    [],
    [],
    [],
  );

const createSrs = () =>
  new SoftwareRequirementsSpecification(
    "srs-1",
    "cycle-1",
    "purpose",
    "scope",
    [
      {
        id: "software-1",
        statement: "Software Requirement",
        category: "functional",
        verificationCriteria: ["works"],
        tracesTo: [],
      },
    ],
    [],
  );

const createVerification = () =>
  new VerificationResult("verification-1", "cycle-1", []);

const createGate = () =>
  new ValidationGate(
    [createStrs()],
    [createSyrs()],
    [createSrs()],
    [createVerification()],
  );

const createValidation = (passed = true) =>
  new ValidationResult("validation-1", "cycle-1", [
    {
      id: "validation-result-1",
      stakeholderRequirement: {
        specificationId: "strs-1",
        requirementId: "stakeholder-1",
      },
      systemRequirements: [
        { specificationId: "syrs-1", requirementId: "system-1" },
      ],
      softwareRequirements: [
        { specificationId: "srs-1", requirementId: "software-1" },
      ],
      verificationResultIds: ["verification-1"],
      intendedUse: "実運用で利用者が業務を完了する",
      scenario: "利用者が主要業務を開始から完了まで実施する",
      method: "operational-evaluation",
      evidence: ["validation/session-1"],
      feedback: ["利用者ヒアリング結果"],
      passed,
      feedbackCandidates: passed
        ? []
        : [
            {
              id: "feedback-1",
              description: "次Cycleで操作手順を改善する",
              evidence: ["validation/session-1"],
            },
          ],
    },
  ]);

describe("ValidationGate", () => {
  it("intended useとStakeholder Requirementへの適合が記録されていればPASSする", () => {
    expect(createGate().verifyStructuralComplete([createValidation()])).toEqual({
      passed: true,
    });
  });

  it("StRS requirementsが未判断ならFAILする", () => {
    const strs = new StakeholderRequirementsSpecification(
      "strs-1",
      "cycle-1",
      null,
      null,
      null,
      null,
      null,
      undefined,
      null,
      null,
      null,
    );
    const result = new ValidationGate(
      [strs],
      [createSyrs()],
      [createSrs()],
      [createVerification()],
    ).verifyStructuralComplete([
      new ValidationResult("validation-1", "cycle-1", null),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Stakeholder Requirementsが未確定"),
        ]),
      );
    }
  });

  it("intended use / scenario / evidenceの欠落を検出する", () => {
    const validation = createValidation();
    const result = createGate().verifyStructuralComplete([
      new ValidationResult(validation.id, validation.cycleId, [
        {
          ...validation.results![0],
          intendedUse: "",
          scenario: "",
          evidence: [],
        },
      ]),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("intended useがありません"),
          expect.stringContaining("scenarioがありません"),
          expect.stringContaining("Validation evidenceがありません"),
        ]),
      );
    }
  });

  it("StRS / System / Software / Verificationへのtraceabilityを要求する", () => {
    const validation = createValidation();
    const result = createGate().verifyStructuralComplete([
      new ValidationResult(validation.id, validation.cycleId, [
        {
          ...validation.results![0],
          systemRequirements: undefined,
          softwareRequirements: undefined,
          verificationResultIds: undefined,
        },
      ]),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("System traceabilityが未確定"),
          expect.stringContaining("Software traceabilityが未確定"),
          expect.stringContaining("Verification traceabilityが未確定"),
        ]),
      );
    }
  });

  it("存在しないSystem / Software / Verification参照を検出する", () => {
    const validation = createValidation();
    const result = createGate().verifyStructuralComplete([
      new ValidationResult(validation.id, validation.cycleId, [
        {
          ...validation.results![0],
          systemRequirements: [
            { specificationId: "syrs-1", requirementId: "unknown-system" },
          ],
          softwareRequirements: [
            { specificationId: "srs-1", requirementId: "unknown-software" },
          ],
          verificationResultIds: ["does-not-exist"],
        },
      ]),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未知のSystem Requirement"),
          expect.stringContaining("未知のSoftware Requirement"),
          expect.stringContaining("未知のVerification Result"),
        ]),
      );
    }
  });

  it("Validation PASSでも不正なFeedback候補を検出する", () => {
    const validation = createValidation();
    const result = createGate().verifyStructuralComplete([
      new ValidationResult(validation.id, validation.cycleId, [
        {
          ...validation.results![0],
          feedbackCandidates: [
            { id: "", description: "invalid", evidence: ["evidence"] },
          ],
        },
      ]),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Feedback候補が不正です"),
        ]),
      );
    }
  });

  it("Validation FAILでもFeedback候補があればGateはPASSする", () => {
    expect(
      createGate().verifyStructuralComplete([createValidation(false)]),
    ).toEqual({ passed: true });
  });

  it("Validation FAILで次Cycle向けFeedback候補がなければFAILする", () => {
    const validation = createValidation(false);
    const result = createGate().verifyStructuralComplete([
      new ValidationResult(validation.id, validation.cycleId, [
        { ...validation.results![0], feedbackCandidates: [] },
      ]),
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("次Cycleへ引き継ぐFeedback候補がありません"),
        ]),
      );
    }
  });
});
