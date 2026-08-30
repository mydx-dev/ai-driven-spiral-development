import { describe, expect, it } from "vitest";
import { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import { SoftwareElementDesign } from "../artifact/SoftwareElementDesign.js";
import { ImplementationGate } from "./ImplementationGate.js";

const createArchitecture = () =>
  new SoftwareArchitectureDescription(
    "architecture-1",
    "cycle-1",
    [
      {
        id: "application",
        name: "Application",
        responsibilities: ["execute use case"],
      },
      {
        id: "repository",
        name: "Repository",
        responsibilities: ["persist data"],
      },
    ],
    [
      {
        sourceElementId: "application",
        targetElementId: "repository",
        type: "dependency",
        description: "Application depends on Repository",
      },
    ],
    [
      {
        id: "repository-interface",
        name: "RepositoryPort",
        providedByElementId: "repository",
        consumedByElementIds: ["application"],
        contract: "save data",
      },
    ],
    [],
    [],
  );

const createDesigns = () => [
  new SoftwareElementDesign(
    "application-design",
    "cycle-1",
    { architectureId: "architecture-1", elementId: "application" },
    null,
    null,
    ["call RepositoryPort"],
    ["repository-interface"],
    [],
    [],
  ),
  new SoftwareElementDesign(
    "repository-design",
    "cycle-1",
    { architectureId: "architecture-1", elementId: "repository" },
    ["Order"],
    null,
    ["save Order"],
    ["repository-interface"],
    [],
    [],
  ),
];

const createImplementation = () =>
  new ImplementedSoftwareElements("implementation-1", "cycle-1", [
    {
      id: "implemented-application",
      elementDesign: { designId: "application-design" },
      artifactReferences: ["src/application.ts"],
      checks: [{ name: "local test", passed: true, details: null }],
      knownConstraints: [],
      unimplementedItems: [],
    },
    {
      id: "implemented-repository",
      elementDesign: { designId: "repository-design" },
      artifactReferences: ["src/repository.ts"],
      checks: [{ name: "typecheck", passed: true, details: null }],
      knownConstraints: [],
      unimplementedItems: [],
    },
  ]);

describe("ImplementationGate", () => {
  it("全Software ElementのDesignとImplementationが揃えばPASSする", () => {
    expect(
      new ImplementationGate(
        [createArchitecture()],
        createDesigns(),
      ).verifyStructuralComplete([createImplementation()]),
    ).toEqual({ passed: true });
  });

  it("Architecture上のSoftware ElementにDesignがなければFAILする", () => {
    const result = new ImplementationGate(
      [createArchitecture()],
      [createDesigns()[0]],
    ).verifyStructuralComplete([createImplementation()]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Software Element Designがありません"),
        ]),
      );
    }
  });

  it("未解決Design Decisionが残っていればImplementation可能とみなさない", () => {
    const designs = createDesigns();
    const invalid = new SoftwareElementDesign(
      designs[0].id,
      designs[0].cycleId,
      designs[0].architectureElement,
      designs[0].data,
      designs[0].state,
      designs[0].behavior,
      designs[0].interfaceIds,
      designs[0].rationales,
      [{ id: "decision-1", description: "storage strategy" }],
    );
    const result = new ImplementationGate(
      [createArchitecture()],
      [invalid, designs[1]],
    ).verifyStructuralComplete([createImplementation()]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未解決Design Decisionが残っています"),
        ]),
      );
    }
  });

  it("ImplementationがSoftware Element Designを参照しなければFAILする", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          elementDesign: { designId: "missing-design" },
        },
        implementation.elements![1],
      ],
    );
    const result = new ImplementationGate(
      [createArchitecture()],
      createDesigns(),
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未知のSoftware Element Design"),
        ]),
      );
    }
  });

  it("project-defined Quality Guard結果を注入して失敗をGateへ反映できる", () => {
    const result = new ImplementationGate(
      [createArchitecture()],
      createDesigns(),
      [
        {
          designId: "application-design",
          name: "complexity",
          passed: false,
          details: "threshold exceeded",
        },
      ],
    ).verifyStructuralComplete([createImplementation()]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("project-defined Quality Guardが成功していません"),
        ]),
      );
    }
  });

  it("未実装箇所が残っていればFAILするがSRS適合性は判定しない", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          unimplementedItems: ["TODO"],
        },
        implementation.elements![1],
      ],
    );
    const result = new ImplementationGate(
      [createArchitecture()],
      createDesigns(),
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未実装箇所が残っています"),
        ]),
      );
      expect(result.errors.join("\n")).not.toContain("SRS");
    }
  });
});
