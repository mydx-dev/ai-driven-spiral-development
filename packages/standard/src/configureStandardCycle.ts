import type {
  Artifact,
  Process,
} from "@mydx-dev/ai-driven-spiral-development";
import { StandardCycle } from "./StandardCycle.js";

export const configureStandardCycle = <
  TRequirementsArtifact extends Artifact,
  TRequirementsMessage,
  TSystemRequirementsArtifact extends Artifact,
  TSystemRequirementsMessage,
  TSoftwareRequirementsArtifact extends Artifact,
  TSoftwareRequirementsMessage,
  TImplementationArtifact extends Artifact,
  TImplementationMessage,
  TIntegrationArtifact extends Artifact,
  TIntegrationMessage,
  TVerificationArtifact extends Artifact,
  TVerificationMessage,
  TValidationArtifact extends Artifact,
  TValidationMessage,
>({
  requirements,
  systemRequirements,
  softwareRequirements,
  implementation,
  integration,
  verification,
  validation,
}: {
  requirements: Process<
    "要求定義",
    TRequirementsArtifact,
    TRequirementsMessage
  >;
  systemRequirements: Process<
    "システム要件定義",
    TSystemRequirementsArtifact,
    TSystemRequirementsMessage
  >;
  softwareRequirements: Process<
    "ソフトウェア要件定義",
    TSoftwareRequirementsArtifact,
    TSoftwareRequirementsMessage
  >;
  implementation: Process<"実装", TImplementationArtifact, TImplementationMessage>;
  integration: Process<"統合", TIntegrationArtifact, TIntegrationMessage>;
  verification: Process<"QA", TVerificationArtifact, TVerificationMessage>;
  validation: Process<"検収", TValidationArtifact, TValidationMessage>;
}) => {
  class ConfiguredStandardCycle extends StandardCycle {}

  return ConfiguredStandardCycle.route(requirements)
    .route(systemRequirements)
    .route(softwareRequirements)
    .route(implementation)
    .route(integration)
    .route(verification)
    .route(validation);
};
