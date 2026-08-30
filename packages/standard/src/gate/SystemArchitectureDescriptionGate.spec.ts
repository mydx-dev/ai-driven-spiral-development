import { describe, expect, it } from "vitest";
import { SystemArchitectureDescription } from "../artifact/SystemArchitectureDescription.js";
import { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { SystemArchitectureDescriptionGate } from "./SystemArchitectureDescriptionGate.js";

const requirements = new SystemRequirementsSpecification(
  "syrs-1",
  "cycle-1",
  null,
  null,
  null,
  [
    {
      id: "sr-1",
      statement: "承認後に処理する",
      category: "functional",
      tracesTo: [],
    },
  ],
  null,
  null,
  null,
);

const createArchitecture = () =>
  new SystemArchitectureDescription(
    "system-architecture-1",
    "cycle-1",
    "対象System",
    [
      {
        id: "human-1",
        name: "Operator",
        type: "human",
        responsibilities: ["承認する"],
      },
      {
        id: "software-1",
        name: "Software",
        type: "software",
        responsibilities: ["処理する"],
      },
    ],
    [
      {
        sourceElementId: "software-1",
        targetElementId: "human-1",
        type: "interaction",
        description: "承認結果を利用する",
      },
    ],
    [
      {
        id: "approval-interface",
        name: "Approval",
        providedByElementId: "human-1",
        consumedByElementIds: ["software-1"],
        contract: "承認結果を通知する",
      },
    ],
    [
      {
        requirement: {
          specificationId: "syrs-1",
          requirementId: "sr-1",
        },
        elementIds: ["human-1", "software-1"],
      },
    ],
    [
      {
        id: "decision-1",
        statement: "承認責任をHumanへ割り当てる",
        tracesTo: [
          {
            specificationId: "syrs-1",
            requirementId: "sr-1",
          },
        ],
      },
    ],
  );

describe("SystemArchitectureDescriptionGate", () => {
  it("SyRSからSystem Elementsへのallocationを含むArchitecture Descriptionを受理する", () => {
    const gate = new SystemArchitectureDescriptionGate([requirements]);

    expect(gate.verifyStructuralComplete([createArchitecture()])).toEqual({
      passed: true,
    });
  });

  it("未知のSystem Elementへのallocationを拒否する", () => {
    const architecture = createArchitecture();
    const invalid = new SystemArchitectureDescription(
      architecture.id,
      architecture.cycleId,
      architecture.boundary,
      architecture.elements,
      architecture.relationships,
      architecture.interfaces,
      [
        {
          requirement: {
            specificationId: "syrs-1",
            requirementId: "sr-1",
          },
          elementIds: ["unknown"],
        },
      ],
      architecture.decisions,
    );
    const gate = new SystemArchitectureDescriptionGate([requirements]);

    expect(gate.verifyStructuralComplete([invalid])).toMatchObject({
      passed: false,
    });
  });
});
