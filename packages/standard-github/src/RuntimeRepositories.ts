import type {
  Artifact,
  ArtifactRepository,
  CycleRepository,
} from "@mydx-dev/ai-driven-spiral-development";
import {
  ImplementedSoftwareElements,
  IntegratedSoftware,
  SoftwareArchitectureDescription,
  SoftwareElementDesign,
  SoftwareRequirementsSpecification,
  StakeholderRequirementsSpecification,
  StandardCycle,
  SystemArchitectureDescription,
  SystemRequirementsSpecification,
  ValidationResult,
  VerificationResult,
} from "@mydx-dev/spiral-standard";
import {
  GitHubApiError,
  GitHubIssueId,
  type GitHubClient,
} from "@mydx-dev/spiral-github";
import {
  StandardCycleIssue,
  StandardCycleIssueTemplate,
} from "./IssueMappings.js";
import {
  feedbackStateIssueCodec,
  implementedSoftwareElementsIssueCodec,
  integratedSoftwareIssueCodec,
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
import { StandardFeedbackState } from "./StandardFeedbackState.js";

type Issue = {
  readonly number: number;
  readonly body: string | null;
  readonly pull_request?: unknown;
};
type SearchIssues = { readonly items: Issue[] };

export class CompositeArtifactRepository implements ArtifactRepository<Artifact> {
  constructor(
    public readonly repositories: readonly ArtifactRepository<Artifact>[],
  ) {}

  async find(id: string): Promise<Artifact | undefined> {
    for (const repository of this.repositories) {
      const artifact = await repository.find(id);
      if (artifact) return artifact;
    }
    return undefined;
  }

  async findByCycle(cycleId: string): Promise<Artifact[]> {
    return (
      await Promise.all(
        this.repositories.map((repository) => repository.findByCycle(cycleId)),
      )
    ).flat();
  }

  async save(artifact: Artifact): Promise<void> {
    for (const repository of this.repositories) {
      const current = await repository.find(artifact.id);
      if (current) {
        await repository.save(artifact);
        return;
      }
    }
    throw new Error(
      `Composite Artifact Repository cannot route save: ${artifact.id}`,
    );
  }
}

export class StandardRuntimeCycleRepository implements CycleRepository<StandardCycle> {
  constructor(
    public readonly client: GitHubClient,
    public readonly feedbackRepository: ArtifactRepository<StandardFeedbackState>,
  ) {}

  async create(): Promise<StandardCycle> {
    return this.createCycle();
  }

  async find(id: string): Promise<StandardCycle | undefined> {
    const issueNumber = new GitHubIssueId(id, "Cycle").toNumber();
    try {
      await this.client.getIssue<Issue>(issueNumber);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404)
        return undefined;
      throw error;
    }

    const feedbackStates = await this.feedbackRepository.findByCycle(
      `#${issueNumber}`,
    );
    if (feedbackStates.length > 1) {
      throw new Error(
        `Cycle #${issueNumber} has multiple Standard Feedback State Artifacts.`,
      );
    }
    const feedback = feedbackStates[0];
    return new StandardCycle(
      `#${issueNumber}`,
      feedback?.newInformation ?? "unconfirmed",
      feedback?.changedInformation ?? "unconfirmed",
    );
  }

  async save(_cycle: StandardCycle): Promise<void> {}

  async createNext(previousCycle: StandardCycle): Promise<StandardCycle> {
    const previousNumber = new GitHubIssueId(
      previousCycle.id,
      "Cycle",
    ).toNumber();
    const previous = await this.client.getIssue<Issue>(previousNumber);
    const body = previous.body ?? "";
    const linked = new StandardCycleIssue(body).reference("## 次Cycle");
    const reverse = await this.findCycleByPrevious(previousNumber);

    if (linked) {
      if (reverse !== linked) {
        throw new Error(
          `Cycle link mismatch: #${previousNumber} points to #${linked}, but reverse link resolves to ${reverse ? `#${reverse}` : "none"}.`,
        );
      }
      const cycle = await this.find(`#${linked}`);
      if (!cycle) throw new Error(`Linked next Cycle not found: #${linked}`);
      return cycle;
    }

    if (reverse) {
      await this.linkNextCycle(previousNumber, body, reverse);
      const cycle = await this.find(`#${reverse}`);
      if (!cycle) throw new Error(`Linked next Cycle not found: #${reverse}`);
      return cycle;
    }

    const next = await this.createCycle(previousNumber);
    await this.linkNextCycle(
      previousNumber,
      body,
      new GitHubIssueId(next.id, "Cycle").toNumber(),
    );
    return next;
  }

  async createCycle(previousIssueNumber?: number): Promise<StandardCycle> {
    const issue = await this.client.createIssue<Issue>({
      title: "Cycle",
      body: new StandardCycleIssueTemplate(previousIssueNumber).render(),
    });
    return new StandardCycle(`#${issue.number}`, "unconfirmed", "unconfirmed");
  }

  async findCycleByPrevious(
    previousIssueNumber: number,
  ): Promise<number | undefined> {
    const response = await this.client.searchIssues<SearchIssues>(
      `is:issue "#${previousIssueNumber}" in:body`,
    );
    const candidates = response.items.filter(
      (item) =>
        !item.pull_request &&
        new StandardCycleIssue(item.body ?? "").reference("## 前Cycle") ===
          previousIssueNumber,
    );
    if (candidates.length > 1) {
      throw new Error(
        `Previous Cycle #${previousIssueNumber} is linked from multiple next Cycle Issues.`,
      );
    }
    return candidates[0]?.number;
  }

  async linkNextCycle(
    previousIssueNumber: number,
    previousBody: string,
    nextIssueNumber: number,
  ): Promise<void> {
    await this.client.updateIssue(previousIssueNumber, {
      body: new StandardCycleIssue(previousBody).withReference(
        "## 次Cycle",
        nextIssueNumber,
      ),
    });
  }
}

