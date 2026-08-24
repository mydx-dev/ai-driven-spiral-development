import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Artifact } from "./Artifact";

class CustomArtifact implements Artifact {
  constructor(
    public readonly id: string,
    public readonly value: string = "",
  ) {}
}

import {
  Cycle,
  type CycleFactory,
  type CycleFeedbackResult,
  type CycleRepository,
} from "./Cycle";
import { type SemanticCompletionEvent, Spiral } from "./Spiral";

class CustomCycle extends Cycle {
  constructor(
    public readonly id: string,
    public readonly needNextCycle = false,
  ) {
    super();
  }

  fallback(processName: string) {
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle: this.needNextCycle,
    };
  }
}

const createCycleRepository = (
  cycle?: CustomCycle,
): CycleRepository<CustomCycle> => ({
  create: vi.fn().mockResolvedValue(new CustomCycle("created-cycle")),

  find: vi.fn().mockResolvedValue(cycle),

  save: vi.fn().mockResolvedValue(undefined),
});

describe("スパイラル", () => {
  it("意味的完了イベントはサイクルとプロセスを特定する情報を持つ", () => {
    expectTypeOf<SemanticCompletionEvent>().toEqualTypeOf<{
      readonly cycleId: string;
      readonly processName: string;
    }>();
  });

  it("意味的完了イベントを対象サイクルへ渡して進行させる", async () => {
    const cycle = new CustomCycle("cycle-1");

    const cycleRepository = createCycleRepository(cycle);

    const proceed = vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: async () => {},
    });

    const cycleFactory: CycleFactory<CustomCycle> = vi.fn();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "process-a",
    });

    expect(cycleRepository.find).toHaveBeenCalledWith("cycle-1");

    expect(proceed).toHaveBeenCalledWith("process-a");
  });

  it("サイクルの進行結果を保存したのち、ディスパッチを実行する", async () => {
    const cycle = new CustomCycle("cycle-1");

    const fallbackCycle = new CustomCycle("cycle-1-fallback-process-a");

    const cycleRepository = createCycleRepository(cycle);

    const dispatchSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle: fallbackCycle,
      gateResult: {
        passed: false,
        errors: ["構造的に未完了"],
      },
      dispatch: dispatchSpy,
    });

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "process-a",
    });

    expect(cycleRepository.save).toHaveBeenCalledWith(fallbackCycle);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("サイクルが未完了ならフィードバックを行わない", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: async () => {},
    });

    const feedback = vi.spyOn(cycle, "feedback");

    const cycleFactory = vi.fn<CycleFactory<CustomCycle>>();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "process-a",
    });

    expect(feedback).not.toHaveBeenCalled();
    expect(cycleFactory).not.toHaveBeenCalled();
  });

  it("サイクルが完了するとフィードバックを行う", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: async () => {},
    });

    const feedback = vi.spyOn(cycle, "feedback");

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "last-process",
    });

    expect(feedback).toHaveBeenCalledOnce();
  });

  it("フィードバックで次のサイクルが不要ならスパイラルを終了する", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: vi.fn(),
    });

    const cycleFactory = vi.fn<CycleFactory<CustomCycle>>();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "last-process",
    });

    expect(cycleFactory).not.toHaveBeenCalled();

    expect(cycleRepository.save).toHaveBeenCalledTimes(1);
  });

  it("フィードバックで次のサイクルが必要なら新しいサイクルを生成する", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const newCycle = new CustomCycle("cycle-2");

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: vi.fn(),
    });

    vi.spyOn(newCycle, "start").mockResolvedValue();

    const cycleFactory = vi
      .fn<CycleFactory<CustomCycle>>()
      .mockResolvedValue(newCycle);

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "last-process",
    });

    expect(cycleFactory).toHaveBeenCalledWith(cycle);
  });

  it("生成した次のサイクルを保存する", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const newCycle = new CustomCycle("cycle-2");

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: vi.fn(),
    });

    vi.spyOn(newCycle, "start").mockResolvedValue();

    const cycleFactory: CycleFactory<CustomCycle> = vi
      .fn()
      .mockResolvedValue(newCycle);

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "last-process",
    });

    expect(cycleRepository.save).toHaveBeenNthCalledWith(1, cycle);

    expect(cycleRepository.save).toHaveBeenNthCalledWith(2, newCycle);
  });

  it("生成した次のサイクルを開始する", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const newCycle = new CustomCycle("cycle-2");

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: vi.fn(),
    });

    const start = vi.spyOn(newCycle, "start").mockResolvedValue();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi
        .fn<CycleFactory<CustomCycle>>()
        .mockResolvedValue(newCycle),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      processName: "last-process",
    });

    expect(start).toHaveBeenCalledOnce();
  });

  it("サイクルが存在しない場合は循環できない", async () => {
    const spiral = new Spiral({
      cycleRepository: createCycleRepository(undefined),

      cycleFactory: vi.fn<CycleFactory<CustomCycle>>(),
    });

    await expect(
      spiral.circulate({
        cycleId: "unknown",
        processName: "process-a",
      }),
    ).rejects.toThrow("Cycle not found: unknown");
  });

  it("利用側で任意のサイクル生成方法を定義できる", () => {
    expectTypeOf<
      (previousCycle?: CustomCycle) => Promise<CustomCycle>
    >().toMatchTypeOf<CycleFactory<CustomCycle>>();
  });

  it("利用側で任意のサイクルリポジトリを実装できる", () => {
    expectTypeOf<ReturnType<typeof createCycleRepository>>().toMatchTypeOf<
      CycleRepository<CustomCycle>
    >();
  });
});
