import type { Artifact } from "./Artifact";

export type GatePassFailed<TArtifact extends Artifact> = {
  readonly passed: false;
  readonly artifacts: TArtifact[];
  readonly errors: string[];
};

export type GatePassSuccess = {
  readonly passed: true;
};

export type GatePass<TArtifact extends Artifact> =
  | GatePassSuccess
  | GatePassFailed<TArtifact>;

export interface ProcessGate<TArtifact extends Artifact> {
  verifyStructuralComplete(artifacts: TArtifact[]): GatePass<TArtifact>;
}
