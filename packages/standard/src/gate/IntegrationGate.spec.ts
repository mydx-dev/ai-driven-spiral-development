import { describe, expect, it } from "vitest";
import { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import { IntegratedSoftware } from "../artifact/IntegratedSoftware.js";
import { SoftwareDesign } from "../artifact/SoftwareDesign.js";
import { IntegrationGate } from "./IntegrationGate.js";

const createDesign = () =>
  new SoftwareDesign(
    "design-1",
    "cycle-1",
    [
      {
        id: "service-1",
        name: "Service",
        responsibilities: ["execute"],
        data: null,
        state: null,
        behavior: ["execute"],
      },
      {
        id: "repository-1",
        name: "Repository",
        responsibilities: ["persist"],
        data: null,
        state: null,
        behavior: ["save"],
      },
    ],
    [
      {
        sourceElementId: "service-1",
        targetElementId: "repository-1",
        type: "dependency",
        description: "Service depends on Repository",
      },
    ],
    [
      {
        id: "repository-interface",
        name: "RepositoryPort",
        providedByElementId: "repository-1",
        consumedByElementIds: ["service-1"],
        contract: "save data",
      },
    ],
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
      checks: [],
      knownConstraints: [],
      unimplementedItems: [],
    },
    {
      id: "implemented-repository",
      designElement: { designId: "design-1", elementId: "repository-1" },
      artifactReferences: ["src/repository.ts"],
      checks: [],
      knownConstraints: [],
      unimplementedItems: [],
    },
  ]);

const createIntegration = () =>
  new IntegratedSoftware(
    "integration-1",
    "cycle-1",
    [
      {
        implementationId: "implementation-1",
        elementId: "implemented-service",
      },
      {
        implementationId: "implementation-1",
        elementId: "implemented-repository",
      },
    ],
    [
      {
        designId: "design-1",
        sourceElementId: "service-1",
        targetElementId: "repository-1",
        type: "dependency",
        evidence: ["integration/service-repository.spec.ts"],
      },
    ],
    [
      {
        designId: "design-1",
        interfaceId: "repository-interface",
        evidence: ["integration/repository-interface.spec.ts"],
      },
    ],
    ["dist/software.js"],
    ["integration suite passed"],
    [],
  );

describe("IntegrationGate", () => {
  it("必要なElement・relationship・interfaceが統合されていればPASSする", () => {
    expect(
      new IntegrationGate(
        [createImplementation()],
        [createDesign()],
      ).verifyStructuralComplete([createIntegration()]),
    ).toEqual({ passed: true });
  });

  it("Implemented Software Elementsが未判断ならFAILする", () => {
    const implementation = new ImplementedSoftwareElements(
      "implementation-1",
      "cycle-1",
      undefined,
    );
    const integration = new IntegratedSoftware(
      "integration-1",
      "cycle-1",
      null,
      null,
      null,
      null,
      null,
      null,
    );
    const result = new IntegrationGate(
      [implementation],
      [createDesign()],
    ).verifyStructuralComplete([integration]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Implemented Software Elementsが未確定"),
        ]),
      );
    }
  });

  it("Implemented Software Elementsがnullなら統合対象nullでPASSできる", () => {
    const implementation = new ImplementedSoftwareElements(
      "implementation-1",
      "cycle-1",
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
    const integration = new IntegratedSoftware(
      "integration-1",
      "cycle-1",
      null,
      null,
      null,
      null,
      null,
      null,
    );

    expect(
      new IntegrationGate([implementation], [design]).verifyStructuralComplete([
        integration,
      ]),
    ).toEqual({ passed: true });
  });

  it("Implemented Software Elementの統合取りこぼしを検出する", () => {
    const integration = createIntegration();
    const invalid = new IntegratedSoftware(
      integration.id,
      integration.cycleId,
      [integration.elements![0]],
      integration.relationships,
      integration.interfaces,
      integration.artifactReferences,
      integration.evidence,
      integration.unresolvedItems,
    );
    const result = new IntegrationGate(
      [createImplementation()],
      [createDesign()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Integrated Softwareへのtraceability"),
        ]),
      );
    }
  });

  it("Design上のrelationship統合取りこぼしを検出する", () => {
    const integration = createIntegration();
    const invalid = new IntegratedSoftware(
      integration.id,
      integration.cycleId,
      integration.elements,
      [],
      integration.interfaces,
      integration.artifactReferences,
      integration.evidence,
      integration.unresolvedItems,
    );
    const result = new IntegrationGate(
      [createImplementation()],
      [createDesign()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("relationshipが統合")]),
      );
    }
  });

  it("Design上のinterface統合取りこぼしを検出する", () => {
    const integration = createIntegration();
    const invalid = new IntegratedSoftware(
      integration.id,
      integration.cycleId,
      integration.elements,
      integration.relationships,
      [],
      integration.artifactReferences,
      integration.evidence,
      integration.unresolvedItems,
    );
    const result = new IntegrationGate(
      [createImplementation()],
      [createDesign()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("interfaceが統合")]),
      );
    }
  });

  it("Verification対象となる統合Software成果物がなければFAILする", () => {
    const integration = createIntegration();
    const invalid = new IntegratedSoftware(
      integration.id,
      integration.cycleId,
      integration.elements,
      integration.relationships,
      integration.interfaces,
      [],
      integration.evidence,
      integration.unresolvedItems,
    );
    const result = new IntegrationGate(
      [createImplementation()],
      [createDesign()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Verification対象となる統合Software成果物"),
        ]),
      );
    }
  });

  it("integration上の未解決事項が残っていればFAILする", () => {
    const integration = createIntegration();
    const invalid = new IntegratedSoftware(
      integration.id,
      integration.cycleId,
      integration.elements,
      integration.relationships,
      integration.interfaces,
      integration.artifactReferences,
      integration.evidence,
      ["interface failure"],
    );
    const result = new IntegrationGate(
      [createImplementation()],
      [createDesign()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("未解決事項が残っています"),
        ]),
      );
    }
  });
});
