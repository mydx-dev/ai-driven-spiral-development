import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareRequirementVerificationReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type VerificationMethod =
  "test" | "inspection" | "analysis" | "demonstration" | "other";

export type RequirementVerificationResult = {
  readonly id: string;
  readonly requirement: SoftwareRequirementVerificationReference;
  readonly integratedSoftwareId: string;
  readonly method: VerificationMethod;
  readonly evidence: string[];
  readonly passed: boolean;
  readonly failureCause: string | null | undefined;
  readonly unresolvedItems: string[] | null | undefined;
  readonly qualityReferences: string[] | null | undefined;
};

export class VerificationResult implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly results: RequirementVerificationResult[] | null | undefined,
  ) {}
}
