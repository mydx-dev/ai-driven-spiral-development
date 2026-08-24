import { ArtifactRepository } from "./Artifact";
import { Cycle } from "./Cycle";
import { Process } from "./Process";

export type SemanticCompletionEvent = {
  readonly cycleId: string;
  readonly processName: string;
};

export class Spiral {
  constructor(
    private readonly cycleRepository: ArtifactRepository<Cycle>,
    private readonly processes: Process<any, any>[] = [],
  ) {}

  route(process: Process<any, any>) {
    this.processes.push(process);
    return this;
  }

  // 次へ進む(プロセスあるいはサイクルを進める)
  async next(event: SemanticCompletionEvent) {
    // サイクルを取得する
    const cycle = await this.cycleRepository.find(event.cycleId);

    if (!cycle) {
      throw new Error(`Cycle not found: ${event.cycleId}`);
    }

    // 意味的完了イベントに基づいて、完了したと思われるプロセスを取得する
    const index = this.processes.findIndex(
      (process) => process.name === event.processName,
    );
    const process = this.processes[index];

    // もしプロセスが見つからなければ、エラーを投げる
    if (!process) {
      throw new Error(`Process not found: ${event.processName}`);
    }

    // プロセスが構造的に完了しているか判定する
    const result = await process.structuralComplete(cycle);

    // 構造的に完了していなければサイクルをフォールバックして終了する
    if (!result.passed) {
      await this.cycleRepository.save(cycle.fallback(process.name));
      return result;
    }

    // 完了していて、次のプロセスがあれば（＝最後のプロセスじゃなければ）開始する
    const nextProcess = this.processes[index + 1];

    if (nextProcess) {
      await nextProcess.start(cycle);
      return result;
    }

    // 次のプロセスがない（＝最後のプロセスの場合）サイクルをフィードバックする
    const feedback = cycle.feedback();

    // サイクルを継続する必要があれば、最初のプロセスを開始する
    if (feedback.needNextCycle) {
      const firstProcess = this.processes[0];
      if (!firstProcess) {
        throw new Error(`Process route is empty.`);
      }
      await firstProcess.start(cycle);
    }
    return result;
  }
}
