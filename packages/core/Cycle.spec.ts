import { describe, expectTypeOf, it } from "vitest";

import type { Cycle, CycleFeedbackResult } from "./Cycle";

class CustomCycle implements Cycle {
  constructor(
    public readonly id: string,
    public readonly state: string,
  ) {}

  fallback(processName: string): Cycle {
    return new CustomCycle(this.id, `${this.state}:${processName}`);
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle: true,
    };
  }
}

describe("サイクル", () => {
  it("利用側で任意の状態を持つサイクルを実装できる", () => {
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
});
