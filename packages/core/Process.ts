import type { Artifact, ArtifactRepository } from "./Artifact";
import type { ProcessExecutor } from "./ProcessExecutor";
import type { GatePass, ProcessGate } from "./ProcessGate";

export class Process<TArtifact extends Artifact, TCallInput> {
  constructor({
    name,
    artifactRepository,
    gate,
    executor,
  }: {
    name: string;
    artifactRepository: ArtifactRepository<TArtifact>;
    gate: ProcessGate<TArtifact>;
    executor: ProcessExecutor<TCallInput, TArtifact>;
  }) {
    this.name = name;
    this.artifactRepository = artifactRepository;
    this.gate = gate;
    this.executor = executor;
  }

  public readonly name: string;
  private readonly artifactRepository: ArtifactRepository<TArtifact>;
  private readonly gate: ProcessGate<TArtifact>;
  private readonly executor: ProcessExecutor<TCallInput, TArtifact>;

  async start(cycleId: string): Promise<void> {
    const artifacts = await this.artifactRepository.findByCycle(cycleId);
    await this.executor.call(cycleId, artifacts);
  }

  async verifyComplete(cycleId: string): Promise<GatePass> {
    const artifacts = await this.artifactRepository.findByCycle(cycleId);
    return this.gate.verifyStructuralComplete(artifacts);
  }
}
