import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SystemElementType =
  "human" | "software" | "hardware" | "external-service" | "other";

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

export type ArchitectureDecision = {
  readonly id: string;
  readonly statement: string;
  readonly tracesTo: SystemRequirementReference[];
};

export class SystemArchitecture implements Artifact {
  readonly artifactType = "system-architecture" as const;

  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly boundary: string | null | undefined,
    public readonly elements: SystemElement[] | null | undefined,
    public readonly decisions: ArchitectureDecision[] | null | undefined,
  ) {}
}
