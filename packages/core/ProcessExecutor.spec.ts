import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { Artifact } from "./Artifact";
import type { Cycle } from "./Cycle";
import { type ExecutionChannel, ProcessExecutor } from "./ProcessExecutor";

class CustomArtifact implements Artifact {
  constructor(
    public readonly id: string,
    public readonly value: string,
  ) {}
}

class CustomExecutionChannel implements ExecutionChannel<string> {
  async send(input: string): Promise<void> {}
}

describe("プロセス実行者", () => {
  it("任意の入力型に対する実行チャンネルを利用側で実装できる", () => {
    expectTypeOf<CustomExecutionChannel>().toMatchTypeOf<
      ExecutionChannel<string>
    >();
  });

  it("サイクルとアーティファクトを元に、呼び出し入力を生成できる", () => {
    expectTypeOf<
      Parameters<ProcessExecutor<string, CustomArtifact>["call"]>[0]
    >().toEqualTypeOf<string>();

    expectTypeOf<
      Parameters<ProcessExecutor<string, CustomArtifact>["call"]>[1]
    >().toEqualTypeOf<CustomArtifact[]>();
  });

  it("サイクルとアーティファクトから呼び出し入力を生成してチャンネルへ送信する", async () => {
    const send = vi.fn<(input: string) => Promise<void>>(async () => {});

    const createCallInput = vi.fn(
      (cycleId: string, artifacts: CustomArtifact[]) =>
        `${cycleId}:${artifacts.map((artifact) => artifact.id).join(",")}`,
    );

    const executor = new ProcessExecutor<string, CustomArtifact>({
      channel: {
        send,
      },
      createCallInput,
    });

    const cycle = {
      id: "cycle-1",
    } as Cycle;

    const artifacts = [
      new CustomArtifact("artifact-1", "foo"),
      new CustomArtifact("artifact-2", "bar"),
    ];

    await executor.call(cycle.id, artifacts);

    expect(createCallInput).toHaveBeenCalledWith(cycle.id, artifacts);

    expect(send).toHaveBeenCalledWith("cycle-1:artifact-1,artifact-2");
  });
});
