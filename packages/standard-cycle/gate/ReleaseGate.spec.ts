import { describe, expect, it } from "vitest";
import { Release } from "../artifact/Release";
import { ReleaseGate } from "./ReleaseGate";

describe("ReleaseGate", () => {
  const gate = new ReleaseGate();

  it("Releaseを一意に特定できない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([]).passed).toBe(false);
  });

  it("検収可能なReleaseが準備されている場合は構造的完了", () => {
    const release = new Release(
      "release-1",
      "production",
      "受注管理機能を追加",
      "本番環境へデプロイする",
      "検収環境で受注登録を確認する",
      true,
      "1.0.0",
    );

    expect(gate.verifyStructuralComplete([release])).toEqual({
      passed: true,
    });
  });

  it("Release処理が完了していない場合は構造的未完了", () => {
    const release = new Release(
      "release-1",
      "production",
      "Release Notes",
      "Release手順",
      "検収手順",
      false,
    );

    expect(gate.verifyStructuralComplete([release]).passed).toBe(false);
  });

  it.each([
    [
      "Release対象",
      new Release("release-1", "", "notes", "release", "acceptance", true),
    ],
    [
      "Release Notes",
      new Release("release-1", "target", "", "release", "acceptance", true),
    ],
    [
      "Release手順",
      new Release("release-1", "target", "notes", "", "acceptance", true),
    ],
    [
      "検収手順",
      new Release("release-1", "target", "notes", "release", "", true),
    ],
  ])("%s が不足している場合は構造的未完了", (_, release) => {
    expect(gate.verifyStructuralComplete([release]).passed).toBe(false);
  });

  it("versionは存在しなくても構造的完了できる", () => {
    const release = new Release(
      "release-1",
      "production",
      "Release Notes",
      "Release手順",
      "検収手順",
      true,
    );

    expect(gate.verifyStructuralComplete([release])).toEqual({
      passed: true,
    });
  });
});
