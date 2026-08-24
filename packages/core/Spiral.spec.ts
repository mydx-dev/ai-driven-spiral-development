import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { Artifact, ArtifactRepository } from "./Artifact";
import type { Cycle, CycleFeedbackResult } from "./Cycle";
import { Process } from "./Process";
import { type SemanticCompletionEvent, Spiral } from "./Spiral";

class CustomArtifact implements Artifact {
  constructor(public readonly id: string) {}
}

class CustomCycle implements Cycle {
  constructor(
    public readonly id: string,
    public readonly needNextCycle = false,
  ) {}

  fallback(processName: string): Cycle {
    return new CustomCycle(
      `${this.id}-fallback-${processName}`,
      this.needNextCycle,
    );
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle: this.needNextCycle,
    };
  }
}

const createCycleRepository = (
  cycle: Cycle | undefined,
): ArtifactRepository<Cycle> => ({
  find: vi.fn().mockResolvedValue(cycle),

  findByCycle: vi.fn().mockResolvedValue(cycle ? [cycle] : []),

  save: vi.fn().mockResolvedValue(undefined),
});

const createProcess = (name: string) => {
  const process = new Process<CustomArtifact, string>({
    name,

    artifactRepository: {
      find: vi.fn().mockResolvedValue(undefined),
      findByCycle: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    },

    gate: {
      evaluate: vi.fn().mockReturnValue({
        passed: true,
      }),
    },

    executor: {
      call: vi.fn().mockResolvedValue(undefined),
      channel: {
        send: vi.fn().mockResolvedValue(undefined),
      },
      createCallInput: vi.fn().mockReturnValue(""),
    },
  });

  return process;
};

describe("スパイラル", () => {
  it("意味的完了イベントによって対象プロセスを特定できる", () => {
    expectTypeOf<SemanticCompletionEvent>().toEqualTypeOf<{
      readonly cycleId: string;
      readonly processName: string;
    }>();
  });

  it("ルートに登録された順序で次のプロセスを開始する", async () => {
    const cycle = new CustomCycle("cycle-1");
    const cycleRepository = createCycleRepository(cycle);

    const firstProcess = createProcess("first");

    const secondProcess = createProcess("second");

    const firstStructuralComplete = vi
      .spyOn(firstProcess, "structuralComplete")
      .mockResolvedValue({
        passed: true,
      });

    const secondStart = vi.spyOn(secondProcess, "start").mockResolvedValue();

    const spiral = new Spiral(cycleRepository)
      .route(firstProcess)
      .route(secondProcess);

    await spiral.next({
      cycleId: "cycle-1",
      processName: "first",
    });

    expect(firstStructuralComplete).toHaveBeenCalledWith(cycle);

    expect(secondStart).toHaveBeenCalledWith(cycle);
  });

  it("プロセスが構造的に完了していない場合はそのサイクルをフォールバックする", async () => {
    const cycle = new CustomCycle("cycle-1");
    const cycleRepository = createCycleRepository(cycle);

    const firstProcess = createProcess("first");

    const secondProcess = createProcess("second");

    vi.spyOn(firstProcess, "structuralComplete").mockResolvedValue({
      passed: false,
      errors: ["構造的に未完了"],
    });

    const secondStart = vi.spyOn(secondProcess, "start");

    const spiral = new Spiral(cycleRepository)
      .route(firstProcess)
      .route(secondProcess);

    const result = await spiral.next({
      cycleId: "cycle-1",
      processName: "first",
    });

    expect(result).toEqual({
      passed: false,
      errors: ["構造的に未完了"],
    });

    expect(cycleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cycle-1-fallback-first",
      }),
    );

    expect(secondStart).not.toHaveBeenCalled();
  });

  it("最後のプロセスが構造的に完了するとサイクルをフィードバックする", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    const process = createProcess("last");

    vi.spyOn(process, "structuralComplete").mockResolvedValue({
      passed: true,
    });

    const feedback = vi.spyOn(cycle, "feedback");

    const start = vi.spyOn(process, "start");

    const spiral = new Spiral(cycleRepository).route(process);

    await spiral.next({
      cycleId: "cycle-1",
      processName: "last",
    });

    expect(feedback).toHaveBeenCalledOnce();

    expect(start).not.toHaveBeenCalled();
  });

  it("サイクルフィードバックで次のサイクルが必要なら最初のプロセスを開始する", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const firstProcess = createProcess("first");

    const lastProcess = createProcess("last");

    vi.spyOn(lastProcess, "structuralComplete").mockResolvedValue({
      passed: true,
    });

    const firstStart = vi.spyOn(firstProcess, "start").mockResolvedValue();

    const spiral = new Spiral(cycleRepository)
      .route(firstProcess)
      .route(lastProcess);

    await spiral.next({
      cycleId: "cycle-1",
      processName: "last",
    });

    expect(firstStart).toHaveBeenCalledWith(cycle);
  });

  it("サイクルが存在しない場合は次へ進まない", async () => {
    const cycleRepository = createCycleRepository(undefined);

    const spiral = new Spiral(cycleRepository).route(createProcess("process"));

    await expect(
      spiral.next({
        cycleId: "unknown",
        processName: "process",
      }),
    ).rejects.toThrow("Cycle not found: unknown");
  });

  it("意味的完了イベントに対応するプロセスが存在しない場合は次へ進まない", async () => {
    const cycle = new CustomCycle("cycle-1");

    const spiral = new Spiral(createCycleRepository(cycle)).route(
      createProcess("process"),
    );

    await expect(
      spiral.next({
        cycleId: "cycle-1",
        processName: "unknown",
      }),
    ).rejects.toThrow("Process not found: unknown");
  });

  it("サイクルフィードバックで次のサイクルが不要ならスパイラルを終了する", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    const firstProcess = createProcess("first");

    const lastProcess = createProcess("last");

    vi.spyOn(lastProcess, "structuralComplete").mockResolvedValue({
      passed: true,
    });

    const firstStart = vi.spyOn(firstProcess, "start");

    const feedback = vi.spyOn(cycle, "feedback");

    const spiral = new Spiral(cycleRepository)
      .route(firstProcess)
      .route(lastProcess);

    const result = await spiral.next({
      cycleId: "cycle-1",
      processName: "last",
    });

    expect(result).toEqual({
      passed: true,
    });

    expect(feedback).toHaveBeenCalledOnce();

    expect(firstStart).not.toHaveBeenCalled();
  });
});
