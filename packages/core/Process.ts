import type { Artifact, ArtifactRepository } from "./Artifact";
import type { ProcessExecutor } from "./ProcessExecutor";
import type { GatePass, ProcessGate } from "./ProcessGate";

export class Process<TArtifact extends Artifact, TCallMessage> {
  constructor({
    name,
    artifactRepository,
    gate,
    executor,
  }: {
    name: string;
    artifactRepository: ArtifactRepository<TArtifact>;
    gate: ProcessGate<TArtifact>;
    executor: ProcessExecutor<TCallMessage, TArtifact>;
  }) {
    this.name = name;
    this.artifactRepository = artifactRepository;
    this.gate = gate;
    this.executor = executor;
  }

  public readonly name: string;
  private readonly artifactRepository: ArtifactRepository<TArtifact>;
  private readonly gate: ProcessGate<TArtifact>;
  private readonly executor: ProcessExecutor<TCallMessage, TArtifact>;

  async start(cycleId: string): Promise<void> {
    const artifacts = await this.artifactRepository.findByCycle(cycleId);
    const message = this.executor.createStartMessage(cycleId, artifacts);
    await this.executor.call(message);
  }

  async verifyComplete(cycleId: string): Promise<GatePass<TArtifact>> {
    const artifacts = await this.artifactRepository.findByCycle(cycleId);
    const result = this.gate.verifyStructuralComplete(artifacts);
    return result;
  }

  async retry(
    cycleId: string,
    artifacts: TArtifact[],
    errors: string[],
  ): Promise<void> {
    const retryMessage = this.executor.createRetryMessage(
      cycleId,
      artifacts,
      errors,
    );
    await this.executor.call(retryMessage);
  }
}
