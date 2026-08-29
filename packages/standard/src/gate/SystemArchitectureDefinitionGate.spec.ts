import { describe, expect, it } from "vitest";
import { RequirementAllocation } from "../artifact/RequirementAllocation.js";
import { SystemArchitecture } from "../artifact/SystemArchitecture.js";
import { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { SystemArchitectureDefinitionGate } from "./SystemArchitectureDefinitionGate.js";

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
        statement: "requirement 1",
        category: "functional",
        tracesTo: [],
      },
      {
        id: "sr-2",
        statement: "requirement 2",
        category: "functional",
        tracesTo: [],
      },
    ],
    [],
    [],
    [],
  );

const createArchitecture = () =>
  new SystemArchitecture(
    "architecture-1",
    "cycle-1",
    "system boundary",
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
    [
      {
        id: "decision-1",
        statement: "Automate the operation",
        tracesTo: [{ specificationId: "syrs-1", requirementId: "sr-1" }],
      },
    ],
  );

const createAllocation = () =>
  new RequirementAllocation("allocation-1", "cycle-1", [
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
  ]);

describe("SystemArchitectureDefinitionGate", () => {
  const gate = new SystemArchitectureDefinitionGate([createSyRS()]);

  it("ArchitectureとAllocationが完全ならPASSする", () => {
    expect(
      gate.verifyStructuralComplete([createArchitecture(), createAllocation()]),
    ).toEqual({ passed: true });
  });

  it("未判断の項目があればFAILする", () => {
    const architecture = new SystemArchitecture(
      "architecture-1",
      "cycle-1",
      undefined,
      undefined,
      undefined,
    );
    const allocation = new RequirementAllocation(
      "allocation-1",
      "cycle-1",
      undefined,
    );

    const result = gate.verifyStructuralComplete([architecture, allocation]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("System boundary"),
          expect.stringContaining("System Elements"),
          expect.stringContaining("Requirement allocation"),
        ]),
      );
    }
  });

  it("allocation対象のSyRS deltaがなければnullでPASSできる", () => {
    const architecture = new SystemArchitecture(
      "architecture-1",
      "cycle-1",
      null,
      null,
      null,
    );
    const allocation = new RequirementAllocation(
      "allocation-1",
      "cycle-1",
      null,
    );
    const noDeltaGate = new SystemArchitectureDefinitionGate([]);

    expect(
      noDeltaGate.verifyStructuralComplete([architecture, allocation]),
    ).toEqual({ passed: true });
  });

  it("allocation対象のSyRS deltaがある場合はnullをFAILにする", () => {
    const architecture = new SystemArchitecture(
      "architecture-1",
      "cycle-1",
      null,
      null,
      null,
    );
    const allocation = new RequirementAllocation(
      "allocation-1",
      "cycle-1",
      null,
    );

    const result = gate.verifyStructuralComplete([architecture, allocation]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("allocation対象のSyRS Requirement"),
        ]),
      );
    }
  });

  it("実SyRSに存在するRequirementのallocation漏れを検出する", () => {
    const allocation = createAllocation();
    const incomplete = new RequirementAllocation(
      allocation.id,
      allocation.cycleId,
      allocation.allocations?.slice(0, 1),
    );

    const result = gate.verifyStructuralComplete([
      createArchitecture(),
      incomplete,
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("syrs-1:sr-2"),
          expect.stringContaining("allocation漏れ"),
        ]),
      );
    }
  });

  it("同一SyRS Requirementの重複allocationを検出する", () => {
    const allocation = createAllocation();
    const duplicated = new RequirementAllocation(
      allocation.id,
      allocation.cycleId,
      [allocation.allocations![0], allocation.allocations![0]],
    );

    const result = gate.verifyStructuralComplete([
      createArchitecture(),
      duplicated,
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("重複または矛盾")]),
      );
    }
  });

  it("存在しないSystem Elementへのallocationを検出する", () => {
    const allocation = createAllocation();
    const invalid = new RequirementAllocation(
      allocation.id,
      allocation.cycleId,
      [
        {
          requirement: allocation.allocations![0].requirement,
          elementIds: ["missing-element"],
        },
        allocation.allocations![1],
      ],
    );

    const result = gate.verifyStructuralComplete([
      createArchitecture(),
      invalid,
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("存在しない")]),
      );
    }
  });

  it("architecture decisionのSyRS traceability不備を検出する", () => {
    const architecture = createArchitecture();
    const invalid = new SystemArchitecture(
      architecture.id,
      architecture.cycleId,
      architecture.boundary,
      architecture.elements,
      [
        {
          id: "decision-1",
          statement: "decision",
          tracesTo: [{ specificationId: "syrs-1", requirementId: "unknown" }],
        },
      ],
    );

    const result = gate.verifyStructuralComplete([invalid, createAllocation()]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("未知のSyRS")]),
      );
    }
  });
});
