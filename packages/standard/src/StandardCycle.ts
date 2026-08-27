import {
  Cycle,
  type CycleFeedbackResult,
} from "@mydx-dev/ai-driven-spiral-development";

export type DemandChangeState = "unconfirmed" | "exists" | "none";

export class StandardCycle extends Cycle {
  constructor(
    public readonly id: string,
    public readonly newDemand: DemandChangeState,
    public readonly changedDemand: DemandChangeState,
  ) {
    super();
  }

  fallback(_processName: string): this {
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle:
        this.newDemand === "exists" || this.changedDemand === "exists",
    };
  }
}
