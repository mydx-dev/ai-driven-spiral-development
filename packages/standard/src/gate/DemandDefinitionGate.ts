import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { Demand } from "../artifact/Demand.js";

export class DemandDefinitionGate implements ProcessGate<Demand> {
  verifyStructuralComplete(demands: Demand[]): GatePass {
    const errors: string[] = [];

    if (demands.length === 0) {
      errors.push("Demandが1件も存在しません");
    }

    for (const demand of demands) {
      if (!demand.id.trim()) {
        errors.push("Demand識別子がありません");
      }

      if (!demand.cycleId.trim()) {
        errors.push(`${demand.id}: 対象Cycleがありません`);
      }

      if (!demand.target.trim()) {
        errors.push(`${demand.id}: 対象が定義されていません`);
      }

      if (!demand.currentState.trim()) {
        errors.push(`${demand.id}: 現在状態が定義されていません`);
      }

      if (!demand.expectedState.trim()) {
        errors.push(`${demand.id}: 期待状態が定義されていません`);
      }

      if (!demand.source.trim()) {
        errors.push(`${demand.id}: 発生源が定義されていません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
