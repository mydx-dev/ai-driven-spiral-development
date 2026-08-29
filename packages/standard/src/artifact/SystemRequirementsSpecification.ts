import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SystemRequirementCategory =
  | "functional"
  | "interface"
  | "operational"
  | "quality"
  | "security"
  | "information-management"
  | "other";

export type StakeholderRequirementTrace = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SystemRequirement = {
  readonly id: string;
  readonly statement: string;
  readonly category: SystemRequirementCategory;
  readonly tracesTo: StakeholderRequirementTrace[];
};

export type SyRSUnresolvedItem = {
  readonly id: string;
  readonly description: string;
};

export class SystemRequirementsSpecification implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly purpose: string | null | undefined,
    public readonly scope: string | null | undefined,
    public readonly overview: string | null | undefined,
    public readonly requirements: SystemRequirement[] | null | undefined,
    public readonly assumptions: string[] | null | undefined,
    public readonly dependencies: string[] | null | undefined,
    public readonly unresolvedItems: SyRSUnresolvedItem[] | null | undefined,
  ) {}
}
