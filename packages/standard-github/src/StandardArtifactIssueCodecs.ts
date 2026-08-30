import {
  RequirementAllocation,
  SoftwareDesign,
  SoftwareRequirementsSpecification,
  StakeholderRequirementsSpecification,
  SystemArchitecture,
  SystemRequirementsSpecification,
  ValidationResult,
  VerificationResult,
} from "@mydx-dev/spiral-standard";
import type {
  StandardArtifact,
  StandardArtifactIssueCodec,
} from "./StandardArtifactIssueRepository.js";

const restoreWithPrototype = <TArtifact extends StandardArtifact>(
  prototype: object,
  payload: unknown,
): TArtifact => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Standard Artifact payload must be an object.");
  }
  return Object.assign(Object.create(prototype), payload) as TArtifact;
};

const unique = (ids: Array<string | undefined>): string[] => [
  ...new Set(ids.filter((id): id is string => Boolean(id?.trim()))),
];

export const stakeholderRequirementsIssueCodec: StandardArtifactIssueCodec<StakeholderRequirementsSpecification> =
  {
    artifactType: "stakeholder-requirements-specification",
    title: (artifact) => `[StRS] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<StakeholderRequirementsSpecification>(
        StakeholderRequirementsSpecification.prototype,
        payload,
      ),
    traceability: () => [],
  };

export const systemRequirementsIssueCodec: StandardArtifactIssueCodec<SystemRequirementsSpecification> =
  {
    artifactType: "system-requirements-specification",
    title: (artifact) => `[SyRS] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SystemRequirementsSpecification>(
        SystemRequirementsSpecification.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.requirements ?? []).flatMap((requirement) =>
          requirement.tracesTo.map((trace) => trace.specificationId),
        ),
      ),
  };

export const systemArchitectureIssueCodec: StandardArtifactIssueCodec<SystemArchitecture> =
  {
    artifactType: "system-architecture",
    title: (artifact) => `[System Architecture] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SystemArchitecture>(
        SystemArchitecture.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.decisions ?? []).flatMap((decision) =>
          decision.tracesTo.map((trace) => trace.specificationId),
        ),
      ),
  };

export const requirementAllocationIssueCodec: StandardArtifactIssueCodec<RequirementAllocation> =
  {
    artifactType: "requirement-allocation",
    title: (artifact) => `[Requirement Allocation] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<RequirementAllocation>(
        RequirementAllocation.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.allocations ?? []).map(
          (allocation) => allocation.requirement.specificationId,
        ),
      ),
  };

export const softwareRequirementsIssueCodec: StandardArtifactIssueCodec<SoftwareRequirementsSpecification> =
  {
    artifactType: "software-requirements-specification",
    title: (artifact) => `[SRS] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SoftwareRequirementsSpecification>(
        SoftwareRequirementsSpecification.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.requirements ?? []).flatMap((requirement) =>
          requirement.tracesTo.flatMap((trace) => [
            trace.allocationId,
            trace.systemRequirementSpecificationId,
          ]),
        ),
      ),
  };

export const softwareDesignIssueCodec: StandardArtifactIssueCodec<SoftwareDesign> =
  {
    artifactType: "software-design",
    title: (artifact) => `[Software Design] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SoftwareDesign>(SoftwareDesign.prototype, payload),
    traceability: (artifact) =>
      unique(
        (artifact.requirementAllocations ?? []).map(
          (allocation) => allocation.requirement.specificationId,
        ),
      ),
  };

export const verificationResultIssueCodec: StandardArtifactIssueCodec<VerificationResult> =
  {
    artifactType: "verification-result",
    title: (artifact) => `[Verification] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<VerificationResult>(
        VerificationResult.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.results ?? []).flatMap((result) => [
          result.requirement.specificationId,
          result.integratedSoftwareId,
        ]),
      ),
  };

export const validationResultIssueCodec: StandardArtifactIssueCodec<ValidationResult> =
  {
    artifactType: "validation-result",
    title: (artifact) => `[Validation] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<ValidationResult>(
        ValidationResult.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.results ?? []).flatMap((result) => [
          result.stakeholderRequirement.specificationId,
          ...(result.systemRequirements ?? []).map(
            (reference) => reference.specificationId,
          ),
          ...(result.softwareRequirements ?? []).map(
            (reference) => reference.specificationId,
          ),
          ...(result.verificationResultIds ?? []),
        ]),
      ),
  };

export const standardArtifactIssueCodecs = {
  stakeholderRequirements: stakeholderRequirementsIssueCodec,
  systemRequirements: systemRequirementsIssueCodec,
  systemArchitecture: systemArchitectureIssueCodec,
  requirementAllocation: requirementAllocationIssueCodec,
  softwareRequirements: softwareRequirementsIssueCodec,
  softwareDesign: softwareDesignIssueCodec,
  verificationResult: verificationResultIssueCodec,
  validationResult: validationResultIssueCodec,
} as const;
