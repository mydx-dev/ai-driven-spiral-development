import type { Artifact } from "./Artifact";

export interface ExecutionChannel<TInput> {
  send(input: TInput): Promise<void>;
}

export class ProcessExecutor<TCallInput, TArtifact extends Artifact> {
  constructor({
    channel,
    createCallInput,
  }: {
    channel: ExecutionChannel<TCallInput>;
    createCallInput: (cycleId: string, artifacts: TArtifact[]) => TCallInput;
  }) {
    this.channel = channel;
    this.createCallInput = createCallInput;
  }

  public readonly channel: ExecutionChannel<TCallInput>;

  public readonly createCallInput: (
    cycleId: string,
    artifacts: TArtifact[],
  ) => TCallInput;

  async call(cycleId: string, artifacts: TArtifact[]): Promise<void> {
    const input = this.createCallInput(cycleId, artifacts);
    await this.channel.send(input);
  }
}
