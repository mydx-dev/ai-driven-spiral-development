import { describe, expect, it } from "vitest";
import { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import { SoftwareDesign } from "../artifact/SoftwareDesign.js";
import { ImplementationGate } from "./ImplementationGate.js";

const createDesign = () =>
  new SoftwareDesign(
    "design-1",
    "cycle-1",
    [
      {
        id: "service-1",
        name: "Service",
        responsibilities: ["execute use case"],
        data: null,
        state: null,
        behavior: ["execute"],
      },
    ],
    [],
    [],
    [],
    [],
    [],
  );

const createImplementation = () =>
  new ImplementedSoftwareElements("implementation-1", "cycle-1", [
    {
      id: "implemented-service",
      designElement: { designId: "design-1", elementId: "service-1" },
      artifactReferences: ["src/service.ts"],
      checks: [
        { name: "build", passed: true, details: null },
        { name: "typecheck", passed: true, details: null },
        { name: "lint", passed: true, details: null },
        { name: "local test", passed: true, details: null },
      ],
      knownConstraints: [],
      unimplementedItems: [],
    },
  ]);

describe("ImplementationGate", () => {
  it("Software Design Elementの実装と機械的条件が揃えばPASSする", () => {
    expect(
      new ImplementationGate([createDesign()]).verifyStructuralComplete([
        createImplementation(),
      ]),
    ).toEqual({ passed: true });
  });

  it("Software Design Elementsが未判断ならFAILする", () => {
    const design = new SoftwareDesign(
      "design-1",
      "cycle-1",
      undefined,
      null,
      null,
      null,
      null,
      null,
    );
    const implementation = new ImplementedSoftwareElements(
      "implementation-1",
      "cycle-1",
      null,
    );
    const result = new ImplementationGate([design]).verifyStructuralComplete([
      implementation,
    ]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Software Elementsが未確定"),
        ]),
      );
    }
  });

  it("Software Design Elementsがnullなら実装対象nullでPASSできる", () => {
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
    const implementation = new ImplementedSoftwareElements(
      "implementation-1",
      "cycle-1",
      null,
    );

    expect(
      new ImplementationGate([design]).verifyStructuralComplete([
        implementation,
      ]),
    ).toEqual({ passed: true });
  });

  it("Software Design Elementの実装取りこぼしを検出する", () => {
    const implementation = new ImplementedSoftwareElements(
      "implementation-1",
      "cycle-1",
      [],
    );
    const result = new ImplementationGate([
      createDesign(),
    ]).verifyStructuralComplete([implementation]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Implementationへのtraceability"),
        ]),
      );
    }
  });

  it("未知のSoftware Design Element参照を検出する", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          designElement: { designId: "design-1", elementId: "missing" },
        },
      ],
    );
    const result = new ImplementationGate([
      createDesign(),
    ]).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未知のSoftware Design Element"),
        ]),
      );
    }
  });

  it("実装成果物への参照がなければFAILする", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          artifactReferences: [],
        },
      ],
    );
    const result = new ImplementationGate([
      createDesign(),
    ]).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("実装成果物への参照")]),
      );
    }
  });

  it("プロジェクト固有の機械的条件が失敗していればFAILする", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          checks: [{ name: "quality guard", passed: false, details: "failed" }],
        },
      ],
    );
    const result = new ImplementationGate([
      createDesign(),
    ]).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("quality guard")]),
      );
    }
  });

  it("機械的条件や既知制約の未判断を検出する", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          checks: undefined,
          knownConstraints: undefined,
          unimplementedItems: undefined,
        },
      ],
    );
    const result = new ImplementationGate([
      createDesign(),
    ]).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("機械的条件"),
          expect.stringContaining("既知の制約"),
          expect.stringContaining("未実装箇所"),
        ]),
      );
    }
  });

  it("未実装箇所が残っていればFAILする", () => {
    const implementation = createImplementation();
    const invalid = new ImplementedSoftwareElements(
      implementation.id,
      implementation.cycleId,
      [
        {
          ...implementation.elements![0],
          knownConstraints: ["legacy API constraint"],
          unimplementedItems: ["TODO"],
        },
      ],
    );
    const result = new ImplementationGate([
      createDesign(),
    ]).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未実装箇所が残っています"),
        ]),
      );
      expect(result.errors).not.toEqual(
        expect.arrayContaining([expect.stringContaining("既知の制約")]),
      );
    }
  });
});
