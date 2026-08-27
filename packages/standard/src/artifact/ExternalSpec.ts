import type { Artifact } from "ai-driven-spiral-development";

export class ExternalSpec implements Artifact {
  constructor(
    public readonly id: string,
    public readonly requirementIds: string[],
    public readonly features: Feature[],
  ) {}
}

export class Feature {
  constructor(
    public readonly id: string,
    public readonly requirementIds: string[],
    public readonly detail: string,
  ) {}
}
