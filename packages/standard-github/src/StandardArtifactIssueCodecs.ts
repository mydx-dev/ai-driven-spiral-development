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
import { standardGitHubArtifactIssueTemplatesByKey } from "./IssueTemplates.mjs";
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

const template = standardGitHubArtifactIssueTemplatesByKey;

export const stakeholderRequirementsIssueCodec: StandardArtifactIssueCodec<StakeholderRequirementsSpecification> =
  {
    artifactType: template.stakeholderRequirements.artifactType,
    title: (artifact) =>
      `${template.stakeholderRequirements.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<StakeholderRequirementsSpecification>(
        StakeholderRequirementsSpecification.prototype,
        payload,
      ),
    traceability: () => [],
  };

export const systemRequirementsIssueCodec: StandardArtifactIssueCodec<SystemRequirementsSpecification> =
  {
    artifactType: template.systemRequirements.artifactType,
    title: (artifact) =>
      `${template.systemRequirements.titlePrefix} ${artifact.id}`,
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
    artifactType: template.systemArchitectureDescription.artifactType,
    title: (artifact) =>
      `${template.systemArchitectureDescription.titlePrefix} ${artifact.id}`,
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
    artifactType: template.softwareRequirements.artifactType,
    title: (artifact) =>
      `${template.softwareRequirements.titlePrefix} ${artifact.id}`,
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
    artifactType: template.softwareArchitectureDescription.artifactType,
    title: (artifact) =>
      `${template.softwareArchitectureDescription.titlePrefix} ${artifact.id}`,
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
    artifactType: template.softwareElementDesign.artifactType,
    title: (artifact) =>
      `${template.softwareElementDesign.titlePrefix} ${artifact.id}`,
    restore: (payload) =>
      restoreWithPrototype<SoftwareElementDesign>(
        SoftwareElementDesign.prototype,
        payload,
      ),
    traceability: (artifact) => [artifact.architectureElement.architectureId],
  };

export const implementedSoftwareElementsIssueCodec: StandardArtifactIssueCodec<ImplementedSoftwareElements> =
  {
    artifactType: template.implementedSoftwareElements.artifactType,
    title: (artifact) =>
      `${template.implementedSoftwareElements.titlePrefix} ${artifact.id}`,
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

export const integratedSoftwareIssueCodec: StandardArtifactIssueCodec<IntegratedSoftware> =
  {
    artifactType: template.integratedSoftware.artifactType,
    title: (artifact) =>
      `${template.integratedSoftware.titlePrefix} ${artifact.id}`,
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

export const verificationResultIssueCodec: StandardArtifactIssueCodec<VerificationResult> =
  {
    artifactType: template.verificationResult.artifactType,
    title: (artifact) =>
      `${template.verificationResult.titlePrefix} ${artifact.id}`,
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
    artifactType: template.validationResult.artifactType,
    title: (artifact) =>
      `${template.validationResult.titlePrefix} ${artifact.id}`,
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
  implementedSoftwareElements: implementedSoftwareElementsIssueCodec,
  integratedSoftware: integratedSoftwareIssueCodec,
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
  実装: [
    softwareElementDesignIssueCodec,
    implementedSoftwareElementsIssueCodec,
  ],
  統合: [integratedSoftwareIssueCodec],
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
