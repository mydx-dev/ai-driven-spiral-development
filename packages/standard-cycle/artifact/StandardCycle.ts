import { Cycle, type CycleFeedbackResult } from "../../core/Cycle";

type DemandChangeState = "unconfirmed" | "exists" | "none";

export class StandardCycle extends Cycle {
  constructor(
    public readonly id: string,
    public semanticCompletedProcesses: ReadonlySet<string>,
    public readonly newDemand: DemandChangeState,
    public readonly changedDemand: DemandChangeState,
  ) {
    super();
  }

  fallback(processName: string): this {
    const completedProcesses = new Set(this.semanticCompletedProcesses);
    completedProcesses.delete(processName);

    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle:
        this.newDemand === "exists" || this.changedDemand === "exists",
    };
  }
}
