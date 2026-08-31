import { describe, expect, it } from "vitest";
import { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import { SystemArchitectureDescription } from "../artifact/SystemArchitectureDescription.js";
import { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { SoftwareRequirementsDefinitionGate } from "./SoftwareRequirementsDefinitionGate.js";

const createArchitecture = () =>
  new SystemArchitectureDescription(
    "architecture-1",
    "cycle-1",
    "boundary",
    [
      {
        id: "software-1",
        name: "Software",
        type: "software",
        responsibilities: ["automation"],
      },
      {
        id: "human-1",
        name: "Human",
        type: "human",
        responsibilities: ["approval"],
      },
    ],
    [],
    [],
    [
      {
        requirement: {
          specificationId: "syrs-1",
          requirementId: "sr-1",
        },
        elementIds: ["software-1"],
      },
      {
        requirement: {
          specificationId: "syrs-1",
          requirementId: "sr-2",
        },
        elementIds: ["human-1"],
      },
    ],
    [],
  );

const createSyRS = () =>
  new SystemRequirementsSpecification(
    "syrs-1",
    "cycle-1",
    "purpose",
    "scope",
    "overview",
    [
      {
        id: "sr-1",
        statement: "system requirement 1",
        category: "functional",
        tracesTo: [
          { specificationId: "strs-1", requirementId: "stakeholder-1" },
        ],
      },
      {
        id: "sr-2",
        statement: "system requirement 2",
        category: "functional",
        tracesTo: [
          { specificationId: "strs-1", requirementId: "stakeholder-2" },
        ],
      },
    ],
    [],
    [],
    [],
  );

const createSRS = () =>
  new SoftwareRequirementsSpecification(
    "srs-1",
    "cycle-1",
    "software purpose",
    "software scope",
    [
      {
        id: "swr-1",
        statement: "software shall automate the operation",
        category: "functional",
        verificationCriteria: ["automation result is observable"],
        tracesTo: [
          {
            architectureId: "architecture-1",
            systemRequirementSpecificationId: "syrs-1",
            systemRequirementId: "sr-1",
            softwareElementId: "software-1",
          },
        ],
      },
    ],
    [],
  );

const createGate = () =>
  new SoftwareRequirementsDefinitionGate(
    [createArchitecture()],
    [createSyRS()],
  );

describe("SoftwareRequirementsDefinitionGate", () => {
  it("System Architecture上のSoftware allocationをSRSへ追跡できればPASSする", () => {
    expect(createGate().verifyStructuralComplete([createSRS()])).toEqual({
      passed: true,
    });
  });

  it("未判断の項目があればFAILする", () => {
    const specification = new SoftwareRequirementsSpecification(
      "srs-1",
      "cycle-1",
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const result = createGate().verifyStructuralComplete([specification]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Software purpose"),
          expect.stringContaining("Software scope"),
          expect.stringContaining("Software Requirements"),
          expect.stringContaining("unresolved items"),
        ]),
      );
    }
  });

  it("Software allocationがなければnullでPASSできる", () => {
    const specification = new SoftwareRequirementsSpecification(
      "srs-1",
      "cycle-1",
      null,
      null,
      null,
      null,
    );
    const architecture = new SystemArchitectureDescription(
      "architecture-1",
      "cycle-1",
      "boundary",
      [
        {
          id: "human-1",
          name: "Human",
          type: "human",
          responsibilities: ["approval"],
        },
      ],
      [],
      [],
      [],
      [],
    );
    const gate = new SoftwareRequirementsDefinitionGate(
      [architecture],
      [createSyRS()],
    );

    expect(gate.verifyStructuralComplete([specification])).toEqual({
      passed: true,
    });
  });

  it("Software allocationがある場合はnull requirementsをFAILにする", () => {
    const specification = new SoftwareRequirementsSpecification(
      "srs-1",
      "cycle-1",
      null,
      null,
      null,
      null,
    );

    const result = createGate().verifyStructuralComplete([specification]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("SRS化対象")]),
      );
    }
  });

  it("Software allocationのSRS取りこぼしを検出する", () => {
    const specification = createSRS();
    const missing = new SoftwareRequirementsSpecification(
      specification.id,
      specification.cycleId,
      specification.purpose,
      specification.scope,
      [
        {
          ...specification.requirements![0],
          tracesTo: [],
        },
      ],
      specification.unresolvedItems,
    );

    const result = createGate().verifyStructuralComplete([missing]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "System Architecture allocationへのtraceability",
          ),
          expect.stringContaining("SRSへのtraceability"),
        ]),
      );
    }
  });

  it("Software以外のallocation参照を未知のallocationとして検出する", () => {
    const specification = createSRS();
    const invalid = new SoftwareRequirementsSpecification(
      specification.id,
      specification.cycleId,
      specification.purpose,
      specification.scope,
      [
        {
          ...specification.requirements![0],
          tracesTo: [
            {
              architectureId: "architecture-1",
              systemRequirementSpecificationId: "syrs-1",
              systemRequirementId: "sr-2",
              softwareElementId: "human-1",
            },
          ],
        },
      ],
      specification.unresolvedItems,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未知のSoftware allocation"),
        ]),
      );
    }
  });

  it("Verification CriteriaがなければFAILする", () => {
    const specification = createSRS();
    const invalid = new SoftwareRequirementsSpecification(
      specification.id,
      specification.cycleId,
      specification.purpose,
      specification.scope,
      [
        {
          ...specification.requirements![0],
          verificationCriteria: [],
        },
      ],
      specification.unresolvedItems,
    );

    const result = createGate().verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Verification Criteria"),
        ]),
      );
    }
  });

  it("StRSとの接続はSyRS Gateの責務としてSRS Gateでは検証しない", () => {
    const syRS = createSyRS();
    const withoutStakeholderTrace = new SystemRequirementsSpecification(
      syRS.id,
      syRS.cycleId,
      syRS.purpose,
      syRS.scope,
      syRS.overview,
      [
        {
          ...syRS.requirements![0],
          tracesTo: [],
        },
        syRS.requirements![1],
      ],
      syRS.assumptions,
      syRS.dependencies,
      syRS.unresolvedItems,
    );
    const gate = new SoftwareRequirementsDefinitionGate(
      [createArchitecture()],
      [withoutStakeholderTrace],
    );

    expect(gate.verifyStructuralComplete([createSRS()])).toEqual({
      passed: true,
    });
  });
});
