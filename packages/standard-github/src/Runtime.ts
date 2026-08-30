import {
  type Artifact,
  type CycleRepository,
  type ExecutionChannel,
  Process,
  ProcessExecutor,
  SemanticCompletionEvent,
  Spiral,
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
  RequirementDefinitionGate,
  StandardCycle,
  standardFeedbackName,
  standardProcessNames,
  standardStageNames,
} from "@mydx-dev/spiral-standard";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import { createStandardGitHubRepositories } from "./Repositories.js";

export const standardGitHubProcessNames = standardProcessNames;
export const standardGitHubStageNames = standardStageNames;
export const standardGitHubFeedbackName = standardFeedbackName;

export type StandardGitHubProcessName =
  (typeof standardGitHubProcessNames)[number];
export type StandardGitHubStageName = (typeof standardGitHubStageNames)[number];

export type StandardGitHubExecutionMessage =
  | {
      readonly type: "start";
      readonly idempotencyKey: string;
      readonly cycleId: string;
      readonly processName: StandardGitHubProcessName;
    }
  | {
      readonly type: "retry";
      readonly idempotencyKey: string;
      readonly cycleId: string;
      readonly processName: StandardGitHubProcessName;
      readonly errors: string[];
    };

export type StandardGitHubCirculateResult =
  | { readonly status: "processed" }
  | { readonly status: "duplicate" };

type IssueComment = {
  readonly body: string | null;
};

const executionIdempotencyKey = (
  eventId: string,
  type: StandardGitHubExecutionMessage["type"],
  cycleId: string,
  processName: StandardGitHubProcessName,
) =>
  [eventId, type, cycleId, processName]
    .map((value) => encodeURIComponent(value))
    .join(":");

const createExecutor = <TArtifact extends Artifact>(
  processName: StandardGitHubProcessName,
  eventId: string,
  channel: ExecutionChannel<StandardGitHubExecutionMessage>,
) =>
  new ProcessExecutor<StandardGitHubExecutionMessage, TArtifact>({
    channel,
    createStartMessage: (cycleId) => ({
      type: "start",
      idempotencyKey: executionIdempotencyKey(
        eventId,
        "start",
        cycleId,
        processName,
      ),
      cycleId,
      processName,
    }),
    createRetryMessage: (cycleId, errors) => ({
      type: "retry",
      idempotencyKey: executionIdempotencyKey(
        eventId,
        "retry",
        cycleId,
        processName,
      ),
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
    newInformation: StandardCycle["newInformation"],
    changedInformation: StandardCycle["changedInformation"],
  ) => TCycle,
): {
  cycleRepository: CycleRepository<TCycle>;
  cycleFactory: (previousCycle: TCycle) => Promise<TCycle>;
} => {
  const restore = (cycle: StandardCycle) =>
    new CycleDefinition(
      cycle.id,
      cycle.newInformation,
      cycle.changedInformation,
    );

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

      // The concrete GitHub Artifact mapping remains a compatibility layer until
      // Issue #58 replaces it with the 8-stage Artifact repositories. Public
      // Process names and Semantic Completion schema already use the 8-stage model.
      const requirements = new Process({
        name: "要求定義",
        artifactRepository: repositories.demandRepository,
        gate: new DemandDefinitionGate(),
        executor: createExecutor<Demand>("要求定義", eventId, channel),
      });
      const systemRequirements = new Process({
        name: "システム要件定義",
        artifactRepository: repositories.demandRepository,
        gate: new RequirementDefinitionGate(),
        executor: createExecutor<Demand>(
          "システム要件定義",
          eventId,
          channel,
        ),
      });
      const softwareRequirements = new Process({
        name: "ソフトウェア要件定義",
        artifactRepository: repositories.externalSpecRepository,
        gate: new ExternalDesignGate(),
        executor: createExecutor<ExternalSpec>(
          "ソフトウェア要件定義",
          eventId,
          channel,
        ),
      });
      const implementation = new Process({
        name: "実装",
        artifactRepository: repositories.implementationRepository,
        gate: new EngineeringGate(),
        executor: createExecutor<Implementation>("実装", eventId, channel),
      });
      const integration = new Process({
        name: "統合",
        artifactRepository: repositories.implementationRepository,
        gate: new EngineeringGate(),
        executor: createExecutor<Implementation>("統合", eventId, channel),
      });
      const qa = new Process({
        name: "QA",
        artifactRepository: repositories.qaReportRepository,
        gate: new QAGate(),
        executor: createExecutor<QAReport>("QA", eventId, channel),
      });
      const validation = new Process({
        name: "検収",
        artifactRepository: repositories.acceptanceReportRepository,
        gate: new AcceptanceGate(),
        executor: createExecutor<AcceptanceReport>("検収", eventId, channel),
      });

      class StandardGitHubCycle extends StandardCycle {}

      const CycleDefinition = StandardGitHubCycle.route(requirements)
        .route(systemRequirements)
        .route(softwareRequirements)
        .route(implementation)
        .route(integration)
        .route(qa)
        .route(validation);

      const { cycleRepository, cycleFactory } = routedCycleRepository(
        repositories.cycleRepository,
        CycleDefinition,
      );
      const spiral = new Spiral<typeof CycleDefinition>({
        cycleRepository,
        cycleFactory,
      });
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
