import type {
  SoftwareArchitectureDescriptionRepository,
  SoftwareElementDesignRepository,
  SoftwareRequirementsRepository,
  StakeholderRequirementsRepository,
  SystemArchitectureDescriptionRepository,
  SystemRequirementsRepository,
  ValidationResultRepository,
  VerificationResultRepository,
} from "@mydx-dev/spiral-standard";
import {
  SoftwareArchitectureDescription,
  SoftwareElementDesign,
  SoftwareRequirementsSpecification,
  StakeholderRequirementsSpecification,
  SystemArchitectureDescription,
  SystemRequirementsSpecification,
  ValidationResult,
  VerificationResult,
} from "@mydx-dev/spiral-standard";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  softwareArchitectureDescriptionIssueCodec,
  softwareElementDesignIssueCodec,
  softwareRequirementsIssueCodec,
  stakeholderRequirementsIssueCodec,
  systemArchitectureDescriptionIssueCodec,
  systemRequirementsIssueCodec,
  validationResultIssueCodec,
  verificationResultIssueCodec,
} from "./StandardArtifactIssueCodecs.js";
import { StandardArtifactIssueRepository } from "./StandardArtifactIssueRepository.js";

export class GitHubStakeholderRequirementsRepository
  extends StandardArtifactIssueRepository<StakeholderRequirementsSpecification>
  implements StakeholderRequirementsRepository
{
  constructor(client: GitHubClient) {
    super(client, stakeholderRequirementsIssueCodec);
  }
}

export class GitHubSystemRequirementsRepository
  extends StandardArtifactIssueRepository<SystemRequirementsSpecification>
  implements SystemRequirementsRepository
{
  constructor(client: GitHubClient) {
    super(client, systemRequirementsIssueCodec);
  }
}

export class GitHubSystemArchitectureDescriptionRepository
  extends StandardArtifactIssueRepository<SystemArchitectureDescription>
  implements SystemArchitectureDescriptionRepository
{
  constructor(client: GitHubClient) {
    super(client, systemArchitectureDescriptionIssueCodec);
  }
}

export class GitHubSoftwareRequirementsRepository
  extends StandardArtifactIssueRepository<SoftwareRequirementsSpecification>
  implements SoftwareRequirementsRepository
{
  constructor(client: GitHubClient) {
    super(client, softwareRequirementsIssueCodec);
  }
}

export class GitHubSoftwareArchitectureDescriptionRepository
  extends StandardArtifactIssueRepository<SoftwareArchitectureDescription>
  implements SoftwareArchitectureDescriptionRepository
{
  constructor(client: GitHubClient) {
    super(client, softwareArchitectureDescriptionIssueCodec);
  }
}

export class GitHubSoftwareElementDesignRepository
  extends StandardArtifactIssueRepository<SoftwareElementDesign>
  implements SoftwareElementDesignRepository
{
  constructor(client: GitHubClient) {
    super(client, softwareElementDesignIssueCodec);
  }
}

/** Runtime-managed evidence persisted as an Issue, but never exposed as a human template. */
export class GitHubVerificationResultRepository
  extends StandardArtifactIssueRepository<VerificationResult>
  implements VerificationResultRepository
{
  constructor(client: GitHubClient) {
    super(client, verificationResultIssueCodec);
  }
}

/** Runtime-managed evidence persisted as an Issue, but never exposed as a human template. */
export class GitHubValidationResultRepository
  extends StandardArtifactIssueRepository<ValidationResult>
  implements ValidationResultRepository
{
  constructor(client: GitHubClient) {
    super(client, validationResultIssueCodec);
  }
}
