import {
  Cycle,
  type CycleFeedbackResult,
} from "@mydx-dev/ai-driven-spiral-development";
import { standardFeedbackName } from "./StandardProcess.js";

export type FeedbackChangeState = "unconfirmed" | "exists" | "none";
/** @deprecated Use FeedbackChangeState. */
export type DemandChangeState = FeedbackChangeState;

export class StandardCycle extends Cycle {
  static readonly cycleCompletionName = standardFeedbackName;

  constructor(
    public readonly id: string,
    public readonly newInformation: FeedbackChangeState,
    public readonly changedInformation: FeedbackChangeState,
  ) {
    super();
  }

  /** @deprecated Use newInformation. */
  get newDemand(): FeedbackChangeState {
    return this.newInformation;
  }

  /** @deprecated Use changedInformation. */
  get changedDemand(): FeedbackChangeState {
    return this.changedInformation;
  }

  fallback(_processName: string): this {
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle:
        this.newInformation === "exists" ||
        this.changedInformation === "exists",
    };
  }
}
