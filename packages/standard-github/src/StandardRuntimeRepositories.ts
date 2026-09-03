import { StandardArtifactIssueRepository } from "./StandardArtifactIssueRepository.js";
import { feedbackStateIssueCodec, StandardFeedbackState } from "./StandardFeedbackState.js";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  GitHubSoftwareArchitectureDescriptionRepository,
  GitHubSoftwareElementDesignRepository,
  GitHubSoftwareRequirementsRepository,
  GitHubStakeholderRequirementsRepository,
  GitHubSystemArchitectureDescriptionRepository,
  GitHubSystemRequirementsRepository,
  GitHubValidationResultRepository,
  GitHubVerificationResultRepository,
} from "./ArtifactRepositories.js";
import {
  GitHubImplementedSoftwareElementsRepository,
  GitHubIntegratedSoftwareRepository,
} from "./ProjectionRepositories.js";
import { StandardRuntimeCycleRepository } from "./RuntimeRepositories.js";

export const createStandardRuntimeRepositories = (client: GitHubClient) => {
  const stakeholderRequirementsRepository =
    new GitHubStakeholderRequirementsRepository(client);
  const systemRequirementsRepository = new GitHubSystemRequirementsRepository(client);
  const systemArchitectureDescriptionRepository =
    new GitHubSystemArchitectureDescriptionRepository(client);
  const softwareRequirementsRepository = new GitHubSoftwareRequirementsRepository(client);
  const softwareArchitectureDescriptionRepository =
    new GitHubSoftwareArchitectureDescriptionRepository(client);
  const softwareElementDesignRepository =
    new GitHubSoftwareElementDesignRepository(client);
  const implementedSoftwareElementsRepository =
    new GitHubImplementedSoftwareElementsRepository(
      client,
      softwareElementDesignRepository,
    );
  const integratedSoftwareRepository = new GitHubIntegratedSoftwareRepository(
    client,
    implementedSoftwareElementsRepository,
    softwareArchitectureDescriptionRepository,
  );
  const verificationResultRepository = new GitHubVerificationResultRepository(client);
  const validationResultRepository = new GitHubValidationResultRepository(client);
  const feedbackStateRepository =
    new StandardArtifactIssueRepository<StandardFeedbackState>(
      client,
      feedbackStateIssueCodec,
    );
  const cycleRepository = new StandardRuntimeCycleRepository(
    client,
    feedbackStateRepository,
  );

  return {
    stakeholderRequirementsRepository,
    systemRequirementsRepository,
    systemArchitectureDescriptionRepository,
    softwareRequirementsRepository,
    softwareArchitectureDescriptionRepository,
    softwareElementDesignRepository,
    implementedSoftwareElementsRepository,
    integratedSoftwareRepository,
    verificationResultRepository,
    validationResultRepository,
    feedbackStateRepository,
    cycleRepository,
  };
};
