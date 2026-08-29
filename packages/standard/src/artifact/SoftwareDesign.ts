import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareRequirementReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SoftwareDesignElement = {
  readonly id: string;
  readonly name: string;
  readonly responsibilities: string[];
  readonly data: string[] | null | undefined;
  readonly state: string[] | null | undefined;
  readonly behavior: string[] | null | undefined;
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

export type SoftwareRequirementDesignAllocation = {
  readonly requirement: SoftwareRequirementReference;
  readonly elementIds: string[];
};

export type SoftwareDesignRationale = {
  readonly id: string;
  readonly decision: string;
  readonly reason: string;
};

export type SoftwareDesignUnresolvedDecision = {
  readonly id: string;
  readonly description: string;
};

export class SoftwareDesign implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly elements: SoftwareDesignElement[] | null | undefined,
    public readonly relationships:
      | SoftwareElementRelationship[]
      | null
      | undefined,
    public readonly interfaces: SoftwareInterface[] | null | undefined,
    public readonly requirementAllocations:
      | SoftwareRequirementDesignAllocation[]
      | null
      | undefined,
    public readonly rationales: SoftwareDesignRationale[] | null | undefined,
    public readonly unresolvedDecisions:
      | SoftwareDesignUnresolvedDecision[]
      | null
      | undefined,
  ) {}
}
