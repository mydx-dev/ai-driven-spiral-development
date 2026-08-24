import { Artifact, ArtifactRepository } from "./Artifact";
import { Cycle } from "./Cycle";
import type { ProcessExecutor } from "./ProcessExecutor";
import type { GatePass } from "./ProcessGate";
import { ProcessGate } from "./ProcessGate";

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

  async start(cycle: Cycle): Promise<void> {
    const artifacts = await this.artifactRepository.findByCycle(cycle.id);
    await this.executor.call(cycle, artifacts);
  }

  async structuralComplete(cycle: Cycle): Promise<GatePass> {
    const artifacts = await this.artifactRepository.findByCycle(cycle.id);
    const result = this.gate.evaluate(artifacts);
    return result;
  }
}
