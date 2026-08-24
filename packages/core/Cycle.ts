import type { Artifact } from "./Artifact";

export type CycleFeedbackResult = {
  readonly needNextCycle: boolean;
};

export interface Cycle extends Artifact {
  readonly id: string;
  fallback(processName: string): Cycle;
  feedback(): CycleFeedbackResult;
}
