import type {
  ArtifactRepository,
  CycleFactory,
  CycleRepository,
} from "ai-driven-spiral-development";
import {
  AcceptanceGate,
  AcceptanceReport,
  Demand,
  EngineeringGate,
  ExternalSpec,
  Feature,
  Implementation,
  ImplementedFeature,
  QAReport,
  QAGate,
  Release,
  ReleaseGate,
  Requirement,
  StandardCycle,
} from "@mydx/spiral-standard";
import {
  GitHubApiError,
  GitHubIssue,
  GitHubIssueId,
  type GitHubClient,
} from "@mydx/spiral-github";
import {
  AcceptanceCycleIssue,
  DemandIssue,
  EngineeringChecks,
  ExternalSpecIssue,
  QARequirementIssue,
  StandardCycleIssue,
  StandardCycleIssueTemplate,
} from "./IssueMappings.js";

type Issue = { number: number; body: string | null; pull_request?: unknown };
type SearchIssues = { items: Issue[] };
type PullRequest = {
  number: number;
  state: string;
  merged_at: string | null;
  head: { sha: string };
};
type Review = { state: string; user: { login?: string } | null };
type ReviewThreads = {
  repository: {
    pullRequest: { reviewThreads: { nodes: Array<{ isResolved: boolean }> } } | null;
  } | null;
};

export type EngineeringCheckPatterns = {
  test: RegExp;
  staticAnalysis: RegExp;
  build: RegExp;
};

export const defaultEngineeringCheckPatterns: EngineeringCheckPatterns = {
  test: /test/i,
  staticAnalysis: /(lint|typecheck|static)/i,
  build: /build/i,
};

export class DemandRepository implements ArtifactRepository<Demand> {
  constructor(public readonly client: GitHubClient) {}

  async find(id: string): Promise<Demand | undefined> {
    const issueNumber = new GitHubIssueId(id).toNumber();
    const response = await this.client.searchIssues<SearchIssues>(
      `\"#${issueNumber}\" in:body`,
    );
    const cycles = response.items.filter(
      (issue) =>
        issue.body &&
        new DemandIssue(issue.body).demandIssueNumbers().includes(issueNumber),
    );
    if (cycles.length === 0) return undefined;
    if (cycles.length > 1) {
      throw new Error(
        `Demand #${issueNumber} is referenced by multiple Cycle Issues.`,
      );
    }
    return this.restoreDemand(issueNumber, String(cycles[0].number));
  }

  async findByCycle(cycleId: string): Promise<Demand[]> {
    const issueNumber = new GitHubIssueId(cycleId, "Cycle").toNumber();
    const issue = await this.client.getIssue<Issue>(issueNumber);
    return Promise.all(
      new DemandIssue(issue.body ?? "")
        .demandIssueNumbers()
        .map((number) => this.restoreDemand(number, cycleId)),
    );
  }

  async save(_artifact: Demand): Promise<void> {
    throw new Error(
      "DemandRepository is read-only. Demand creation and updates are handled by the process executor.",
    );
  }

  async restoreDemand(issueNumber: number, cycleId: string): Promise<Demand> {
    const issue = await this.client.getIssue<Issue>(issueNumber);
    const body = issue.body ?? "";
    const document = new GitHubIssue(body);
    return new Demand(
      `#${issueNumber}`,
      cycleId,
      document.readSection("### 要求対象", true),
      document.readSection("### 現在状態", true),
      document.readSection("### 期待状態", true),
      document.readSection("### 発生源", true),
      new DemandIssue(body, issueNumber).requirements(),
    );
  }
}

export class RequirementRepository {
  constructor(public readonly demandRepository: ArtifactRepository<Demand>) {}

