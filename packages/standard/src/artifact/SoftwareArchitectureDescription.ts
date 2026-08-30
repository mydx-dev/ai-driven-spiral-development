import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareRequirementReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SoftwareElement = {
  readonly id: string;
  readonly name: string;
  readonly responsibilities: string[];
};

export type SoftwareElementRelationshipType =
  | "dependency"
  | "interaction"
  | "composition"
  | "other";

export type SoftwareElementRelationship = {
  readonly sourceElementId: string;
  readonly targetElementId: string;
  readonly type: SoftwareElementRelationshipType;
  readonly description: string;
};

export type SoftwareInterface = {
  readonly id: string;
  readonly name: string;
  readonly providedByElementId: string;
  readonly consumedByElementIds: string[];
  readonly contract: string;
};

export type SoftwareRequirementAllocation = {
  readonly requirement: SoftwareRequirementReference;
  readonly elementIds: string[];
};

export type SoftwareArchitectureDecision = {
  readonly id: string;
  readonly statement: string;
  readonly tracesTo: SoftwareRequirementReference[];
};

export class SoftwareArchitectureDescription implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly elements: SoftwareElement[] | null | undefined,
    public readonly relationships:
      | SoftwareElementRelationship[]
      | null
      | undefined,
    public readonly interfaces: SoftwareInterface[] | null | undefined,
    public readonly requirementAllocations:
      | SoftwareRequirementAllocation[]
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
