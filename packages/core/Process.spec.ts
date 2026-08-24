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
      createCallInput: vi.fn(),
    };

    const gate: ProcessGate<Artifact> = {
      evaluate: vi.fn(),
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
});
