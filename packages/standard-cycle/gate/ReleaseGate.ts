import type { GatePass, ProcessGate } from "../../core/ProcessGate";
import type { Release } from "../artifact/Release";

export class ReleaseGate implements ProcessGate<Release> {
  verifyStructuralComplete(releases: Release[]): GatePass {
    if (releases.length !== 1) {
      return {
        passed: false,
        errors: ["対象CycleのReleaseを一意に特定できません"],
      };
    }

    const release = releases[0];
    const errors: string[] = [];

    if (!release.target.trim()) {
      errors.push("Release対象を特定できません");
    }

    if (!release.ready) {
      errors.push("Release処理が完了していません");
    }

    if (!release.releaseNotes.trim()) {
      errors.push("Release Notesがありません");
    }

    if (!release.releaseProcedure.trim()) {
      errors.push("Release手順がありません");
    }

    if (!release.acceptanceProcedure.trim()) {
      errors.push("検収手順がありません");
    }

    if (!release.implementationId.trim()) {
      errors.push("Release対象のImplementationを特定できません");
    }

    if (!release.qaReportId.trim()) {
      errors.push("QA結果を特定できません");
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
