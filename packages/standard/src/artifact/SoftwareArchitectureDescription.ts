import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareArchitectureRequirementReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SoftwareArchitectureElement = {
  readonly id: string;
  readonly name: string;
  readonly responsibilities: string[];
};

export type SoftwareArchitectureRelationshipType =
  | "dependency"
  | "interaction"
  | "composition"
  | "other";

export type SoftwareArchitectureRelationship = {
  readonly sourceElementId: string;
  readonly targetElementId: string;
  readonly type: SoftwareArchitectureRelationshipType;
  readonly description: string;
};

export type SoftwareArchitectureInterface = {
  readonly id: string;
  readonly name: string;
  readonly providedByElementId: string;
  readonly consumedByElementIds: string[];
  readonly contract: string;
};

export type SoftwareArchitectureRequirementAllocation = {
  readonly requirement: SoftwareArchitectureRequirementReference;
  readonly elementIds: string[];
};

export type SoftwareArchitectureDecision = {
  readonly id: string;
  readonly statement: string;
  readonly tracesTo: SoftwareArchitectureRequirementReference[];
};

export class SoftwareArchitectureDescription implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly elements: SoftwareArchitectureElement[] | null | undefined,
    public readonly relationships:
      | SoftwareArchitectureRelationship[]
      | null
      | undefined,
    public readonly interfaces:
      | SoftwareArchitectureInterface[]
      | null
      | undefined,
    public readonly requirementAllocations:
      | SoftwareArchitectureRequirementAllocation[]
      | null
      | undefined,
    public readonly decisions: SoftwareArchitectureDecision[] | null | undefined,
  ) {}

  dependencyGraph(): ReadonlyMap<string, ReadonlySet<string>> {
    const graph = new Map<string, Set<string>>();

    for (const element of this.elements ?? []) {
      graph.set(element.id, new Set());
    }

    for (const relationship of this.relationships ?? []) {
      if (relationship.type !== "dependency") {
        continue;
      }

      graph.get(relationship.sourceElementId)?.add(
        relationship.targetElementId,
      );
    }

    return graph;
  }
}
