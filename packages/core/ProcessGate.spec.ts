import { describe, expectTypeOf, it } from "vitest";

import type { Artifact } from "./Artifact";
import type { GatePass, ProcessGate } from "./ProcessGate";

class CustomArtifact implements Artifact {
  constructor(
    public readonly id: string,
    public readonly foo: string,
    public readonly bar: number,
  ) {}
}

class CustomProcessGate implements ProcessGate<CustomArtifact> {
  verifyStructuralComplete(
    artifacts: CustomArtifact[],
  ): GatePass<CustomArtifact> {
    const passed = artifacts.every((artifact) => artifact.bar > 0);

    if (passed) {
      return {
        passed: true,
      };
    }

    return {
      passed: false,
      artifacts: artifacts.filter((artifact) => artifact.bar <= 0),
      errors: ["bar must be greater than 0"],
    };
  }
}

describe("プロセスゲート", () => {
  it("任意のアーティファクトに対するプロセスゲートを利用側で実装できる", () => {
    expectTypeOf<CustomProcessGate>().toMatchTypeOf<
      ProcessGate<CustomArtifact>
    >();
  });

  it("プロセスゲートはアーティファクトを評価してゲートの通過可否を返す", () => {
    expectTypeOf<
      Parameters<CustomProcessGate["verifyStructuralComplete"]>[0]
    >().toEqualTypeOf<CustomArtifact[]>();

    expectTypeOf<
      ReturnType<CustomProcessGate["verifyStructuralComplete"]>
    >().toEqualTypeOf<GatePass<CustomArtifact>>();
  });
});
