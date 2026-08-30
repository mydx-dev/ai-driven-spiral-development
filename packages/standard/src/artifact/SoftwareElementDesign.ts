import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareArchitectureElementReference = {
  readonly architectureId: string;
  readonly elementId: string;
};

export type SoftwareElementDesignRationale = {
  readonly id: string;
  readonly decision: string;
  readonly reason: string;
};

export type SoftwareElementDesignUnresolvedDecision = {
  readonly id: string;
  readonly description: string;
};

export class SoftwareElementDesign implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly architectureElement: SoftwareArchitectureElementReference,
    public readonly data: string[] | null | undefined,
    public readonly state: string[] | null | undefined,
    public readonly behavior: string[] | null | undefined,
    public readonly interfaceIds: string[] | null | undefined,
    public readonly rationales:
      SoftwareElementDesignRationale[] | null | undefined,
    public readonly unresolvedDecisions:
      SoftwareElementDesignUnresolvedDecision[] | null | undefined,
  ) {}
}
