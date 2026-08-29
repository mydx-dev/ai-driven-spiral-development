import { describe, expect, it } from "vitest";
import { SoftwareDesign } from "../artifact/SoftwareDesign.js";
import { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import { SoftwareDesignGate } from "./SoftwareDesignGate.js";

const createSRS = () =>
  new SoftwareRequirementsSpecification(
    "srs-1",
    "cycle-1",
    "purpose",
    "scope",
    [
      {
        id: "swr-1",
        statement: "software shall execute the use case",
        category: "functional",
        verificationCriteria: ["result is observable"],
        tracesTo: [
          {
            allocationId: "allocation-1",
            systemRequirementSpecificationId: "syrs-1",
            systemRequirementId: "sr-1",
            softwareElementId: "software-1",
          },
        ],
      },
    ],
    [],
  );

const createDesign = () =>
  new SoftwareDesign(
    "design-1",
    "cycle-1",
    [
      {
        id: "service-1",
        name: "Application Service",
        responsibilities: ["execute use case"],
        data: ["command"],
        state: null,
        behavior: ["validate and execute"],
      },
      {
        id: "repository-1",
        name: "Repository",
        responsibilities: ["persist aggregate"],
        data: ["aggregate"],
        state: null,
        behavior: ["save and find"],
      },
    ],
    [
      {
        sourceElementId: "service-1",
        targetElementId: "repository-1",
        type: "dependency",
        description: "Application Service depends on Repository",
      },
    ],
    [
      {
        id: "repository-port",
        name: "Repository Port",
        providedByElementId: "repository-1",
        consumedByElementIds: ["service-1"],
        contract: "save and find aggregate",
      },
    ],
    [
      {
        requirement: {
          specificationId: "srs-1",
          requirementId: "swr-1",
        },
        elementIds: ["service-1", "repository-1"],
      },
    ],
    [
      {
        id: "rationale-1",
        decision: "separate persistence responsibility",
        reason: "keep application behavior independent from storage",
      },
    ],
    [],
  );

const createGate = () => new SoftwareDesignGate([createSRS()]);

describe("SoftwareDesignGate", () => {
  it("SRS RequirementをSoftware Elementsへ割り当てられればPASSする", () => {
    expect(createGate().verifyStructuralComplete([createDesign()])).toEqual({
      passed: true,
    });
  });

  it("未判断の設計項目があればFAILする", () => {
    const design = new SoftwareDesign(
      "design-1",
      "cycle-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const result = createGate().verifyStructuralComplete([design]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Software Elements"),
          expect.stringContaining("relationship / dependency"),
          expect.stringContaining("interface"),
          expect.stringContaining("SRS Requirement allocation"),
          expect.stringContaining("design rationale"),
          expect.stringContaining("unresolved design decisions"),
        ]),
      );
    }
  });

  it("SRS Requirementがなければ設計対象をnullと判断できる", () => {
    const srs = new SoftwareRequirementsSpecification(
      "srs-1",
      "cycle-1",
      null,
      null,
      null,
      null,
    );
    const design = new SoftwareDesign(
      "design-1",
      "cycle-1",
      null,
      null,
      null,
      null,
      null,
      null,
    );

    expect(new SoftwareDesignGate([srs]).verifyStructuralComplete([design])).toEqual(
      { passed: true },
    );
  });

  it("Software Elementの責務境界がなければFAILする", () => {
    const design = createDesign();
    const invalid = new SoftwareDesign(
      design.id,
      design.cycleId,
      [
        {
          ...design.elements![0],
          responsibilities: [],
        },
        design.elements![1],
      ],
      design.relationships,
      design.interfaces,
      design.requirementAllocations,
      design.rationales,
      design.unresolvedDecisions,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("責務境界")]),
      );
    }
  });

  it("data / state / behaviorの未判断を検出する", () => {
    const design = createDesign();
    const invalid = new SoftwareDesign(
      design.id,
      design.cycleId,
      [
        {
          ...design.elements![0],
          data: undefined,
          state: undefined,
          behavior: undefined,
        },
        design.elements![1],
      ],
      design.relationships,
      design.interfaces,
      design.requirementAllocations,
      design.rationales,
      design.unresolvedDecisions,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("data設計"),
          expect.stringContaining("state設計"),
          expect.stringContaining("behavior設計"),
        ]),
      );
    }
  });

  it("未知のElementを使うrelationship / interfaceを検出する", () => {
    const design = createDesign();
    const invalid = new SoftwareDesign(
      design.id,
      design.cycleId,
      design.elements,
      [
        {
          sourceElementId: "service-1",
          targetElementId: "missing",
          type: "dependency",
          description: "invalid dependency",
        },
      ],
      [
        {
          id: "invalid-interface",
          name: "Invalid",
          providedByElementId: "missing",
          consumedByElementIds: ["service-1"],
          contract: "contract",
        },
      ],
      design.requirementAllocations,
      design.rationales,
      design.unresolvedDecisions,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未知のSoftware Element間relationship"),
          expect.stringContaining("interface提供Element"),
        ]),
      );
    }
  });

  it("Software Requirementの設計取りこぼしを検出する", () => {
    const design = createDesign();
    const invalid = new SoftwareDesign(
      design.id,
      design.cycleId,
      design.elements,
      design.relationships,
      design.interfaces,
      [],
      design.rationales,
      design.unresolvedDecisions,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Software Designへのtraceability"),
        ]),
      );
    }
  });

  it("未知のSRS RequirementやSoftware Elementへのallocationを検出する", () => {
    const design = createDesign();
    const invalid = new SoftwareDesign(
      design.id,
      design.cycleId,
      design.elements,
      design.relationships,
      design.interfaces,
      [
        {
          requirement: {
            specificationId: "srs-1",
            requirementId: "missing",
          },
          elementIds: ["missing"],
        },
      ],
      design.rationales,
      design.unresolvedDecisions,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未知のSRS Requirement"),
          expect.stringContaining("Element allocation"),
        ]),
      );
    }
  });
});
