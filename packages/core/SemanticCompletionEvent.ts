import type {
  Cycle,
  CycleClass,
  InferCycleCompletionName,
  InferProcessNames,
} from "./Cycle.js";

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
    const completionName = cycleDefinition.cycleCompletionName ?? "cycle";
    const allowedNames = [completionName, ...cycleDefinition.processNames()];

    if (!allowedNames.includes(name)) {
      throw new Error(`Invalid semantic completion event name: ${name}`);
    }

    this.cycleId = cycleId;
    this.name = name as
      InferCycleCompletionName<TCycleClass> | InferProcessNames<TCycleClass>;
    this.completionName = completionName;
  }

  public readonly [semanticCompletionEventBrand] = true;

  public readonly cycleId: string;

  public readonly name:
    InferCycleCompletionName<TCycleClass> | InferProcessNames<TCycleClass>;

  private readonly completionName: string;

  public isCycleCompletion(): boolean {
    return this.name === this.completionName;
  }
}
