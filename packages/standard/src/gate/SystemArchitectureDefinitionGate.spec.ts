import { describe, expect, it } from "vitest";
import { RequirementAllocation } from "../artifact/RequirementAllocation.js";
import { SystemArchitecture } from "../artifact/SystemArchitecture.js";
import { SystemArchitectureDefinitionGate } from "./SystemArchitectureDefinitionGate.js";

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
  new RequirementAllocation(
    "allocation-1",
    "cycle-1",
    [
      { specificationId: "syrs-1", requirementId: "sr-1" },
      { specificationId: "syrs-1", requirementId: "sr-2" },
    ],
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
  );

describe("SystemArchitectureDefinitionGate", () => {
  const gate = new SystemArchitectureDefinitionGate();

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
      undefined,
    );

    const result = gate.verifyStructuralComplete([architecture, allocation]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("System boundary"),
          expect.stringContaining("System Elements"),
          expect.stringContaining("SyRS Requirements"),
          expect.stringContaining("Requirement allocation"),
        ]),
      );
    }
  });

  it("当該Cycleで対象外と判断したnullはPASSできる", () => {
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
      null,
    );

    expect(gate.verifyStructuralComplete([architecture, allocation])).toEqual({
      passed: true,
    });
  });

  it("SyRS Requirementのallocation漏れを検出する", () => {
    const allocation = createAllocation();
    const incomplete = new RequirementAllocation(
      allocation.id,
      allocation.cycleId,
      allocation.sourceRequirements,
      allocation.allocations?.slice(0, 1),
    );

    const result = gate.verifyStructuralComplete([
      createArchitecture(),
      incomplete,
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("allocation漏れ")]),
      );
    }
  });

  it("同一SyRS Requirementの重複allocationを検出する", () => {
    const allocation = createAllocation();
    const duplicated = new RequirementAllocation(
      allocation.id,
      allocation.cycleId,
      allocation.sourceRequirements,
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
      allocation.sourceRequirements,
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
