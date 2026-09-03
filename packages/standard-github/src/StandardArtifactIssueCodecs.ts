import {
  ImplementedSoftwareElements,
  IntegratedSoftware,
  SoftwareArchitectureDescription,
  SoftwareElementDesign,
  SoftwareRequirementsSpecification,
  StakeholderRequirementsSpecification,
  SystemArchitectureDescription,
  SystemRequirementsSpecification,
  type StandardStageName,
  ValidationResult,
  VerificationResult,
} from "@mydx-dev/spiral-standard";
import { standardGitHubArtifactIssueMappingsByKey } from "./IssueTemplates.mjs";
import type {
  StandardArtifact,
  StandardArtifactIssueCodec,
} from "./StandardArtifactIssueRepository.js";
import { feedbackStateIssueCodec } from "./StandardFeedbackState.js";

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

const mapping = standardGitHubArtifactIssueMappingsByKey;

export const stakeholderRequirementsIssueCodec: StandardArtifactIssueCodec<StakeholderRequirementsSpecification> =
  {
    artifactType: mapping.stakeholderRequirements.artifactType,
    title: (artifact) =>
      `${mapping.stakeholderRequirements.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<StakeholderRequirementsSpecification>(
        StakeholderRequirementsSpecification.prototype,
        payload,
      ),
    traceability: () => [],
  };

export const systemRequirementsIssueCodec: StandardArtifactIssueCodec<SystemRequirementsSpecification> =
  {
    artifactType: mapping.systemRequirements.artifactType,
    title: (artifact) =>
      `${mapping.systemRequirements.titlePrefix} ${artifact.id}`,
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

export const systemArchitectureDescriptionIssueCodec: StandardArtifactIssueCodec<SystemArchitectureDescription> =
  {
    artifactType: mapping.systemArchitectureDescription.artifactType,
    title: (artifact) =>
      `${mapping.systemArchitectureDescription.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SystemArchitectureDescription>(
        SystemArchitectureDescription.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique([
        ...(artifact.requirementAllocations ?? []).map(
          (allocation) => allocation.requirement.specificationId,
        ),
        ...(artifact.decisions ?? []).flatMap((decision) =>
          decision.tracesTo.map((trace) => trace.specificationId),
        ),
      ]),
  };

export const softwareRequirementsIssueCodec: StandardArtifactIssueCodec<SoftwareRequirementsSpecification> =
  {
    artifactType: mapping.softwareRequirements.artifactType,
    title: (artifact) =>
      `${mapping.softwareRequirements.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SoftwareRequirementsSpecification>(
        SoftwareRequirementsSpecification.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.requirements ?? []).flatMap((requirement) =>
          requirement.tracesTo.flatMap((trace) => [
            trace.architectureId,
            trace.systemRequirementSpecificationId,
          ]),
        ),
      ),
  };

export const softwareArchitectureDescriptionIssueCodec: StandardArtifactIssueCodec<SoftwareArchitectureDescription> =
  {
    artifactType: mapping.softwareArchitectureDescription.artifactType,
    title: (artifact) =>
      `${mapping.softwareArchitectureDescription.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SoftwareArchitectureDescription>(
        SoftwareArchitectureDescription.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique([
        ...(artifact.requirementAllocations ?? []).map(
          (allocation) => allocation.requirement.specificationId,
        ),
        ...(artifact.decisions ?? []).flatMap((decision) =>
          decision.tracesTo.map((trace) => trace.specificationId),
        ),
      ]),
    sections: (artifact) => [
      {
        heading: "## Dependency Graph",
        body:
          (artifact.relationships ?? [])
            .filter((relationship) => relationship.type === "dependency")
            .map(
              (relationship) =>
                `- \`${relationship.sourceElementId}\` -> \`${relationship.targetElementId}\``,
            )
            .join("\n") || "- None",
      },
    ],
  };

export const softwareElementDesignIssueCodec: StandardArtifactIssueCodec<SoftwareElementDesign> =
  {
    artifactType: mapping.softwareElementDesign.artifactType,
    title: (artifact) =>
      `${mapping.softwareElementDesign.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SoftwareElementDesign>(
        SoftwareElementDesign.prototype,
        payload,
      ),
    traceability: (artifact) => [artifact.architectureElement.architectureId],
  };

/** @deprecated ImplementedSoftwareElements is projected from GitHub evidence at runtime. */
export const implementedSoftwareElementsIssueCodec: StandardArtifactIssueCodec<ImplementedSoftwareElements> =
  {
    artifactType: "implemented-software-elements",
    title: (artifact) => `[Implemented Software Elements] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<ImplementedSoftwareElements>(
        ImplementedSoftwareElements.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique(
        (artifact.elements ?? []).map(
          (element) => element.elementDesign.designId,
        ),
      ),
  };

/** @deprecated IntegratedSoftware is projected from GitHub evidence at runtime. */
export const integratedSoftwareIssueCodec: StandardArtifactIssueCodec<IntegratedSoftware> =
  {
    artifactType: "integrated-software",
    title: (artifact) => `[Integrated Software] ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<IntegratedSoftware>(
        IntegratedSoftware.prototype,
        payload,
      ),
    traceability: (artifact) =>
      unique([
        ...(artifact.elements ?? []).map((element) => element.implementationId),
        ...(artifact.relationships ?? []).map(
          (relationship) => relationship.architectureId,
        ),
        ...(artifact.interfaces ?? []).map((item) => item.architectureId),
      ]),
  };

/** Runtime-managed QA result. No human Issue Template is distributed. */
export const verificationResultIssueCodec: StandardArtifactIssueCodec<VerificationResult> =
  {
    artifactType: mapping.verificationResult.artifactType,
    title: (artifact) =>
      `${mapping.verificationResult.titlePrefix} ${artifact.id}`,
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

/** Runtime-managed validation result. No human Issue Template is distributed. */
export const validationResultIssueCodec: StandardArtifactIssueCodec<ValidationResult> =
  {
    artifactType: mapping.validationResult.artifactType,
    title: (artifact) =>
      `${mapping.validationResult.titlePrefix} ${artifact.id}`,
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
  systemArchitectureDescription: systemArchitectureDescriptionIssueCodec,
  softwareRequirements: softwareRequirementsIssueCodec,
  softwareArchitectureDescription: softwareArchitectureDescriptionIssueCodec,
  softwareElementDesign: softwareElementDesignIssueCodec,
  verificationResult: verificationResultIssueCodec,
  validationResult: validationResultIssueCodec,
  feedbackState: feedbackStateIssueCodec,
} as const;

export const standardArtifactIssueCodecsByStage = {
  要求定義: [stakeholderRequirementsIssueCodec],
  システム要件定義: [
    systemRequirementsIssueCodec,
    systemArchitectureDescriptionIssueCodec,
  ],
  ソフトウェア要件定義: [
    softwareRequirementsIssueCodec,
    softwareArchitectureDescriptionIssueCodec,
  ],
  実装: [softwareElementDesignIssueCodec],
  統合: [],
  QA: [verificationResultIssueCodec],
  検収: [validationResultIssueCodec],
  フィードバック: [feedbackStateIssueCodec],
} as const satisfies Record<
  StandardStageName,
  readonly StandardArtifactIssueCodec<StandardArtifact>[]
>;

export const artifactIssueCodecsForSemanticCompletion = (
  name: StandardStageName,
): readonly StandardArtifactIssueCodec<StandardArtifact>[] =>
  standardArtifactIssueCodecsByStage[name];
