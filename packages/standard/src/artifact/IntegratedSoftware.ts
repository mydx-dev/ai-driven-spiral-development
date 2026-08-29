import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";
import type { SoftwareElementRelationshipType } from "./SoftwareDesign.js";

export type ImplementedSoftwareElementReference = {
  readonly implementationId: string;
  readonly elementId: string;
};

export type IntegratedRelationship = {
  readonly designId: string;
  readonly sourceElementId: string;
  readonly targetElementId: string;
  readonly type: SoftwareElementRelationshipType;
  readonly evidence: string[];
};

export type IntegratedInterface = {
  readonly designId: string;
  readonly interfaceId: string;
  readonly evidence: string[];
};

export class IntegratedSoftware implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly elements:
      ImplementedSoftwareElementReference[] | null | undefined,
    public readonly relationships:
      IntegratedRelationship[] | null | undefined,
    public readonly interfaces: IntegratedInterface[] | null | undefined,
    public readonly artifactReferences: string[] | null | undefined,
    public readonly evidence: string[] | null | undefined,
    public readonly unresolvedItems: string[] | null | undefined,
  ) {}
}
