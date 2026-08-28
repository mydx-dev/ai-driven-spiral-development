import {
  type Artifact,
  type ExecutionChannel,
  Process,
  ProcessExecutor,
  SemanticCompletionEvent,
  Spiral,
  type CycleRepository,
} from "@mydx-dev/ai-driven-spiral-development";
import {
  AcceptanceGate,
  type AcceptanceReport,
  DemandDefinitionGate,
  type Demand,
  EngineeringGate,
  type ExternalSpec,
  ExternalDesignGate,
  type Implementation,
  QAGate,
  type QAReport,
  ReleaseGate,
  type Release,
  RequirementDefinitionGate,
  StandardCycle,
} from "@mydx-dev/spiral-standard";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import { createStandardGitHubRepositories } from "./Repositories.js";

export const standardGitHubProcessNames = [
  "Demand Definition",
  "Requirement Definition",
  "External Design",
  "Engineering",
  "QA",
  "Release",
  "Acceptance",
] as const;

export type StandardGitHubProcessName =
  (typeof standardGitHubProcessNames)[number];

export type StandardGitHubExecutionMessage =
  | {
      readonly type: "start";
      readonly cycleId: string;
      readonly processName: StandardGitHubProcessName;
    }
  | {
      readonly type: "retry";
      readonly cycleId: string;
      readonly processName: StandardGitHubProcessName;
      readonly errors: string[];
    };

export type StandardGitHubCirculateResult =
  { readonly status: "processed" } | { readonly status: "duplicate" };

type IssueComment = {
  readonly body: string | null;
};

const createExecutor = <TArtifact extends Artifact>(
  processName: StandardGitHubProcessName,
  channel: ExecutionChannel<StandardGitHubExecutionMessage>,
) =>
  new ProcessExecutor<StandardGitHubExecutionMessage, TArtifact>({
    channel,
    createStartMessage: (cycleId) => ({
      type: "start",
      cycleId,
      processName,
    }),
    createRetryMessage: (cycleId, errors) => ({
      type: "retry",
      cycleId,
      processName,
      errors,
    }),
  });

const routedCycleRepository = <TCycle extends StandardCycle>(
  repository: {
    create(): Promise<StandardCycle>;
    find(id: string): Promise<StandardCycle | undefined>;
    save(cycle: StandardCycle): Promise<void>;
    createNext(previousCycle: StandardCycle): Promise<StandardCycle>;
  },
  CycleDefinition: new (
    id: string,
    newDemand: StandardCycle["newDemand"],
    changedDemand: StandardCycle["changedDemand"],
  ) => TCycle,
): {
  cycleRepository: CycleRepository<TCycle>;
  cycleFactory: (previousCycle: TCycle) => Promise<TCycle>;
} => {
  const restore = (cycle: StandardCycle) =>
    new CycleDefinition(cycle.id, cycle.newDemand, cycle.changedDemand);

  return {
    cycleRepository: {
      create: async () => restore(await repository.create()),
      find: async (id) => {
        const cycle = await repository.find(id);
        return cycle ? restore(cycle) : undefined;
      },
      save: (cycle) => repository.save(cycle),
    },
    cycleFactory: async (previousCycle) =>
      restore(await repository.createNext(previousCycle)),
  };
};

const cycleIssueNumber = (cycleId: string) => {
  const normalized = cycleId.replace(/^#/, "");
  const issueNumber = Number(normalized);
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) {
    throw new Error(`Invalid Standard GitHub cycle id: ${cycleId}`);
  }
  return issueNumber;
};

const semanticCompletionMarker = (eventId: string) => {
  const normalized = eventId.trim();
  if (!normalized) {
    throw new Error("Semantic Completion event id is required.");
  }
  return `<!-- spiral-semantic-completion:${encodeURIComponent(
    normalized,
  )} -->`;
};

const semanticCompletionAlreadyProcessed = async (
  client: GitHubClient,
  issueNumber: number,
  marker: string,
) => {
  for (let page = 1; ; page += 1) {
    const comments = await client.request<IssueComment[]>(
      "GET",
      client.repositoryPath(`/issues/${issueNumber}/comments`),
      undefined,
      { per_page: "100", page: String(page) },
    );
    if (comments.some(({ body }) => body?.includes(marker))) return true;
    if (comments.length < 100) return false;
  }
};

const recordSemanticCompletion = (
  client: GitHubClient,
  issueNumber: number,
  marker: string,
  name: string,
) =>
  client.request(
    "POST",
    client.repositoryPath(`/issues/${issueNumber}/comments`),
    {
      body: `${marker}\nSemantic Completion processed: \`${name}\``,
    },
  );

export const createStandardGitHubRuntime = ({
  client,
  channel,
}: {
  client: GitHubClient;
  channel: ExecutionChannel<StandardGitHubExecutionMessage>;
}) => {
  const repositories = createStandardGitHubRepositories(client);

  const demandDefinition = new Process({
    name: "Demand Definition",
    artifactRepository: repositories.demandRepository,
    gate: new DemandDefinitionGate(),
    executor: createExecutor<Demand>("Demand Definition", channel),
  });
  const requirementDefinition = new Process({
    name: "Requirement Definition",
    artifactRepository: repositories.demandRepository,
    gate: new RequirementDefinitionGate(),
    executor: createExecutor<Demand>("Requirement Definition", channel),
  });
  const externalDesign = new Process({
    name: "External Design",
    artifactRepository: repositories.externalSpecRepository,
    gate: new ExternalDesignGate(),
    executor: createExecutor<ExternalSpec>("External Design", channel),
  });
  const engineering = new Process({
    name: "Engineering",
    artifactRepository: repositories.implementationRepository,
    gate: new EngineeringGate(),
    executor: createExecutor<Implementation>("Engineering", channel),
  });
  const qa = new Process({
    name: "QA",
    artifactRepository: repositories.qaReportRepository,
    gate: new QAGate(),
    executor: createExecutor<QAReport>("QA", channel),
  });
  const release = new Process({
    name: "Release",
    artifactRepository: repositories.releaseRepository,
    gate: new ReleaseGate(),
    executor: createExecutor<Release>("Release", channel),
  });
  const acceptance = new Process({
    name: "Acceptance",
    artifactRepository: repositories.acceptanceReportRepository,
    gate: new AcceptanceGate(),
    executor: createExecutor<AcceptanceReport>("Acceptance", channel),
  });

  class StandardGitHubCycle extends StandardCycle {}

  const CycleDefinition = StandardGitHubCycle.route(demandDefinition)
    .route(requirementDefinition)
    .route(externalDesign)
    .route(engineering)
    .route(qa)
    .route(release)
    .route(acceptance);

  const { cycleRepository, cycleFactory } = routedCycleRepository(
    repositories.cycleRepository,
    CycleDefinition,
  );
  const spiral = new Spiral<typeof CycleDefinition>({
    cycleRepository,
    cycleFactory,
  });

  return {
    repositories,
    async circulate({
      cycleId,
      name,
      eventId,
    }: {
      cycleId: string;
      name: string;
      eventId: string;
    }): Promise<StandardGitHubCirculateResult> {
      const marker = semanticCompletionMarker(eventId);
      const issueNumber = cycleIssueNumber(cycleId);
      if (
        await semanticCompletionAlreadyProcessed(client, issueNumber, marker)
      ) {
        return { status: "duplicate" };
      }

      const event = new SemanticCompletionEvent({
        cycleId,
        name,
        cycleDefinition: CycleDefinition,
      });
      await spiral.circulate(event);
      await recordSemanticCompletion(client, issueNumber, marker, name);
      return { status: "processed" };
    },
  };
};
