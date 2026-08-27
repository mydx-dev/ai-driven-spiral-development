import type { Cycle, CycleClass, InferProcessNames } from "./Cycle.js";

const semanticCompletionEventBrand: unique symbol = Symbol(
  "SemanticCompletionEvent",
);

export class SemanticCompletionEvent<
  TCycleClass extends CycleClass<Cycle, string, never[]>,
> {
  constructor({
    cycleId,
    name,
    cycleDefinition,
  }: {
    cycleId: string;
    name: string;
    cycleDefinition: TCycleClass;
  }) {
    const allowedNames = ["cycle", ...cycleDefinition.processNames()];

    if (!allowedNames.includes(name)) {
      throw new Error(`Invalid semantic completion event name: ${name}`);
    }

    this.cycleId = cycleId;
    this.name = name as "cycle" | InferProcessNames<TCycleClass>;
  }

  public readonly [semanticCompletionEventBrand] = true;

  public readonly cycleId: string;

  public readonly name: "cycle" | InferProcessNames<TCycleClass>;

  public isCycleCompletion(): boolean {
    return this.name === "cycle";
  }
}
