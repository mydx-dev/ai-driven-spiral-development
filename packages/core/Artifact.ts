export interface Artifact {
  readonly id: string;
}

export interface ArtifactRepository<TArtifact extends Artifact> {
  find(id: string): Promise<TArtifact | undefined>;
  findByCycle(cycleId: string): Promise<TArtifact[]>;
  save(artifact: TArtifact): Promise<void>;
}
