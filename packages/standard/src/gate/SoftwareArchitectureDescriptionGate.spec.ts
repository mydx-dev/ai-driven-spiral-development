import { describe, expect, it } from "vitest";
import { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import { SoftwareArchitectureDescriptionGate } from "./SoftwareArchitectureDescriptionGate.js";

const requirements = new SoftwareRequirementsSpecification(
  "srs-1",
  "cycle-1",
  null,
  null,
  [
    {
      id: "swr-1",
      statement: "注文を保存する",
      category: "functional",
      verificationCriteria: ["保存結果を確認できる"],
      tracesTo: [],
    },
  ],
  null,
);

const createArchitecture = () =>
  new SoftwareArchitectureDescription(
    "software-architecture-1",
    "cycle-1",
    [
      {
        id: "application",
        name: "Application",
        responsibilities: ["注文処理"],
      },
      {
        id: "repository",
        name: "Repository",
        responsibilities: ["注文永続化"],
      },
    ],
    [
      {
        sourceElementId: "application",
        targetElementId: "repository",
        type: "dependency",
        description: "ApplicationはRepositoryへ依存する",
      },
    ],
    [
      {
        id: "repository-interface",
        name: "OrderRepository",
        providedByElementId: "repository",
        consumedByElementIds: ["application"],
        contract: "注文を保存する",
      },
    ],
    [
      {
        requirement: {
          specificationId: "srs-1",
          requirementId: "swr-1",
        },
        elementIds: ["application", "repository"],
      },
    ],
    [
      {
        id: "decision-1",
        statement: "永続化責任をRepositoryへ分離する",
        tracesTo: [
          {
            specificationId: "srs-1",
            requirementId: "swr-1",
          },
        ],
      },
    ],
  );

describe("SoftwareArchitectureDescriptionGate", () => {
  it("SRSからSoftware Elementsへのallocationを含むArchitecture Descriptionを受理する", () => {
    const gate = new SoftwareArchitectureDescriptionGate([requirements]);

    expect(gate.verifyStructuralComplete([createArchitecture()])).toEqual({
      passed: true,
    });
  });

  it("dependency relationshipからdependency graphを取得できる", () => {
    expect(createArchitecture().dependencyGraph()).toEqual(
      new Map([
        ["application", new Set(["repository"])],
        ["repository", new Set()],
      ]),
    );
  });

  it("未知のSoftware Elementを参照するrelationshipを拒否する", () => {
    const architecture = createArchitecture();
    const invalid = new SoftwareArchitectureDescription(
      architecture.id,
      architecture.cycleId,
      architecture.elements,
      [
        {
          sourceElementId: "application",
          targetElementId: "unknown",
          type: "dependency",
          description: "invalid dependency",
        },
      ],
      architecture.interfaces,
      architecture.requirementAllocations,
      architecture.decisions,
    );
    const gate = new SoftwareArchitectureDescriptionGate([requirements]);

    expect(gate.verifyStructuralComplete([invalid])).toMatchObject({
      passed: false,
    });
  });
});
