import type { Artifact } from "./Artifact";

export type GatePass =
  | {
      readonly passed: true;
    }
  | {
      readonly passed: false;
      readonly errors: string[];
    };

export interface ProcessGate<TArtifact extends Artifact> {
  verifyStructuralComplete(artifacts: TArtifact[]): GatePass;
}