export const createStandardRuntimeRepositories = (client: GitHubClient) => {
  const stakeholderRequirementsRepository =
    new StandardArtifactIssueRepository<StakeholderRequirementsSpecification>(
      client,
      stakeholderRequirementsIssueCodec,
    );
  const systemRequirementsRepository =
    new StandardArtifactIssueRepository<SystemRequirementsSpecification>(
      client,
      systemRequirementsIssueCodec,
    );
  const systemArchitectureDescriptionRepository =
    new StandardArtifactIssueRepository<SystemArchitectureDescription>(
      client,
      systemArchitectureDescriptionIssueCodec,
    );
  const softwareRequirementsRepository =
    new StandardArtifactIssueRepository<SoftwareRequirementsSpecification>(
      client,
      softwareRequirementsIssueCodec,
    );
  const softwareArchitectureDescriptionRepository =
    new StandardArtifactIssueRepository<SoftwareArchitectureDescription>(
      client,
      softwareArchitectureDescriptionIssueCodec,
    );
  const softwareElementDesignRepository =
    new StandardArtifactIssueRepository<SoftwareElementDesign>(
      client,
      softwareElementDesignIssueCodec,
    );
  const implementedSoftwareElementsRepository =
    new StandardArtifactIssueRepository<ImplementedSoftwareElements>(
      client,
      implementedSoftwareElementsIssueCodec,
    );
  const integratedSoftwareRepository =
    new StandardArtifactIssueRepository<IntegratedSoftware>(
      client,
      integratedSoftwareIssueCodec,
    );
  const verificationResultRepository =
    new StandardArtifactIssueRepository<VerificationResult>(
      client,
      verificationResultIssueCodec,
    );
  const validationResultRepository =
    new StandardArtifactIssueRepository<ValidationResult>(
      client,
      validationResultIssueCodec,
    );
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
