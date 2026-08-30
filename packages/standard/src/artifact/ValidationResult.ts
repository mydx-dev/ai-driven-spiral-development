import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type StakeholderRequirementValidationReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SystemRequirementValidationReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type SoftwareRequirementValidationReference = {
  readonly specificationId: string;
  readonly requirementId: string;
};

export type ValidationMethod =
  | "stakeholder-review"
  | "operational-evaluation"
  | "scenario-evaluation"
  | "demonstration"
  | "other";

export type ValidationFeedbackCandidate = {
  readonly id: string;
  readonly description: string;
  readonly evidence: string[];
};

export type RequirementValidationResult = {
  readonly id: string;
  readonly stakeholderRequirement: StakeholderRequirementValidationReference;
  readonly systemRequirements:
    SystemRequirementValidationReference[] | null | undefined;
  readonly softwareRequirements:
    SoftwareRequirementValidationReference[] | null | undefined;
  readonly verificationResultIds: string[] | null | undefined;
  readonly intendedUse: string;
  readonly scenario: string;
  readonly method: ValidationMethod;
  readonly evidence: string[];
  readonly feedback: string[] | null | undefined;
  readonly passed: boolean;
  readonly feedbackCandidates: ValidationFeedbackCandidate[] | null | undefined;
};

export class ValidationResult implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly results: RequirementValidationResult[] | null | undefined,
  ) {}
}
