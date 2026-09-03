import {
  ImplementedSoftwareElements,
  IntegratedSoftware,
  type ImplementedSoftwareElementsRepository,
  type IntegratedSoftwareRepository,
  type SoftwareArchitectureDescriptionRepository,
  type SoftwareElementDesignRepository,
} from "@mydx-dev/spiral-standard";
import type { GitHubClient } from "@mydx-dev/spiral-github";

type SearchIssues = {
  readonly items: Array<{
    readonly number: number;
    readonly pull_request?: unknown;
  }>;
};

type PullRequest = {
  readonly number: number;
  readonly state: string;
  readonly merged_at: string | null;
  readonly merge_commit_sha: string | null;
  readonly head: { readonly sha: string };
  readonly base: { readonly ref: string };
};

type PullRequestFile = { readonly filename: string; readonly status: string };
type CheckRuns = {
  readonly check_runs: Array<{
    readonly name: string;
    readonly conclusion: string | null;
    readonly details_url?: string | null;
  }>;
};
type Repository = { readonly default_branch: string };
type Branch = { readonly commit: { readonly sha: string } };
type WorkflowRuns = {
  readonly workflow_runs: Array<{
    readonly id: number;
    readonly name: string;
    readonly conclusion: string | null;
    readonly head_sha: string;
    readonly html_url?: string;
  }>;
};

const implementationId = (cycleId: string) =>
  `${cycleId}-implemented-software-elements`;
const integrationId = (cycleId: string) => `${cycleId}-integrated-software`;
const passed = (conclusion: string | null) => conclusion === "success";
const checkKind = (name: string) => {
  if (/(unit|local|test)/i.test(name)) return "local" as const;
  if (/(lint|typecheck|static|quality|complexity|guard)/i.test(name)) {
    return "quality-guard" as const;
  }
  if (/build/i.test(name)) return "build" as const;
  return "ci" as const;
};

export class GitHubImplementedSoftwareElementsRepository implements ImplementedSoftwareElementsRepository {
  constructor(
    public readonly client: GitHubClient,
    public readonly designs: SoftwareElementDesignRepository,
  ) {}

  async find(id: string): Promise<ImplementedSoftwareElements | undefined> {
    const suffix = "-implemented-software-elements";
    if (!id.endsWith(suffix)) return undefined;
    return (await this.findByCycle(id.slice(0, -suffix.length)))[0];
  }

  async findByCycle(cycleId: string): Promise<ImplementedSoftwareElements[]> {
    const designs = await this.designs.findByCycle(cycleId);
    if (designs.length === 0) return [];

    const elements = await Promise.all(
      designs.map(async (design) => {
        const response = await this.client.searchPullRequests<SearchIssues>(
          `"${design.id}" in:body`,
        );
        const pullRequests = await Promise.all(
          response.items
            .filter((item) => item.pull_request)
            .map(({ number }) =>
              this.client.getPullRequest<PullRequest>(number),
            ),
        );
        const candidates = pullRequests.filter(
          (pullRequest) =>
            pullRequest.state === "open" || pullRequest.merged_at !== null,
        );
        const pullRequest = candidates.at(-1);
        if (!pullRequest) {
          return {
            id: design.architectureElement.elementId,
            elementDesign: { designId: design.id },
            artifactReferences: [],
            checks: [],
            knownConstraints: [],
            unimplementedItems: [
              "Pull Request / implementation evidence not found",
            ],
          };
        }

        const [files, checks] = await Promise.all([
          this.client.request<PullRequestFile[]>(
            "GET",
            this.client.repositoryPath(`/pulls/${pullRequest.number}/files`),
          ),
          this.client.listCheckRuns<CheckRuns>(pullRequest.head.sha),
        ]);
        return {
          id: design.architectureElement.elementId,
          elementDesign: { designId: design.id },
          artifactReferences: [
            `pr:#${pullRequest.number}`,
            `commit:${pullRequest.head.sha}`,
            ...files.map(({ filename }) => `source:${filename}`),
          ],
          checks: checks.check_runs.map((check) => ({
            name: check.name,
            kind: checkKind(check.name),
            passed: passed(check.conclusion),
            details: check.details_url ?? null,
          })),
          knownConstraints: [],
          unimplementedItems:
            pullRequest.merged_at === null
              ? ["implementation PR is not merged"]
              : [],
        };
      }),
    );

    return [
      new ImplementedSoftwareElements(
        implementationId(cycleId),
        cycleId,
        elements,
      ),
    ];
  }
}

