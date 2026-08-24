import type { Artifact } from "./Artifact";

export type GatePassFailed = {
  readonly passed: false;
  readonly artifacts: Artifact[];
  readonly errors: string[];
};

export type GatePassSuccess = {
  readonly passed: true;
};

export type GatePass = GatePassSuccess | GatePassFailed;

export interface ProcessGate<TArtifact extends Artifact> {
  verifyStructuralComplete(artifacts: TArtifact[]): GatePass;
}
