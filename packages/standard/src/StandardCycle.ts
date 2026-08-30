import {
  Cycle,
  type CycleFeedbackResult,
} from "@mydx-dev/ai-driven-spiral-development";
import { standardFeedbackName } from "./StandardProcess.js";

export type FeedbackChangeState = "unconfirmed" | "exists" | "none";

export class StandardCycle extends Cycle {
  static readonly cycleCompletionName = standardFeedbackName;

  constructor(
    public readonly id: string,
    public readonly newInformation: FeedbackChangeState,
    public readonly changedInformation: FeedbackChangeState,
  ) {
    super();
  }

  fallback(_processName: string): this {
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle:
        this.newInformation === "exists" || this.changedInformation === "exists",
    };
  }
}
