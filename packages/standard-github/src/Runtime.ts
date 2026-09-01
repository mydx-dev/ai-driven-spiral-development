import {
  type Artifact,
  type ArtifactRepository,
  type CycleRepository,
  type ExecutionChannel,
  type GatePass,
  Process,
  ProcessExecutor,
  type ProcessGate,
  SemanticCompletionEvent,
  Spiral,
} from "@mydx-dev/ai-driven-spiral-development";
import {
  configureStandardCycle,
  ImplementationGate,
  ImplementedSoftwareElements,
  IntegrationGate,
  IntegratedSoftware,
  RequirementsGate,
  SoftwareRequirementsGate,
  StakeholderRequirementsSpecification,
  StandardCycle,
  standardFeedbackName,
  standardProcessNames,
  standardStageNames,
  SystemRequirementsGate,
  ValidationGate,
  ValidationResult,
  VerificationGate,
  VerificationResult,
} from "@mydx-dev/spiral-standard";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  CompositeArtifactRepository,
  createStandardRuntimeRepositories,
} from "./RuntimeRepositories.js";
import { standardArtifactIssueCodecsByStage } from "./StandardArtifactIssueCodecs.js";

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
  { readonly status: "processed" } | { readonly status: "duplicate" };

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
  repository: CycleRepository<StandardCycle> & {
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

const artifactGate = <TArtifact extends Artifact>(
  ArtifactDefinition: new (...args: never[]) => TArtifact,
  gate: ProcessGate<TArtifact>,
): ProcessGate<Artifact> => ({
  verifyStructuralComplete: (artifacts) =>
    gate.verifyStructuralComplete(
      artifacts.filter(
        (artifact): artifact is TArtifact =>
          artifact instanceof ArtifactDefinition,
      ),
    ),
});

const compositeRepository = (
  ...repositories: ArtifactRepository<Artifact>[]
): CompositeArtifactRepository => new CompositeArtifactRepository(repositories);

export const createStandardGitHubRuntime = ({
  client,
  channel,
}: {
  client: GitHubClient;
  channel: ExecutionChannel<StandardGitHubExecutionMessage>;
}) => {
  const repositories = createStandardRuntimeRepositories(client);

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

      const [
        stakeholderSpecifications,
        systemSpecifications,
        systemArchitectures,
        softwareSpecifications,
        softwareArchitectures,
        elementDesigns,
        implementations,
        integrations,
        verifications,
      ] = await Promise.all([
        repositories.stakeholderRequirementsRepository.findByCycle(cycleId),
        repositories.systemRequirementsRepository.findByCycle(cycleId),
        repositories.systemArchitectureDescriptionRepository.findByCycle(
          cycleId,
        ),
        repositories.softwareRequirementsRepository.findByCycle(cycleId),
        repositories.softwareArchitectureDescriptionRepository.findByCycle(
          cycleId,
        ),
        repositories.softwareElementDesignRepository.findByCycle(cycleId),
        repositories.implementedSoftwareElementsRepository.findByCycle(cycleId),
        repositories.integratedSoftwareRepository.findByCycle(cycleId),
        repositories.verificationResultRepository.findByCycle(cycleId),
      ]);

      const requirementsGate = new RequirementsGate();
      const systemRequirementsGate = new SystemRequirementsGate();
      const softwareRequirementsGate = new SoftwareRequirementsGate(
        systemArchitectures,
        systemSpecifications,
      );
      const implementationGate = artifactGate(
        ImplementedSoftwareElements,
        new ImplementationGate(softwareArchitectures, elementDesigns),
      );
      const integrationGate = new IntegrationGate(
        softwareArchitectures,
        elementDesigns,
        implementations,
      );
      const verificationGate = new VerificationGate(
        softwareSpecifications,
        integrations,
      );
      const validationGate = new ValidationGate(
        stakeholderSpecifications,
        systemSpecifications,
        softwareSpecifications,
        verifications,
      );

      const requirementsRepository =
        repositories.stakeholderRequirementsRepository;
      const systemRequirementsRepository = compositeRepository(
        repositories.systemRequirementsRepository,
        repositories.systemArchitectureDescriptionRepository,
      );
      const softwareRequirementsRepository = compositeRepository(
        repositories.softwareRequirementsRepository,
        repositories.softwareArchitectureDescriptionRepository,
      );
      const implementationRepository = compositeRepository(
        repositories.softwareElementDesignRepository,
        repositories.implementedSoftwareElementsRepository,
      );

      const requirements = new Process({
        name: "要求定義",
        artifactRepository: requirementsRepository,
        gate: requirementsGate,
        executor: createExecutor<StakeholderRequirementsSpecification>(
          "要求定義",
          eventId,
          channel,
        ),
      });
      const systemRequirements = new Process({
        name: "システム要件定義",
        artifactRepository: systemRequirementsRepository,
        gate: systemRequirementsGate,
        executor: createExecutor<Artifact>(
          "システム要件定義",
          eventId,
          channel,
        ),
      });
      const softwareRequirements = new Process({
        name: "ソフトウェア要件定義",
        artifactRepository: softwareRequirementsRepository,
        gate: softwareRequirementsGate,
        executor: createExecutor<Artifact>(
          "ソフトウェア要件定義",
          eventId,
          channel,
        ),
      });
      const implementation = new Process({
        name: "実装",
        artifactRepository: implementationRepository,
        gate: implementationGate,
        executor: createExecutor<Artifact>("実装", eventId, channel),
      });
      const integration = new Process({
        name: "統合",
        artifactRepository: repositories.integratedSoftwareRepository,
        gate: integrationGate,
        executor: createExecutor<IntegratedSoftware>("統合", eventId, channel),
      });
      const qa = new Process({
        name: "QA",
        artifactRepository: repositories.verificationResultRepository,
        gate: verificationGate,
        executor: createExecutor<VerificationResult>("QA", eventId, channel),
      });
      const validation = new Process({
        name: "検収",
        artifactRepository: repositories.validationResultRepository,
        gate: validationGate,
        executor: createExecutor<ValidationResult>("検収", eventId, channel),
      });

      const CycleDefinition = configureStandardCycle({
        requirements,
        systemRequirements,
        softwareRequirements,
        implementation,
        integration,
        verification: qa,
        validation,
      });

      const event = new SemanticCompletionEvent({
        cycleId,
        name,
        cycleDefinition: CycleDefinition,
      });

      if (!event.isCycleCompletion()) {
        const stage = event.name as StandardGitHubProcessName;
        const stageEvaluation: Record<
          StandardGitHubProcessName,
          {
            readonly artifacts: readonly Artifact[];
            readonly gate: ProcessGate<Artifact>;
          }
        > = {
          要求定義: {
            artifacts: stakeholderSpecifications,
            gate: requirementsGate,
          },
          システム要件定義: {
            artifacts: [...systemSpecifications, ...systemArchitectures],
            gate: systemRequirementsGate,
          },
          ソフトウェア要件定義: {
            artifacts: [...softwareSpecifications, ...softwareArchitectures],
            gate: softwareRequirementsGate,
          },
          実装: {
            artifacts: [...elementDesigns, ...implementations],
            gate: implementationGate,
          },
          統合: {
            artifacts: integrations,
            gate: artifactGate(IntegratedSoftware, integrationGate),
          },
          QA: {
            artifacts: verifications,
            gate: artifactGate(VerificationResult, verificationGate),
          },
          検収: {
            artifacts:
              await repositories.validationResultRepository.findByCycle(
                cycleId,
              ),
            gate: artifactGate(ValidationResult, validationGate),
          },
        };
        const evaluation = stageEvaluation[stage];
        const gateResult: GatePass = evaluation.gate.verifyStructuralComplete([
          ...evaluation.artifacts,
        ]);
        const artifactIds = evaluation.artifacts.map(({ id }) => id);

        if (artifactIds.length > 0) {
          if (standardArtifactIssueCodecsByStage[stage].length > 1) {
            await repositories.stakeholderRequirementsRepository.saveCompositeGateResult(
              {
                processName: stage,
                artifactIds,
                gateResult,
              },
            );
          } else {
            const writer = {
              要求定義: repositories.stakeholderRequirementsRepository,
              統合: repositories.integratedSoftwareRepository,
              QA: repositories.verificationResultRepository,
              検収: repositories.validationResultRepository,
            }[stage as "要求定義" | "統合" | "QA" | "検収"];
            if (writer) {
              await Promise.all(
                artifactIds.map((artifactId) =>
                  writer.saveGateResult(artifactId, gateResult),
                ),
              );
            }
          }
        }
      }

      const { cycleRepository, cycleFactory } = routedCycleRepository(
        repositories.cycleRepository,
        CycleDefinition,
      );
      const spiral = new Spiral<typeof CycleDefinition>({
        cycleRepository,
        cycleFactory,
      });

      await spiral.circulate(event);
      await recordSemanticCompletion(client, issueNumber, marker, name);
      return { status: "processed" };
    },
  };
};