  async find(id: string): Promise<Requirement | undefined> {
    const match = id.match(/^(#\d+)-[A-Za-z0-9_-]+$/);
    if (!match) throw new Error(`Invalid Requirement ID: ${id}`);
    const demand = await this.demandRepository.find(match[1]);
    return demand?.requirements.find((requirement) => requirement.id === id);
  }

  async findByCycle(cycleId: string): Promise<Requirement[]> {
    return (await this.demandRepository.findByCycle(cycleId)).flatMap(
      ({ requirements }) => requirements,
    );
  }
}

export class ExternalSpecRepository implements ArtifactRepository<ExternalSpec> {
  constructor(
    public readonly client: GitHubClient,
    public readonly demandRepository: ArtifactRepository<Demand>,
  ) {}

  async find(id: string): Promise<ExternalSpec | undefined> {
    const match = id.match(/^#?(\d+)-external-spec$/);
    if (!match) throw new Error(`Invalid ExternalSpec ID: ${id}`);
    return (await this.findByCycle(match[1]))[0];
  }

  async findByCycle(cycleId: string): Promise<ExternalSpec[]> {
    const cycleNumber = new GitHubIssueId(cycleId, "Cycle").toNumber();
    const issue = await this.client.getIssue<Issue>(cycleNumber);
    const demands = await this.demandRepository.findByCycle(cycleId);
    const requirementIds = [
      ...new Set(
        demands.flatMap(({ requirements }) => requirements.map(({ id }) => id)),
      ),
    ];
    const features = await Promise.all(
      new ExternalSpecIssue(issue.body ?? "")
        .featureIssueNumbers()
        .map((number) => this.restoreFeature(number)),
    );
    return [
      new ExternalSpec(`#${cycleNumber}-external-spec`, requirementIds, features),
    ];
  }

  async save(_artifact: ExternalSpec): Promise<void> {
    throw new Error(
      "ExternalSpecRepository is read-only. External design creation and updates are handled by the process executor.",
    );
  }

  async restoreFeature(issueNumber: number): Promise<Feature> {
    const issue = await this.client.getIssue<Issue>(issueNumber);
    const body = issue.body ?? "";
    const document = new GitHubIssue(body);
    const externalDesign = document.readSection("## 外部設計");
    const excluded = document.readSection("## 対象外");
    const detail = externalDesign
      ? [
          `## 外部設計\n\n${externalDesign}`,
          excluded ? `## 対象外\n\n${excluded}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      : "";
    return new Feature(
      `#${issueNumber}`,
      new ExternalSpecIssue(body).requirementIds(),
      detail,
    );
  }
}

export class ImplementationRepository
  implements ArtifactRepository<Implementation>
{
  constructor(
    public readonly client: GitHubClient,
    public readonly externalSpecRepository: ArtifactRepository<ExternalSpec>,
    public readonly checkPatterns: EngineeringCheckPatterns =
      defaultEngineeringCheckPatterns,
  ) {}

  async find(id: string): Promise<Implementation | undefined> {
    const match = id.match(/^#?(\d+)-implementation$/);
    if (!match) throw new Error(`Invalid Implementation ID: ${id}`);
    return (await this.findByCycle(match[1]))[0];
  }

  async findByCycle(cycleId: string): Promise<Implementation[]> {
    const cycleNumber = new GitHubIssueId(cycleId, "Cycle").toNumber();
    const specs = await this.externalSpecRepository.findByCycle(cycleId);
    if (specs.length !== 1) return [];
    const featureIds = specs[0].features.map(({ id }) => id);
    const restored = await Promise.all(
      featureIds.map((id) => this.restoreImplementedFeature(id)),
    );
    return [
      new Implementation(
        `#${cycleNumber}-implementation`,
        featureIds,
        restored.filter(
          (feature): feature is ImplementedFeature => feature !== undefined,
        ),
      ),
    ];
  }

  async save(_artifact: Implementation): Promise<void> {
    throw new Error(
      "ImplementationRepository is read-only. Engineering artifacts are derived from Pull Requests, checks, reviews, and merge state.",
    );
  }

  async restoreImplementedFeature(
    featureId: string,
  ): Promise<ImplementedFeature | undefined> {
    const pullRequest = await this.findLinkedPullRequest(featureId);
    if (!pullRequest) return undefined;
    const [checkRuns, reviews] = await Promise.all([
      this.client.listCheckRuns<{
        check_runs: Array<{ name: string; conclusion: string | null }>;
      }>(pullRequest.head.sha),
      this.client.listPullRequestReviews<Review[]>(pullRequest.number),
    ]);
    const checks = new EngineeringChecks(checkRuns.check_runs);
    return new ImplementedFeature(
      featureId,
      checks.passed(this.checkPatterns.test),
      checks.passed(this.checkPatterns.staticAnalysis),
      checks.passed(this.checkPatterns.build),
      await this.isReviewResolved(pullRequest.number, reviews),
      pullRequest.merged_at !== null,
    );
  }

  async findLinkedPullRequest(featureId: string): Promise<PullRequest | undefined> {
    const featureNumber = new GitHubIssueId(featureId, "Feature").toNumber();
    const response = await this.client.searchPullRequests<SearchIssues>(
      `\"#${featureNumber}\" in:body`,
    );
    const closing = new RegExp(
      `\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${featureNumber}\\b`,
      "i",
    );
    const candidates = response.items.filter(
      (item) => item.pull_request && closing.test(item.body ?? ""),
    );
    const pullRequests = await Promise.all(
      candidates.map(({ number }) =>
        this.client.getPullRequest<PullRequest>(number),
      ),
    );
    const active = pullRequests.filter(
      ({ state, merged_at }) => state === "open" || merged_at !== null,
    );
    if (active.length > 1) {
      throw new Error(
        `${featureId} is linked from multiple active Pull Requests as a closing issue.`,
      );
    }
    return active[0];
  }

  async isReviewResolved(
    pullRequestNumber: number,
    reviews: Review[],
  ): Promise<boolean> {
    const states = new Map<string, string>();
    for (const review of reviews) {
      const login = review.user?.login;
      if (login && review.state !== "COMMENTED") states.set(login, review.state);
    }
    const latest = [...states.values()];
    const threads = await this.client.listPullRequestReviewThreads<ReviewThreads>(
      pullRequestNumber,
    );
    const unresolved =
      threads.repository?.pullRequest?.reviewThreads.nodes.some(
        ({ isResolved }) => !isResolved,
      ) ?? false;
    return (
      latest.includes("APPROVED") &&
      !latest.includes("CHANGES_REQUESTED") &&
      !unresolved
    );
  }
}

export class QAReportRepository implements ArtifactRepository<QAReport> {
  constructor(
    public readonly client: GitHubClient,
    public readonly demandRepository: ArtifactRepository<Demand>,
  ) {}

  async find(id: string): Promise<QAReport | undefined> {
    const match = id.match(/^#?(\d+)-qa-report$/);
    if (!match) throw new Error(`Invalid QAReport ID: ${id}`);
    return (await this.findByCycle(match[1]))[0];
  }

  async findByCycle(cycleId: string): Promise<QAReport[]> {
    const cycleNumber = new GitHubIssueId(cycleId, "Cycle").toNumber();
    const demands = await this.demandRepository.findByCycle(cycleId);
    const requirementIds = [
      ...new Set(
        demands.flatMap(({ requirements }) => requirements.map(({ id }) => id)),
      ),
    ];
    const results = (
      await Promise.all(
        demands.map(async (demand) => {
          const issueNumber = new GitHubIssueId(demand.id).toNumber();
          const issue = await this.client.getIssue<Issue>(issueNumber);
          return new QARequirementIssue(
            issue.body ?? "",
            issueNumber,
          ).verifications();
        }),
      )
    ).flat();
    return [new QAReport(`#${cycleNumber}-qa-report`, requirementIds, results)];
  }

  async save(_artifact: QAReport): Promise<void> {
    throw new Error(
      "QAReportRepository is read-only. QA results are persisted in Requirement Issues by the process executor.",
    );
  }
}

export class ReleaseRepository implements ArtifactRepository<Release> {
  constructor(
    public readonly client: GitHubClient,
    public readonly implementationRepository: ArtifactRepository<Implementation>,
    public readonly qaReportRepository: ArtifactRepository<QAReport>,
  ) {}

  async find(id: string): Promise<Release | undefined> {
    const match = id.match(/^#?(\d+)-release$/);
    if (!match) throw new Error(`Invalid Release ID: ${id}`);
    return (await this.findByCycle(match[1]))[0];
  }

  async findByCycle(cycleId: string): Promise<Release[]> {
    const cycleNumber = new GitHubIssueId(cycleId, "Cycle").toNumber();
    const [implementations, qaReports, issue] = await Promise.all([
      this.implementationRepository.findByCycle(cycleId),
      this.qaReportRepository.findByCycle(cycleId),
      this.client.getIssue<Issue>(cycleNumber),
    ]);
    if (implementations.length !== 1 || qaReports.length !== 1) return [];
    if (
      !new EngineeringGate().verifyStructuralComplete(implementations).passed ||
      !new QAGate().verifyStructuralComplete(qaReports).passed
    ) {
      return [];
    }
    const releaseSection = new GitHubIssue(issue.body ?? "").readSection(
      "## Release",
    );
    const release = new GitHubIssue(releaseSection);
    const version = release.readScalarSection("### Version");
    return [
      new Release(
        `#${cycleNumber}-release`,
        implementations[0].id,
        qaReports[0].id,
        release.readSection("### 対象"),
        release.readSection("### Release Notes"),
        release.readSection("### Release手順"),
        release.readSection("### 検収手順"),
        /^-\s+\[[xX]\]\s+Release完了\s*$/m.test(releaseSection),
        version || undefined,
      ),
    ];
  }

  async save(_artifact: Release): Promise<void> {
    throw new Error(
      "ReleaseRepository is read-only. Release creation and updates are handled by the process executor.",
    );
  }
}

export class AcceptanceReportRepository
  implements ArtifactRepository<AcceptanceReport>
{
  constructor(
    public readonly client: GitHubClient,
    public readonly demandRepository: ArtifactRepository<Demand>,
    public readonly releaseRepository: ArtifactRepository<Release>,
  ) {}

  async find(id: string): Promise<AcceptanceReport | undefined> {
    const match = id.match(/^#?(\d+)-acceptance-report$/);
    if (!match) throw new Error(`Invalid AcceptanceReport ID: ${id}`);
    return (await this.findByCycle(match[1]))[0];
  }

  async findByCycle(cycleId: string): Promise<AcceptanceReport[]> {
    const cycleNumber = new GitHubIssueId(cycleId, "Cycle").toNumber();
    const [demands, releases, issue] = await Promise.all([
      this.demandRepository.findByCycle(cycleId),
      this.releaseRepository.findByCycle(cycleId),
      this.client.getIssue<Issue>(cycleNumber),
    ]);
    if (
      releases.length !== 1 ||
      !new ReleaseGate().verifyStructuralComplete(releases).passed
    ) {
      return [];
    }
    const demandIds = demands.map(({ id }) => id);
    const cycle = new AcceptanceCycleIssue(issue.body ?? "");
    return [
      new AcceptanceReport(
        `#${cycleNumber}-acceptance-report`,
        demandIds,
        cycle.acceptanceResults(demandIds),
        cycle.feedback(),
      ),
    ];
  }

  async save(_artifact: AcceptanceReport): Promise<void> {
    throw new Error(
      "AcceptanceReportRepository is read-only. Acceptance results are persisted in the Cycle Issue by the process executor or requester.",
    );
  }
}

export class StandardCycleRepository
  implements CycleRepository<StandardCycle>
{
  constructor(
    public readonly client: GitHubClient,
    public readonly acceptanceReportRepository: {
      findByCycle(cycleId: string): Promise<AcceptanceReport[]>;
    },
  ) {}

  async create(): Promise<StandardCycle> {
    return this.createCycle();
  }

  async find(id: string): Promise<StandardCycle | undefined> {
    const issueNumber = new GitHubIssueId(id, "Cycle").toNumber();
    try {
      await this.client.getIssue<Issue>(issueNumber);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) return undefined;
      throw error;
    }
    const reports = await this.acceptanceReportRepository.findByCycle(
      String(issueNumber),
    );
    if (!new AcceptanceGate().verifyStructuralComplete(reports).passed) {
      return new StandardCycle(`#${issueNumber}`, "unconfirmed", "unconfirmed");
    }
    const feedback = reports[0].feedback;
    return new StandardCycle(
      `#${issueNumber}`,
      feedback.newDemand ? "exists" : "none",
      feedback.changedDemand ? "exists" : "none",
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
      `is:issue \"#${previousIssueNumber}\" in:body`,
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

export const createStandardCycleFactory = (
  repository: StandardCycleRepository,
): CycleFactory<StandardCycle> =>
  async (previousCycle) => repository.createNext(previousCycle);

export type StandardGitHubRepositories = ReturnType<
  typeof createStandardGitHubRepositories
>;

export const createStandardGitHubRepositories = (client: GitHubClient) => {
  const demandRepository = new DemandRepository(client);
  const requirementRepository = new RequirementRepository(demandRepository);
  const externalSpecRepository = new ExternalSpecRepository(
    client,
    demandRepository,
  );
  const implementationRepository = new ImplementationRepository(
    client,
    externalSpecRepository,
  );
  const qaReportRepository = new QAReportRepository(client, demandRepository);
  const releaseRepository = new ReleaseRepository(
    client,
    implementationRepository,
    qaReportRepository,
  );
  const acceptanceReportRepository = new AcceptanceReportRepository(
    client,
    demandRepository,
    releaseRepository,
  );
  const cycleRepository = new StandardCycleRepository(
    client,
    acceptanceReportRepository,
  );

  return {
    demandRepository,
    requirementRepository,
    externalSpecRepository,
    implementationRepository,
    qaReportRepository,
    releaseRepository,
    acceptanceReportRepository,
    cycleRepository,
    cycleFactory: createStandardCycleFactory(cycleRepository),
  };
};
