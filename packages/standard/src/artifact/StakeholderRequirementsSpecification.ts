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
    public readonly stakeholders: string[] | null | undefined,
    public readonly purpose: string | null | undefined,
    public readonly scope: string | null | undefined,
    public readonly businessContext: string | null | undefined,
    public readonly operationalContext: string | null | undefined,
    public readonly requirements: StakeholderRequirement[] | null | undefined,
    public readonly constraints: string[] | null | undefined,
    public readonly scenarios: string[] | null | undefined,
    public readonly unresolvedItems: UnresolvedItem[] | null | undefined,
  ) {}
}
