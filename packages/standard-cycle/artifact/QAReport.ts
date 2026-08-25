import type { Artifact } from "../../core/Artifact";

export class QAReport implements Artifact {
  constructor(
    public readonly id: string,
    public readonly requirementIds: string[],
    public readonly results: RequirementVerification[],
  ) {}
}
export class RequirementVerification {
  constructor(
    public readonly requirementId: string,
    public readonly satisfied: boolean,
    public readonly evidence: string,
  ) {}
}
