import type { Artifact, ArtifactRepository } from "./Artifact";
import type { ProcessExecutor } from "./ProcessExecutor";
import type { GatePass, ProcessGate } from "./ProcessGate";

export class Process<
  const TName extends string,
  TArtifact extends Artifact,
  TCallMessage,
> {
  constructor({
    name,
    artifactRepository,
    gate,
    executor,
  }: {
    name: TName;
    artifactRepository: ArtifactRepository<TArtifact>;
    gate: ProcessGate<TArtifact>;
    executor: ProcessExecutor<TCallMessage, TArtifact>;
  }) {
    this.name = name;
    this.artifactRepository = artifactRepository;
    this.gate = gate;
    this.executor = executor;
  }

  public readonly name: TName;
  private readonly artifactRepository: ArtifactRepository<TArtifact>;
  private readonly gate: ProcessGate<TArtifact>;
  private readonly executor: ProcessExecutor<TCallMessage, TArtifact>;

  async start(cycleId: string): Promise<void> {
    const artifacts = await this.artifactRepository.findByCycle(cycleId);
    const message = this.executor.createStartMessage(cycleId, artifacts);
    await this.executor.call(message);
  }

  async verifyComplete(cycleId: string): Promise<GatePass> {
    try {
      const artifacts = await this.artifactRepository.findByCycle(cycleId);
      return this.gate.verifyStructuralComplete(artifacts);
    } catch (error) {
      return {
        passed: false,
        errors: [
          "Process Gate verification failed due to an unexpected error.",
          error instanceof Error ? error.message : String(error),
        ],
      };
    }
  }

  async retry(cycleId: string, errors: string[]): Promise<void> {
    const retryMessage = this.executor.createRetryMessage(cycleId, errors);
    await this.executor.call(retryMessage);
  }
}
