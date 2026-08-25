import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Artifact } from "./Artifact";
import { type ExecutionChannel, ProcessExecutor } from "./ProcessExecutor";

class CustomArtifact implements Artifact {
  constructor(
    public readonly id: string,
    public readonly value: string,
  ) {}
}

class CustomExecutionChannel implements ExecutionChannel<string> {
  async send(message: string): Promise<void> {}
}

describe("プロセス実行者", () => {
  it("任意の入力型に対する実行チャンネルを利用側で実装できる", () => {
    expectTypeOf<CustomExecutionChannel>().toMatchTypeOf<
      ExecutionChannel<string>
    >();
  });

  it("任意のメッセージ型で実行者を呼び出せる", () => {
    expectTypeOf<
      Parameters<ProcessExecutor<string, CustomArtifact>["call"]>[0]
    >().toEqualTypeOf<string>();

    type CustomCallMessage = {
      text: string;
    };

    expectTypeOf<
      Parameters<ProcessExecutor<CustomCallMessage, CustomArtifact>["call"]>[0]
    >().toEqualTypeOf<CustomCallMessage>();
  });

  it("サイクルIDとアーティファクトから開始メッセージを生成する", async () => {
    const createStartMessage = vi.fn(
      (cycleId: string, artifacts: CustomArtifact[]) =>
        `${cycleId}:${artifacts.map((artifact) => artifact.id).join(",")}`,
    );

    const executor = new ProcessExecutor<string, CustomArtifact>({
      channel: {
        send: vi.fn(),
      },
      createStartMessage,
      createRetryMessage: vi.fn(),
    });

    const artifacts = [
      new CustomArtifact("artifact-1", "foo"),
      new CustomArtifact("artifact-2", "bar"),
    ];

    const message = executor.createStartMessage("cycle-1", artifacts);

    expect(message).toEqual("cycle-1:artifact-1,artifact-2");
  });

  it("サイクルID、エラーメッセージからリトライメッセージを生成する", async () => {
    const createRetryMessage = vi.fn(
      (cycleId: string, errors: string[]) => `${cycleId}:${errors.join(",")}`,
    );

    const executor = new ProcessExecutor<string, CustomArtifact>({
      channel: {
        send: vi.fn(),
      },
      createStartMessage: vi.fn(),
      createRetryMessage,
    });

    const artifacts = [
      new CustomArtifact("artifact-1", "foo"),
      new CustomArtifact("artifact-2", "bar"),
    ];

    const message = executor.createRetryMessage("cycle-1", [
      "error-1",
      "error-2",
    ]);

    expect(message).toEqual("cycle-1:error-1,error-2");
  });
});
