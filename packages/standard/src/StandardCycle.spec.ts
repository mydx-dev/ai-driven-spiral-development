import { describe, expect, it, vi } from "vitest";
import {
  Process,
  ProcessExecutor,
  SemanticCompletionEvent,
  type Artifact,
  type ArtifactRepository,
  type ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import { StandardCycle } from "./StandardCycle.js";
import { standardProcessNames } from "./StandardProcess.js";
import { configureStandardCycle } from "./configureStandardCycle.js";

class TestArtifact implements Artifact {
  constructor(public readonly id: string) {}
}

const createProcess = <const TName extends string>(name: TName) => {
  const artifactRepository: ArtifactRepository<TestArtifact> = {
    find: vi.fn(),
    findByCycle: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
  };

  const gate: ProcessGate<TestArtifact> = {
    verifyStructuralComplete: vi.fn().mockReturnValue({ passed: true }),
  };

  const executor = new ProcessExecutor({
    channel: { send: vi.fn() },
    createStartMessage: () => undefined,
    createRetryMessage: () => undefined,
  });

  return new Process({ name, artifactRepository, gate, executor });
};

const createStandardProcesses = () => ({
  requirements: createProcess("要求定義"),
  systemRequirements: createProcess("システム要件定義"),
  softwareRequirements: createProcess("ソフトウェア要件定義"),
  implementation: createProcess("実装"),
  integration: createProcess("統合"),
  verification: createProcess("QA"),
  validation: createProcess("検収"),
});

describe("StandardCycle", () => {
  describe("feedback", () => {
    it("新しい情報が存在する場合は次Cycleを必要とする", () => {
      expect(new StandardCycle("cycle-1", "exists", "none").feedback()).toEqual(
        {
          needNextCycle: true,
        },
      );
    });

    it("変更された情報が存在する場合は次Cycleを必要とする", () => {
      expect(new StandardCycle("cycle-1", "none", "exists").feedback()).toEqual(
        {
          needNextCycle: true,
        },
      );
    });

    it("新規情報も変更情報も存在しない場合は次Cycleを必要としない", () => {
      expect(new StandardCycle("cycle-1", "none", "none").feedback()).toEqual({
        needNextCycle: false,
      });
    });

    it("変更確認が完了していない場合は次Cycleを開始しない", () => {
      expect(
        new StandardCycle("cycle-1", "unconfirmed", "unconfirmed").feedback(),
      ).toEqual({ needNextCycle: false });
    });
  });

  describe("fallback", () => {
    it("標準Cycle固有の復旧状態を持たないため同じCycleを返す", () => {
      const cycle = new StandardCycle("cycle-1", "none", "none");
      expect(cycle.fallback("実装")).toBe(cycle);
    });
  });

  it("Standard packageが8工程を定義順にrouteしたCycleDefinitionを提供する", () => {
    const ConfiguredCycle = configureStandardCycle(createStandardProcesses());

    expect(ConfiguredCycle.processNames()).toEqual(standardProcessNames);
  });

  it("Cycle開始時に要求定義Processを開始する", async () => {
    const processes = createStandardProcesses();
    const startSpy = vi.spyOn(processes.requirements, "start");
    const ConfiguredCycle = configureStandardCycle(processes);

    await new ConfiguredCycle("cycle-1", "none", "none").start();
    expect(startSpy).toHaveBeenCalledWith("cycle-1");
  });

  it("フィードバックをCycle completionのSemantic Completion Eventとして扱う", () => {
    const ConfiguredCycle = configureStandardCycle(createStandardProcesses());
    const event = new SemanticCompletionEvent({
      cycleId: "cycle-1",
      name: "フィードバック",
      cycleDefinition: ConfiguredCycle,
    });

    expect(event.name).toBe("フィードバック");
    expect(event.isCycleCompletion()).toBe(true);
  });
});
