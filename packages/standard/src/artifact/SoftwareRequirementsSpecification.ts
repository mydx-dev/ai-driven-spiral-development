import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareRequirementCategory =
  "functional" | "interface" | "data" | "quality" | "security" | "other";

export type SystemArchitectureAllocationReference = {
  readonly architectureId: string;
  readonly systemRequirementSpecificationId: string;
  readonly systemRequirementId: string;
  readonly softwareElementId: string;
};

export type SoftwareRequirement = {
  readonly id: string;
  readonly statement: string;
  readonly category: SoftwareRequirementCategory;
  readonly verificationCriteria: string[];
  readonly tracesTo: SystemArchitectureAllocationReference[];
};

export type SRSUnresolvedItem = {
  readonly id: string;
  readonly description: string;
};

export class SoftwareRequirementsSpecification implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly purpose: string | null | undefined,
    public readonly scope: string | null | undefined,
    public readonly requirements: SoftwareRequirement[] | null | undefined,
    public readonly unresolvedItems: SRSUnresolvedItem[] | null | undefined,
  ) {}
}
