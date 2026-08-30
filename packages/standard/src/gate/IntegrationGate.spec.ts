import { describe, expect, it } from "vitest";
import { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import { IntegratedSoftware } from "../artifact/IntegratedSoftware.js";
import { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import { SoftwareElementDesign } from "../artifact/SoftwareElementDesign.js";
import { IntegrationGate } from "./IntegrationGate.js";

const createArchitecture = () =>
  new SoftwareArchitectureDescription(
    "architecture-1",
    "cycle-1",
    [
      { id: "service", name: "Service", responsibilities: ["execute"] },
      {
        id: "repository",
        name: "Repository",
        responsibilities: ["persist"],
      },
    ],
    [
      {
        sourceElementId: "service",
        targetElementId: "repository",
        type: "dependency",
        description: "Service depends on Repository",
      },
    ],
    [
      {
        id: "repository-interface",
        name: "RepositoryPort",
        providedByElementId: "repository",
        consumedByElementIds: ["service"],
        contract: "save data",
      },
    ],
    [],
    [],
  );

const createDesigns = () => [
  new SoftwareElementDesign(
    "service-design",
    "cycle-1",
    { architectureId: "architecture-1", elementId: "service" },
    null,
    null,
    ["execute"],
    ["repository-interface"],
    [],
    [],
  ),
  new SoftwareElementDesign(
    "repository-design",
    "cycle-1",
    { architectureId: "architecture-1", elementId: "repository" },
    ["entity"],
    null,
    ["save"],
    ["repository-interface"],
    [],
    [],
  ),
];

const createImplementation = () =>
  new ImplementedSoftwareElements("implementation-1", "cycle-1", [
    {
      id: "implemented-service",
      elementDesign: { designId: "service-design" },
      artifactReferences: ["src/service.ts"],
      checks: [],
      knownConstraints: [],
      unimplementedItems: [],
    },
    {
      id: "implemented-repository",
      elementDesign: { designId: "repository-design" },
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
        architectureId: "architecture-1",
        sourceElementId: "service",
        targetElementId: "repository",
        type: "dependency",
        evidence: ["integration/service-repository.spec.ts"],
      },
    ],
    [
      {
        architectureId: "architecture-1",
        interfaceId: "repository-interface",
        evidence: ["integration/repository-interface.spec.ts"],
      },
    ],
    ["dist/software.js"],
    ["integration suite passed"],
    [],
  );

describe("IntegrationGate", () => {
  it("Architecture上のrelationshipとinterfaceに従って統合されていればPASSする", () => {
    expect(
      new IntegrationGate(
        [createArchitecture()],
        createDesigns(),
        [createImplementation()],
      ).verifyStructuralComplete([createIntegration()]),
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
      [createArchitecture()],
      createDesigns(),
      [createImplementation()],
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

  it("Architecture上のrelationship統合取りこぼしを検出する", () => {
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
      [createArchitecture()],
      createDesigns(),
      [createImplementation()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("relationshipが統合")]),
      );
    }
  });

  it("Architecture上のinterface統合取りこぼしを検出する", () => {
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
      [createArchitecture()],
      createDesigns(),
      [createImplementation()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("interfaceが統合")]),
      );
    }
  });

  it("QA対象となる統合Software成果物がなければFAILする", () => {
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
      [createArchitecture()],
      createDesigns(),
      [createImplementation()],
    ).verifyStructuralComplete([invalid]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("QA対象となる統合Software成果物"),
        ]),
      );
    }
  });
});
