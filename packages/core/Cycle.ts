import type { Artifact } from "./Artifact";
import type { Process } from "./Process";

export type CycleFeedbackResult = {
  readonly needNextCycle: boolean;
};

export type GateResult =
  | {
      readonly passed: true;
    }
  | {
      readonly passed: false;
      readonly errors: string[];
    };

export type CycleClass<
  TCycle extends Cycle,
  TProcessNames extends string = never,
> = {
  new (...args: any[]): TCycle;
  readonly __processNames?: TProcessNames;
  processNames(): TProcessNames[];
};

export type CycleProceedResult<TCycle> = {
  readonly completed: boolean;
  readonly cycle: TCycle;
  readonly gateResult: GateResult;
  readonly dispatch: () => Promise<void>;
  readonly retry: (errors: string[]) => Promise<void>;
};

export type InferProcessNames<TCycleClass> = TCycleClass extends {
  readonly __processNames?: infer TProcessNames;
}
  ? Extract<TProcessNames, string>
  : never;

export abstract class Cycle implements Artifact {
  protected static readonly routeRegistry = new WeakMap<
    Function,
    Process<any, any, any>[]
  >();

  static route<
    TCycleClass extends CycleClass<any, any>,
    TName extends string,
    TArtifact extends Artifact,
    TCallMessage,
  >(
    this: TCycleClass,
    process: Process<TName, TArtifact, TCallMessage>,
  ): Omit<TCycleClass, "__processNames" | "processNames"> &
    CycleClass<
      InstanceType<TCycleClass>,
      InferProcessNames<TCycleClass> | TName
    > {
    if (process.name === "cycle") {
      throw new Error('"cycle" is reserved for cycle completion.');
    }
    const routes = Cycle.routeRegistry.get(this) ?? [];

    routes.push(process);
    Cycle.routeRegistry.set(this, routes);

    return this;
  }
  static processNames<TCycleClass extends Function>(
    this: TCycleClass,
  ): string[] {
    return (Cycle.routeRegistry.get(this) ?? []).map((process) => process.name);
  }

  abstract readonly id: string;

  protected get routes(): readonly Process<any, any, any>[] {
    return Cycle.routeRegistry.get(this.constructor) ?? [];
  }

  public async start(): Promise<void> {
    const firstProcess = this.routes[0];

    if (!firstProcess) {
      throw new Error("Process route is empty.");
    }

    await firstProcess.start(this.id);
  }

  public async proceed(processName: string): Promise<CycleProceedResult<this>> {
    const index = this.routes.findIndex(
      (process) => process.name === processName,
    );

    const process = this.routes[index];

    if (!process) {
      throw new Error(`Process not found: ${processName}`);
    }

    const gatePass = await process.verifyComplete(this.id);

    if (!gatePass.passed) {
      return {
        completed: false,
        cycle: this,
        gateResult: gatePass,
        dispatch: async () => {},
        retry: (errors: string[]) => process.retry(this.id, errors),
      };
    }

    const nextProcess = this.routes[index + 1];

    if (nextProcess) {
      return {
        completed: false,
        cycle: this,
        gateResult: gatePass,
        dispatch: () => nextProcess.start(this.id),
        retry: (errors: string[]) => process.retry(this.id, errors),
      };
    }

    return {
      completed: true,
      cycle: this,
      gateResult: gatePass,
      dispatch: async () => {},
      retry: async (errors: string[]) => process.retry(this.id, errors),
    };
  }

  abstract fallback(processName: string): this;
  abstract feedback(): CycleFeedbackResult;
}

export interface CycleRepository<TCycle extends Cycle> {
  create(): Promise<TCycle>;
  find(id: string): Promise<TCycle | undefined>;
  /**
   * Saving the same cycle identity multiple times must not
   * create duplicate logical cycles.
   */
  save(cycle: TCycle): Promise<void>;
}

/**
 * Creates the next cycle from the previous cycle.
 *
 * Implementations must be idempotent with respect to the
 * previous cycle identity. Repeated calls for the same
 * previous cycle must not create multiple logical next cycles.
 */
export type CycleFactory<TCycle extends Cycle> = (
  previousCycle: TCycle,
) => Promise<TCycle>;
