import type { Artifact } from "ai-driven-spiral-development";

export class AcceptanceReport implements Artifact {
  constructor(
    public readonly id: string,
    public readonly demandIds: string[],
    public readonly results: DemandAcceptance[],
    public readonly feedback: AcceptanceFeedback,
  ) {}
}

export class DemandAcceptance {
  constructor(
    public readonly demandId: string,
    public readonly reached: boolean,
    public readonly evaluation: string,
  ) {}
}

export class AcceptanceFeedback {
  constructor(
    public readonly currentCycleDefect: boolean,
    public readonly newDemand: boolean,
    public readonly changedDemand: boolean,
  ) {}
}
