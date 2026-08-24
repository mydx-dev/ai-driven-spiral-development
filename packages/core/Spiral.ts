import type { Cycle, CycleFactory, CycleRepository } from "./Cycle";

export type SemanticCompletionEvent = {
  readonly cycleId: string;
  readonly processName: string;
};

export class Spiral<TCycle extends Cycle> {
  constructor({
    cycleRepository,
    cycleFactory,
  }: {
    cycleRepository: CycleRepository<TCycle>;
    cycleFactory: CycleFactory<TCycle>;
  }) {
    this.cycleRepository = cycleRepository;
    this.cycleFactory = cycleFactory;
  }

  private readonly cycleRepository: CycleRepository<TCycle>;
  private readonly cycleFactory: CycleFactory<TCycle>;

  public async circulate(event: SemanticCompletionEvent): Promise<void> {
    const cycle = await this.cycleRepository.find(event.cycleId);

    if (!cycle) {
      throw new Error(`Cycle not found: ${event.cycleId}`);
    }

    const result = await cycle.proceed(event.processName);
    await this.cycleRepository.save(result.cycle);

    if (!result.completed) {
      return;
    }

    const feedback = result.cycle.feedback();
    if (!feedback.needNextCycle) {
      return;
    }

    const newCycle = await this.cycleFactory(result.cycle);
    await this.cycleRepository.save(newCycle);

    await newCycle.start();
  }
}
