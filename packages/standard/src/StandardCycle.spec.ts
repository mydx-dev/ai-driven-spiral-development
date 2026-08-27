import { describe, expect, it, vi } from "vitest";
import {
  Process,
  ProcessExecutor,
  type Artifact,
  type ArtifactRepository,
  type ProcessGate,
} from "ai-driven-spiral-development";
import { StandardCycle } from "./StandardCycle.js";

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

describe("StandardCycle", () => {
  describe("feedback", () => {
    it("新しいDemandが存在する場合は次Cycleを必要とする", () => {
      expect(new StandardCycle("cycle-1", "exists", "none").feedback()).toEqual(
        {
          needNextCycle: true,
        },
      );
    });

    it("変更されたDemandが存在する場合は次Cycleを必要とする", () => {
      expect(new StandardCycle("cycle-1", "none", "exists").feedback()).toEqual(
        {
          needNextCycle: true,
        },
      );
    });

    it("新規Demandと変更Demandの両方が存在する場合は次Cycleを必要とする", () => {
      expect(
        new StandardCycle("cycle-1", "exists", "exists").feedback(),
      ).toEqual({
        needNextCycle: true,
      });
    });

    it("新規Demandも変更Demandも存在しない場合は次Cycleを必要としない", () => {
      expect(new StandardCycle("cycle-1", "none", "none").feedback()).toEqual({
        needNextCycle: false,
      });
    });

    it("Demand変更の確認が完了していない場合は次Cycleを開始しない", () => {
      expect(
        new StandardCycle("cycle-1", "unconfirmed", "unconfirmed").feedback(),
      ).toEqual({ needNextCycle: false });
    });
  });

  describe("fallback", () => {
    it("標準Cycle固有の復旧状態を持たないため同じCycleを返す", () => {
      const cycle = new StandardCycle("cycle-1", "none", "none");
      expect(cycle.fallback("engineering")).toBe(cycle);
    });
  });

  it("標準プロセスを定義された順序で構成できる", () => {
    class TestStandardCycle extends StandardCycle {}
    const ConfiguredCycle = TestStandardCycle.route(
      createProcess("demand-definition"),
    )
      .route(createProcess("requirement-definition"))
      .route(createProcess("external-design"))
      .route(createProcess("engineering"))
      .route(createProcess("qa"))
      .route(createProcess("release"))
      .route(createProcess("acceptance"));

    expect(ConfiguredCycle.processNames()).toEqual([
      "demand-definition",
      "requirement-definition",
      "external-design",
      "engineering",
      "qa",
      "release",
      "acceptance",
    ]);
  });

  it("Cycle開始時に要求定義Processを開始する", async () => {
    class TestStandardCycle extends StandardCycle {}
    const demandDefinition = createProcess("demand-definition");
    const startSpy = vi.spyOn(demandDefinition, "start");
    const ConfiguredCycle = TestStandardCycle.route(demandDefinition)
      .route(createProcess("requirement-definition"))
      .route(createProcess("external-design"))
      .route(createProcess("engineering"))
      .route(createProcess("qa"))
      .route(createProcess("release"))
      .route(createProcess("acceptance"));

    await new ConfiguredCycle("cycle-1", "none", "none").start();
    expect(startSpy).toHaveBeenCalledWith("cycle-1");
  });
});