export class GitHubIntegratedSoftwareRepository implements IntegratedSoftwareRepository {
  constructor(
    public readonly client: GitHubClient,
    public readonly implementations: ImplementedSoftwareElementsRepository,
    public readonly architectures: SoftwareArchitectureDescriptionRepository,
  ) {}

  async find(id: string): Promise<IntegratedSoftware | undefined> {
    const suffix = "-integrated-software";
    if (!id.endsWith(suffix)) return undefined;
    return (await this.findByCycle(id.slice(0, -suffix.length)))[0];
  }

  async findByCycle(cycleId: string): Promise<IntegratedSoftware[]> {
    const [implementations, architectures, repository] = await Promise.all([
      this.implementations.findByCycle(cycleId),
      this.architectures.findByCycle(cycleId),
      this.client.request<Repository>("GET", this.client.repositoryPath("")),
    ]);
    if (implementations.length !== 1 || architectures.length !== 1) return [];

    const implementation = implementations[0];
    const architecture = architectures[0];
    const branch = await this.client.request<Branch>(
      "GET",
      this.client.repositoryPath(
        `/branches/${encodeURIComponent(repository.default_branch)}`,
      ),
    );
    const [checks, runs] = await Promise.all([
      this.client.listCheckRuns<CheckRuns>(branch.commit.sha),
      this.client.listWorkflowRuns<WorkflowRuns>(repository.default_branch),
    ]);
    const successfulChecks = checks.check_runs.filter((check) =>
      passed(check.conclusion),
    );
    const successfulRuns = runs.workflow_runs.filter(
      (run) => run.head_sha === branch.commit.sha && passed(run.conclusion),
    );
    const integrationTests = successfulChecks.filter((check) =>
      /(integration|e2e|contract)/i.test(check.name),
    );
    const buildChecks = successfulChecks.filter((check) =>
      /build/i.test(check.name),
    );
    const evidence = [
      ...integrationTests.map(
        (check) => `integration-test:${check.name}:success`,
      ),
      ...successfulChecks.map((check) => `ci:${check.name}:success`),
      ...buildChecks.map((check) => `build:${check.name}:success`),
      ...successfulRuns.map((run) => `workflow:${run.name}:success`),
    ];
    const relationshipEvidence =
      evidence.length > 0 ? evidence : [`commit:${branch.commit.sha}`];

    return [
      new IntegratedSoftware(
        integrationId(cycleId),
        cycleId,
        (implementation.elements ?? []).map((element) => ({
          implementationId: implementation.id,
          elementId: element.id,
        })),
        (architecture.relationships ?? []).map((relationship) => ({
          architectureId: architecture.id,
          sourceElementId: relationship.sourceElementId,
          targetElementId: relationship.targetElementId,
          type: relationship.type,
          evidence: relationshipEvidence,
        })),
        (architecture.interfaces ?? []).map((softwareInterface) => ({
          architectureId: architecture.id,
          interfaceId: softwareInterface.id,
          evidence: relationshipEvidence,
        })),
        [
          `branch:${repository.default_branch}@${branch.commit.sha}`,
          ...successfulRuns.map((run) => `workflow-run:${run.id}`),
        ],
        evidence,
        [
          ...(integrationTests.length === 0
            ? ["integration test evidence not found"]
            : []),
          ...(buildChecks.length === 0
            ? ["integrated build evidence not found"]
            : []),
        ],
      ),
    ];
  }
}
