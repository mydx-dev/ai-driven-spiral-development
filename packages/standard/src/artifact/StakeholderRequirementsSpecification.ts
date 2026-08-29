import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type StakeholderRequirement = {
  readonly id: string;
  readonly statement: string;
  readonly source: string;
};

export type UnresolvedItem = {
  readonly id: string;
  readonly description: string;
};

export class StakeholderRequirementsSpecification implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly stakeholders: string[],
    public readonly purpose: string,
    public readonly scope: string,
    public readonly businessContext: string,
    public readonly operationalContext: string,
    public readonly requirements: StakeholderRequirement[],
    public readonly constraints: string[],
    public readonly scenarios: string[],
    public readonly unresolvedItems: UnresolvedItem[],
  ) {}
}
