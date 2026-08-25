import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  Cycle,
  type CycleFactory,
  type CycleFeedbackResult,
  type CycleRepository,
  InferProcessNames,
} from "./Cycle";
import { Process } from "./Process";

class CustomCycle extends Cycle {
  constructor(
    public readonly id: string,
    public state: string,
  ) {
    super();
  }

  fallback(processName: string) {
    this.state = `${this.state}:${processName}`;
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle: true,
    };
  }
}

class CustomCycleRepository implements CycleRepository<CustomCycle> {
  create(): Promise<CustomCycle> {
    return Promise.resolve(new CustomCycle("cycle-1", "created"));
  }

  find(id: string): Promise<CustomCycle | undefined> {
    return Promise.resolve(new CustomCycle(id, "found"));
  }

  save(cycle: CustomCycle): Promise<void> {
    return Promise.resolve();
  }
}

const createProcess = <T extends string>(name: T) =>
  new Process({
    name,

    artifactRepository: {
      find: async () => undefined,
      findByCycle: async () => [],
      save: async () => {},
    },

    gate: {
      verifyStructuralComplete: () => ({
        passed: true,
      }),
    },

    executor: {
      call: async () => {},
      channel: {
        send: async () => {},
      },
      createStartMessage: () => "",
      createRetryMessage: () => "",
    },
  });

