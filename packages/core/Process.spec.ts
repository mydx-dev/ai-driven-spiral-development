import { describe, expect, it, vi } from "vitest";
import { Artifact, ArtifactRepository } from "./Artifact";
import { Process } from "./Process";
import { ProcessExecutor } from "./ProcessExecutor";
import { ProcessGate } from "./ProcessGate";

describe("プロセス", () => {
  it("プロセスは実行者、ゲート、アーティファクト（リポジトリ）で構成される", () => {
    const executor: ProcessExecutor<unknown, Artifact> = {
      call: vi.fn(),
      channel: {} as any,
      createStartMessage: vi.fn(),
      createRetryMessage: vi.fn(),
    };

    const gate: ProcessGate<Artifact> = {
      verifyStructuralComplete: vi.fn(),
    };

    const artifactRepository: ArtifactRepository<Artifact> = {
      find: vi.fn(),
      findByCycle: vi.fn(),
      save: vi.fn(),
    };

    const process = new Process({
      name: "TestProcess",
      artifactRepository,
      gate,
      executor,
    });

    expect(process.name).toBe("TestProcess");
    expect(process["artifactRepository"]).toBe(artifactRepository);
    expect(process["gate"]).toBe(gate);
    expect(process["executor"]).toBe(executor);
  });

  it("アーティファクトの復元で例外が発生した場合はゲート失敗結果として返す", async () => {
    const artifacts: Artifact[] = [
      {
        id: "artifact-1",
      } as Artifact,
    ];

    const executor: ProcessExecutor<unknown, Artifact> = {
      call: vi.fn(),
      channel: {} as any,
      createStartMessage: vi.fn(),
      createRetryMessage: vi.fn(),
    };

    const gate: ProcessGate<Artifact> = {
      verifyStructuralComplete: vi.fn(),
    };

    const artifactRepository: ArtifactRepository<Artifact> = {
      find: vi.fn(),
      findByCycle: vi.fn(() => {
        throw new Error("Artifact retrieval failed");
      }),
      save: vi.fn(),
    };

    const process = new Process({
      name: "TestProcess",
      artifactRepository,
      gate,
      executor,
    });

    const result = await process.verifyComplete("cycle-1");

    expect(result).toEqual({
      passed: false,
      errors: [
        "Artifact restoration failed during process completion verification.",
        "Artifact retrieval failed",
      ],
    });
  });

  it("ゲート評価で例外が発生した場合は失敗結果として返す", async () => {
    const artifacts: Artifact[] = [
      {
        id: "artifact-1",
      } as Artifact,
    ];

    const executor: ProcessExecutor<unknown, Artifact> = {
      call: vi.fn(),
      channel: {} as any,
      createStartMessage: vi.fn(),
      createRetryMessage: vi.fn(),
    };

    const gate: ProcessGate<Artifact> = {
      verifyStructuralComplete: vi.fn(() => {
        throw new Error("Gate evaluation failed");
      }),
    };

    const artifactRepository: ArtifactRepository<Artifact> = {
      find: vi.fn(),
      findByCycle: vi.fn().mockResolvedValue(artifacts),
      save: vi.fn(),
    };

    const process = new Process({
      name: "TestProcess",
      artifactRepository,
      gate,
      executor,
    });

    const result = await process.verifyComplete("cycle-1");

    expect(result).toEqual({
      passed: false,
      errors: [
        "Process Gate verification failed due to an unexpected error.",
        "Gate evaluation failed",
      ],
    });
  });
});
