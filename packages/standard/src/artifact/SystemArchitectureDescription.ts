import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SystemElementType =
  | "human"
  | "software"
  | "hardware"
  | "external-service"
  | "other";

export type SystemRequirementReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SystemElement = {
  readonly id: string;
  readonly name: string;
  readonly type: SystemElementType;
  readonly responsibilities: string[];
};

export type SystemElementRelationshipType =
  | "dependency"
  | "interaction"
  | "composition"
  | "other";

export type SystemElementRelationship = {
  readonly sourceElementId: string;
  readonly targetElementId: string;
  readonly type: SystemElementRelationshipType;
  readonly description: string;
};

export type SystemInterface = {
  readonly id: string;
  readonly name: string;
  readonly providedByElementId: string;
  readonly consumedByElementIds: string[];
  readonly contract: string;
};

export type SystemRequirementAllocation = {
  readonly requirement: SystemRequirementReference;
  readonly elementIds: string[];
};

export type SystemArchitectureDecision = {
  readonly id: string;
  readonly statement: string;
  readonly tracesTo: SystemRequirementReference[];
};

export class SystemArchitectureDescription implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly boundary: string | null | undefined,
    public readonly elements: SystemElement[] | null | undefined,
    public readonly relationships: SystemElementRelationship[] | null | undefined,
    public readonly interfaces: SystemInterface[] | null | undefined,
    public readonly requirementAllocations:
      | SystemRequirementAllocation[]
      | null
      | undefined,
    public readonly decisions: SystemArchitectureDecision[] | null | undefined,
  ) {}
}