describe("サイクル", () => {
  it("利用側で任意の状態を持つサイクルを拡張できる", () => {
    expectTypeOf<CustomCycle>().toMatchTypeOf<Cycle>();
  });

  it("サイクルはプロセス名を受け取ってフォールバックできる", () => {
    expectTypeOf<
      Parameters<CustomCycle["fallback"]>[0]
    >().toEqualTypeOf<string>();

    expectTypeOf<ReturnType<CustomCycle["fallback"]>>().toMatchTypeOf<Cycle>();
  });

  it("サイクルはフィードバックによって次のサイクルが必要かを返す", () => {
    expectTypeOf<
      ReturnType<CustomCycle["feedback"]>
    >().toEqualTypeOf<CycleFeedbackResult>();

    expectTypeOf<
      CycleFeedbackResult["needNextCycle"]
    >().toEqualTypeOf<boolean>();
  });

  it("利用側で任意のサイクルに対するリポジトリを実装できる", () => {
    expectTypeOf<CustomCycleRepository>().toMatchTypeOf<
      CycleRepository<CustomCycle>
    >();
  });

  it("利用側で任意のサイクルを生成するファクトリを定義できる", () => {
    expectTypeOf<
      (previousCycle?: CustomCycle) => Promise<CustomCycle>
    >().toMatchTypeOf<CycleFactory<CustomCycle>>();
  });

  it("サイクルは登録された最初のプロセスから開始する", async () => {
    class StartCycle extends CustomCycle {}

    const firstProcess = createProcess("first");

    const secondProcess = createProcess("second");

    StartCycle.route(firstProcess).route(secondProcess);

    const firstStart = vi.spyOn(firstProcess, "start").mockResolvedValue();

    const secondStart = vi.spyOn(secondProcess, "start").mockResolvedValue();

    const cycle = new StartCycle("cycle-1", "running");

    await cycle.start();

    expect(firstStart).toHaveBeenCalledWith("cycle-1");

    expect(secondStart).not.toHaveBeenCalled();
  });

  it("サイクルはルートされたプロセス名を取得できる", () => {
    class RoutedCycle extends CustomCycle {}

    const first = createProcess("Requirement Definition");
    const second = createProcess("External Design");

    const CycleDefinition = RoutedCycle.route(first).route(second);

    expect(CycleDefinition.processNames()).toEqual([
      "Requirement Definition",
      "External Design",
    ]);
  });

  it("サイクル定義からルートされたプロセス名を推論できる", async () => {
    class RoutedCycle extends CustomCycle {}

    const first = createProcess("Requirement Definition");
    const second = createProcess("External Design");

    const CycleDefinition = RoutedCycle.route(first).route(second);
    type Names = InferProcessNames<typeof CycleDefinition>;

    expectTypeOf<Names>().toEqualTypeOf<
      "Requirement Definition" | "External Design"
    >();
  });

  it("プロセスが構造的に完了していなければサイクルをフォールバックしないで、現行プロセスのリトライをディスパッチする", async () => {
    class FallbackCycle extends CustomCycle {}

    const process = createProcess("process");

    FallbackCycle.route(process);

    vi.spyOn(process, "verifyComplete").mockResolvedValue({
      passed: false,
      errors: ["構造的に完了していません"],
    });

    const retrySpy = vi.spyOn(process, "retry").mockResolvedValue();

    const cycle = new FallbackCycle("cycle-1", "semantic-completed");
    const fallbackSpy = vi.spyOn(cycle, "fallback");

    const result = await cycle.proceed("process");

    expect(result).toEqual({
      completed: false,
      cycle: expect.objectContaining({
        id: "cycle-1",
        state: "semantic-completed",
      }),
      gateResult: {
        passed: false,
        errors: ["構造的に完了していません"],
      },
      dispatch: expect.any(Function),
      retry: expect.any(Function),
    });

    expect(fallbackSpy).not.toHaveBeenCalledWith("process");
    expect(retrySpy).not.toHaveBeenCalled();

    await result.retry(["構造的に完了していません"]);
    expect(retrySpy).toHaveBeenCalledWith("cycle-1", [
      "構造的に完了していません",
    ]);
  });

  it("プロセスが構造的に完了している場合、次のプロセスの開始とリトライをディスパッチする", async () => {
    class ProceedCycle extends CustomCycle {}

    const firstProcess = createProcess("first");

    const secondProcess = createProcess("second");

    ProceedCycle.route(firstProcess).route(secondProcess);

    vi.spyOn(firstProcess, "verifyComplete").mockResolvedValue({
      passed: true,
    });

    vi.spyOn(firstProcess, "retry");

    const secondStart = vi.spyOn(secondProcess, "start").mockResolvedValue();

    const cycle = new ProceedCycle("cycle-1", "running");

    const result = await cycle.proceed("first");

    expect(secondStart).not.toHaveBeenCalled();

    expect(result).toEqual({
      completed: false,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: expect.any(Function),
      retry: expect.any(Function),
    });

    await result.dispatch();
    await result.retry(["spiral error"]);

    expect(secondStart).toHaveBeenCalledWith("cycle-1");
    expect(firstProcess.retry).toHaveBeenCalledWith("cycle-1", [
      "spiral error",
    ]);
  });

  it("最後のプロセスが構造的に完了するとサイクル完了を返す", async () => {
    class CompleteCycle extends CustomCycle {}

    const process = createProcess("last");

    CompleteCycle.route(process);

    vi.spyOn(process, "verifyComplete").mockResolvedValue({
      passed: true,
    });

    const cycle = new CompleteCycle("cycle-1", "running");

    const result = await cycle.proceed("last");

    expect(result).toEqual({
      completed: true,
      cycle,
      gateResult: {
        passed: true,
      },
      dispatch: expect.any(Function),
      retry: expect.any(Function),
    });
  });

  it("存在しないプロセスを進行させることはできない", async () => {
    class UnknownProcessCycle extends CustomCycle {}

    UnknownProcessCycle.route(createProcess("process"));

    const cycle = new UnknownProcessCycle("cycle-1", "running");

    await expect(cycle.proceed("unknown")).rejects.toThrow(
      "Process not found: unknown",
    );
  });

  it("プロセスルートはサイクルの具体型ごとに独立して定義できる", async () => {
    class CycleA extends CustomCycle {}

    class CycleB extends CustomCycle {}

    const processA = createProcess("process-a");

    const processB = createProcess("process-b");

    CycleA.route(processA);
    CycleB.route(processB);

    const processAStart = vi.spyOn(processA, "start").mockResolvedValue();

    const processBStart = vi.spyOn(processB, "start").mockResolvedValue();

    const cycleA = new CycleA("cycle-a", "running");

    const cycleB = new CycleB("cycle-b", "running");

    await cycleA.start();
    await cycleB.start();

    expect(processAStart).toHaveBeenCalledWith("cycle-a");

    expect(processBStart).toHaveBeenCalledWith("cycle-b");

    expect(processAStart).not.toHaveBeenCalledWith("cycle-b");

    expect(processBStart).not.toHaveBeenCalledWith("cycle-a");
  });
});
