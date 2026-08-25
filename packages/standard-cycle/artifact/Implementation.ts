import type { Artifact } from "../../core/Artifact";

export class Implementation implements Artifact {
  constructor(
    public readonly id: string,
    public readonly features: ImplementedFeature[],
  ) {}
}

export class ImplementedFeature {
  constructor(
    public readonly featureId: string,
    public readonly completed: boolean,
  ) {}
}
