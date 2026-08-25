import type { Artifact } from "../../core/Artifact";

export class Implementation implements Artifact {
  constructor(
    public readonly id: string,
    public readonly featureIds: string[],
    public readonly features: ImplementedFeature[],
  ) {}
}

export class ImplementedFeature {
  constructor(
    public readonly featureId: string,
    public readonly testPassed: boolean,
    public readonly staticAnalysisPassed: boolean,
    public readonly buildPassed: boolean,
    public readonly reviewResolved: boolean,
    public readonly integrated: boolean,
  ) {}
}
