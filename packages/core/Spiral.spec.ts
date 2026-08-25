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
import { SemanticCompletionEvent } from "./SemanticCompletionEvent";
import { Spiral } from "./Spiral";

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
  it("意味的完了イベントはサイクルの識別子とイベント名称を持つ", () => {
    expectTypeOf<SemanticCompletionEvent<typeof CustomCycle>>().toEqualTypeOf<{
      readonly cycleId: string;
      readonly name: "cycle";
      isCycleCompletion(): boolean;
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
      retry: async (errors: string[]) => {},
    });

    const cycleFactory: CycleFactory<CustomCycle> = vi.fn();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process-a",
      isCycleCompletion: () => false,
    });

    expect(cycleRepository.find).toHaveBeenCalledWith("cycle-1");

    expect(proceed).toHaveBeenCalledWith("process-a");
  });

  it("正常にゲートを通過した場合、ディスパッチを実行する", async () => {
    const cycle = new CustomCycle("cycle-1");
    const cycleRepository = createCycleRepository(cycle);

    const dispatchSpy = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: dispatchSpy,
      retry: vi.fn().mockResolvedValue(undefined),
    });

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process-a",
      isCycleCompletion: () => false,
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(cycleRepository.save).not.toHaveBeenCalled();
  });

  it("プロセス進行後に、サイクルが未完了ならサイクルを遷移しない", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: async () => {},
      retry: async (errors: string[]) => {},
    });

    const feedback = vi.spyOn(cycle, "feedback");

    const cycleFactory = vi.fn<CycleFactory<CustomCycle>>();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    vi.spyOn(spiral, "transition");

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process-a",
      isCycleCompletion: () => false,
    });

    expect(spiral.transition).not.toHaveBeenCalled();
    expect(feedback).not.toHaveBeenCalled();
    expect(cycleFactory).not.toHaveBeenCalled();
  });

  it("ゲートを通過できなかった場合はサイクルをフォールバックする", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback");

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: false,
        errors: ["構造的に完了していません"],
      },
      dispatch: async () => {},
      retry: async (errors: string[]) => {},
    });

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process",
      isCycleCompletion: () => false,
    });

    expect(fallbackSpy).toHaveBeenCalledWith("process");
  });

  it("ゲートを通過できなかった場合はフォールバックしたサイクルを保存してから現行プロセスをリトライする", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback");

    const retrySpy = vi.fn();
    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: false,
        errors: ["構造的に完了していません"],
      },
      dispatch: async () => {},
      retry: retrySpy,
    });

    const saveSpy = vi.spyOn(cycleRepository, "save");

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process",
      isCycleCompletion: () => false,
    });

    expect(fallbackSpy).toHaveBeenCalledWith("process");
    expect(cycleRepository.save).toHaveBeenCalledWith(cycle);

    expect(fallbackSpy.mock.invocationCallOrder[0]).toBeLessThan(
      saveSpy.mock.invocationCallOrder[0],
    );
    expect(saveSpy.mock.invocationCallOrder[0]).toBeLessThan(
      retrySpy.mock.invocationCallOrder[0],
    );
  });

  it("ゲートを通過できなかった場合は、失敗理由をリトライに渡して通常のディスパッチを実行しない", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback");

    const retrySpy = vi.fn();
    const dispatchSpy = vi.fn();
    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: false,
        errors: ["構造的に完了していません"],
      },
      dispatch: dispatchSpy,
      retry: retrySpy,
    });

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process",
      isCycleCompletion: () => false,
    });

    expect(fallbackSpy).toHaveBeenCalledWith("process");
    expect(retrySpy).toHaveBeenCalledWith(["構造的に完了していません"]);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("ゲートを通過できなかった場合はサイクル遷移を実行しない", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback");

    const retrySpy = vi.fn();
    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: false,
        errors: ["構造的に完了していません"],
      },
      dispatch: async () => {},
      retry: retrySpy,
    });

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    vi.spyOn(spiral, "transition");

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "process",
      isCycleCompletion: () => false,
    });

    expect(spiral.transition).not.toHaveBeenCalled();
  });

  it("サイクル進行で例外が発生した場合はサイクルをフォールバックする", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback");

    const retrySpy = vi.fn();
    vi.spyOn(cycle, "proceed").mockRejectedValue(
      new Error("サイクル進行中に例外が発生しました"),
    );

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await expect(
      spiral.circulate({
        cycleId: "cycle-1",
        name: "process",
        isCycleCompletion: () => false,
      }),
    ).rejects.toThrow("サイクル進行中に例外が発生しました");

    expect(fallbackSpy).toHaveBeenCalledWith("process");
  });

  it("サイクル進行エラー時はフォールバックしたサイクルを保存して元の例外を再送出する", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback");

    vi.spyOn(cycle, "proceed").mockRejectedValue(
      new Error("サイクル進行中に例外が発生しました"),
    );

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await expect(
      spiral.circulate({
        cycleId: "cycle-1",
        name: "process",
        isCycleCompletion: () => false,
      }),
    ).rejects.toThrow("サイクル進行中に例外が発生しました");

    expect(fallbackSpy).toHaveBeenCalledWith("process");
    expect(cycleRepository.save).toHaveBeenCalledWith(cycle);
  });

  it("サイクル進行中に例外が発生し、さらにそのフォールバックでも例外が発生した場合はサイクルを保存せず、リトライもしない", async () => {
    const cycle = new CustomCycle("cycle-1", true);

    const cycleRepository = createCycleRepository(cycle);

    const fallbackSpy = vi.spyOn(cycle, "fallback").mockImplementation(() => {
      throw new Error("フォールバックに失敗しました");
    });

    const retrySpy = vi.fn();
    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: false,
      cycle,
      gateResult: {
        passed: false,
        errors: ["構造的に完了していません"],
      },
      dispatch: async () => {},
      retry: retrySpy,
    });

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await expect(
      spiral.circulate({
        cycleId: "cycle-1",
        name: "process",
        isCycleCompletion: () => false,
      }),
    ).rejects.toThrow("フォールバックに失敗しました");

    expect(fallbackSpy).toHaveBeenCalledWith("process");
    expect(cycleRepository.save).not.toHaveBeenCalled();
    expect(retrySpy).not.toHaveBeenCalled();
  });

  it("サイクルの意味的完了イベントではサイクルを遷移して、プロセスは進行しない", async () => {
    const cycle = new CustomCycle("cycle-1", true);
    const cycleRepository = createCycleRepository(cycle);

    const proceedSpy = vi.spyOn(cycle, "proceed");

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    const transitionSpy = vi
      .spyOn(spiral, "transition")
      .mockImplementation(async () => {});

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "cycle",
      isCycleCompletion: () => true,
    });

    expect(transitionSpy).toHaveBeenCalledWith("cycle-1");
    expect(proceedSpy).not.toHaveBeenCalled();
  });

  it("サイクル遷移では対象サイクルをリポジトリから復元する", async () => {
    const cycle = new CustomCycle("cycle-1", true);
    const cycleRepository = createCycleRepository(cycle);

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    vi.spyOn(spiral, "transition").mockImplementation(async (cycleId) => {
      const restoredCycle = await cycleRepository.find(cycleId);
      expect(restoredCycle).toBe(cycle);
    });

    await spiral.transition("cycle-1");

    expect(cycleRepository.find).toHaveBeenCalledWith("cycle-1");
  });

  it("遷移対象のサイクルが存在しなければエラーになる", async () => {
    const cycle = new CustomCycle("cycle-1", true);
    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycleRepository, "find").mockResolvedValue(undefined);

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    await expect(spiral.transition("non-existent-cycle")).rejects.toThrow(
      "Cycle not found: non-existent-cycle",
    );
  });

  it("サイクル遷移時は当該サイクルをフィードバックする", async () => {
    const cycle = new CustomCycle("cycle-1", true);
    const cycle2 = new CustomCycle("cycle-2", false);

    const cycleRepository = createCycleRepository(cycle);

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn().mockResolvedValue(cycle2),
    });

    const feedbackSpy = vi.spyOn(cycle, "feedback");
    vi.spyOn(cycle2, "start").mockResolvedValue();

    await spiral.transition("cycle-1");

    expect(feedbackSpy).toHaveBeenCalledOnce();
  });

  it("フィードバックで次のサイクルが不要ならサイクルを生成しない", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: vi.fn(),
      retry: vi.fn(),
    });

    const cycleFactory = vi.fn<CycleFactory<CustomCycle>>();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "last-process",
      isCycleCompletion: () => false,
    });

    expect(cycleFactory).not.toHaveBeenCalled();
  });

  it("フィードバックで例外が発生した場合は次のサイクルを生成しない", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycleRepository, "find").mockResolvedValue(cycle);

    vi.spyOn(cycle, "feedback").mockImplementation(() => {
      throw new Error("フィードバック中に例外が発生しました");
    });

    const cycleFactory = vi.fn<CycleFactory<CustomCycle>>();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await expect(spiral.transition("cycle-1")).rejects.toThrow(
      "フィードバック中に例外が発生しました",
    );

    expect(cycleFactory).not.toHaveBeenCalled();
  });

  it("フィードバックに失敗してもサイクル遷移だけを再実行できる", async () => {
    const cycle = new CustomCycle("cycle-1", false);
    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycleRepository, "find").mockResolvedValue(cycle);

    const feedbackSpy = vi
      .spyOn(cycle, "feedback")
      .mockImplementationOnce(() => {
        throw new Error("フィードバック中に例外が発生しました");
      })
      .mockImplementationOnce(() => ({
        needNextCycle: true,
      }));

    const cycle2 = new CustomCycle("cycle-2", false);

    const startSpy = vi.spyOn(cycle2, "start").mockResolvedValue();

    const cycleFactory = vi
      .fn<CycleFactory<CustomCycle>>()
      .mockResolvedValue(cycle2);

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await expect(spiral.transition("cycle-1")).rejects.toThrow(
      "フィードバック中に例外が発生しました",
    );

    // フィードバックに失敗しても、サイクル遷移だけを再実行できる
    await spiral.transition("cycle-1");

    expect(feedbackSpy).toHaveBeenCalledTimes(2);
    expect(cycleFactory).toHaveBeenCalledWith(cycle);
    expect(cycleRepository.save).toHaveBeenCalledWith(cycle2);
    expect(startSpy).toHaveBeenCalledOnce();
  });

  it("プロセス進行後にサイクルが完了なら、サイクルを遷移する", async () => {
    const cycle = new CustomCycle("cycle-1", false);

    const cycleRepository = createCycleRepository(cycle);

    vi.spyOn(cycle, "proceed").mockResolvedValue({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: async () => {},
      retry: async (errors: string[]) => {},
    });

    const feedback = vi.spyOn(cycle, "feedback");

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory: vi.fn(),
    });

    vi.spyOn(spiral, "transition");

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "last-process",
      isCycleCompletion: () => false,
    });

    expect(feedback).toHaveBeenCalledOnce();
    expect(spiral.transition).toHaveBeenCalledWith("cycle-1");
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
      retry: vi.fn(),
    });

    const cycleFactory = vi.fn<CycleFactory<CustomCycle>>();

    const spiral = new Spiral({
      cycleRepository,
      cycleFactory,
    });

    await spiral.circulate({
      cycleId: "cycle-1",
      name: "last-process",
      isCycleCompletion: () => false,
    });

    expect(cycleFactory).not.toHaveBeenCalled();

    expect(cycleRepository.save).not.toHaveBeenCalled();
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
      retry: vi.fn(),
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
      name: "last-process",
      isCycleCompletion: () => false,
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
      retry: vi.fn(),
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
      name: "last-process",
      isCycleCompletion: () => false,
    });

    expect(cycleRepository.save).toHaveBeenNthCalledWith(1, newCycle);
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
      retry: vi.fn(),
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
      name: "last-process",
      isCycleCompletion: () => false,
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
        name: "process-a",
        isCycleCompletion: () => false,
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
