import type { Artifact } from "./Artifact";

export interface ExecutionChannel<TMessage> {
  send(message: TMessage): Promise<void>;
}

export class ProcessExecutor<TCallMessage, TArtifact extends Artifact> {
  constructor({
    channel,
    createStartMessage,
    createRetryMessage,
  }: {
    channel: ExecutionChannel<TCallMessage>;
    createStartMessage: (
      cycleId: string,
      artifacts: TArtifact[],
    ) => TCallMessage;
    createRetryMessage: (cycleId: string, errors: string[]) => TCallMessage;
  }) {
    this.channel = channel;
    this.createStartMessage = createStartMessage;
    this.createRetryMessage = createRetryMessage;
  }

  public readonly channel: ExecutionChannel<TCallMessage>;

  public readonly createStartMessage: (
    cycleId: string,
    artifacts: TArtifact[],
  ) => TCallMessage;

  public readonly createRetryMessage: (
    cycleId: string,
    errors: string[],
  ) => TCallMessage;

  async call(input: TCallMessage): Promise<void> {
    await this.channel.send(input);
  }
}
