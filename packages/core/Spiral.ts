import type {
  Cycle,
  CycleClass,
  CycleFactory,
  CycleProceedResult,
  CycleRepository,
} from "./Cycle.js";
import type { SemanticCompletionEvent } from "./SemanticCompletionEvent.js";

export class Spiral<TCycleClass extends CycleClass<Cycle, string, never[]>> {
  constructor({
    cycleRepository,
    cycleFactory,
  }: {
    cycleRepository: CycleRepository<InstanceType<TCycleClass>>;
    cycleFactory: CycleFactory<InstanceType<TCycleClass>>;
  }) {
    this.cycleRepository = cycleRepository;
    this.cycleFactory = cycleFactory;
  }

  private readonly cycleRepository: CycleRepository<InstanceType<TCycleClass>>;

  private readonly cycleFactory: CycleFactory<InstanceType<TCycleClass>>;

  public async circulate(
    event: SemanticCompletionEvent<TCycleClass>,
  ): Promise<CycleProceedResult<InstanceType<TCycleClass>> | undefined> {
    if (event.isCycleCompletion()) {
      await this.transition(event.cycleId);
      return undefined;
    }

    const cycle = await this.cycleRepository.find(event.cycleId);

    if (!cycle) {
      throw new Error(`Cycle not found: ${event.cycleId}`);
    }

    let result: CycleProceedResult<InstanceType<TCycleClass>>;

    try {
      result = await cycle.proceed(event.name);
    } catch (error) {
      const fallbackCycle = cycle.fallback(event.name);
      await this.cycleRepository.save(fallbackCycle);
      throw error;
    }

    if (!result.gateResult.passed) {
      const fallbackCycle = result.cycle.fallback(event.name);

      await this.cycleRepository.save(fallbackCycle);
      await result.retry(result.gateResult.errors);

      return result;
    }

    await result.dispatch();

    if (!result.completed) {
      return result;
    }

    await this.transition(result.cycle.id);
    return result;
  }

  public async transition(cycleId: string) {
    const cycle = await this.cycleRepository.find(cycleId);

    if (!cycle) {
      throw new Error(`Cycle not found: ${cycleId}`);
    }

    const feedback = cycle.feedback();

    if (!feedback.needNextCycle) {
      return cycle;
    }

    const newCycle = await this.cycleFactory(cycle);
    await this.cycleRepository.save(newCycle);

    await newCycle.start();
  }
}
