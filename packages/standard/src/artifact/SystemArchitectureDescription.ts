import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SystemArchitectureElementType =
  "human" | "software" | "hardware" | "external-service" | "other";

export type SystemArchitectureRequirementReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SystemArchitectureElement = {
  readonly id: string;
  readonly name: string;
  readonly type: SystemArchitectureElementType;
  readonly responsibilities: string[];
};

export type SystemArchitectureRelationshipType =
  "dependency" | "interaction" | "composition" | "other";

export type SystemArchitectureRelationship = {
  readonly sourceElementId: string;
  readonly targetElementId: string;
  readonly type: SystemArchitectureRelationshipType;
  readonly description: string;
};

export type SystemArchitectureInterface = {
  readonly id: string;
  readonly name: string;
  readonly providedByElementId: string;
  readonly consumedByElementIds: string[];
  readonly contract: string;
};

export type SystemArchitectureRequirementAllocation = {
  readonly requirement: SystemArchitectureRequirementReference;
  readonly elementIds: string[];
};

export type SystemArchitectureDescriptionDecision = {
  readonly id: string;
  readonly statement: string;
  readonly tracesTo: SystemArchitectureRequirementReference[];
};

export class SystemArchitectureDescription implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly boundary: string | null | undefined,
    public readonly elements: SystemArchitectureElement[] | null | undefined,
    public readonly relationships:
      SystemArchitectureRelationship[] | null | undefined,
    public readonly interfaces:
      SystemArchitectureInterface[] | null | undefined,
    public readonly requirementAllocations:
      SystemArchitectureRequirementAllocation[] | null | undefined,
    public readonly decisions:
      SystemArchitectureDescriptionDecision[] | null | undefined,
  ) {}
}
