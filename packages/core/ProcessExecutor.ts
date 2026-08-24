import type { Artifact } from "./Artifact";
import { Cycle } from "./Cycle";

export interface ExecutionChannel<TInput> {
  send(input: TInput): Promise<void>;
}

export class ProcessExecutor<TCallInput, TArtifact extends Artifact> {
  constructor({
    channel,
    createCallInput,
  }: {
    channel: ExecutionChannel<TCallInput>;
    createCallInput: (cycle: Cycle, artifacts: TArtifact[]) => TCallInput;
  }) {
    this.channel = channel;
    this.createCallInput = createCallInput;
  }

  public readonly channel: ExecutionChannel<TCallInput>;

  public readonly createCallInput: (
    cycle: Cycle,
    artifacts: TArtifact[],
  ) => TCallInput;

  async call(cycle: Cycle, artifacts: TArtifact[]): Promise<void> {
    const input = this.createCallInput(cycle, artifacts);
    await this.channel.send(input);
  }
}
