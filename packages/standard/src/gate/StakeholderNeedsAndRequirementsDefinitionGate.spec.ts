import { describe, expect, it } from "vitest";
import { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";
import { StakeholderNeedsAndRequirementsDefinitionGate } from "./StakeholderNeedsAndRequirementsDefinitionGate.js";

const createSpecification = () =>
  new StakeholderRequirementsSpecification(
    "strs-1",
    "cycle-1",
    ["Salon owner"],
    "予約業務を改善する",
    "予約受付と予約管理",
    "電話と外部予約媒体を併用している",
    "店舗スタッフが営業時間中に予約を受け付ける",
    [
      {
        id: "sr-1",
        statement: "予約状況を一元的に把握できること",
        source: "stakeholder-interview-1",
      },
    ],
    ["既存予約媒体を継続利用する"],
    ["スタッフが新規予約を登録する"],
    [],
  );

describe("StakeholderNeedsAndRequirementsDefinitionGate", () => {
  it("StRSが存在しない場合は失敗する", () => {
    const result =
      new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
        [],
      );

    expect(result).toEqual({
      passed: false,
      errors: ["StRSが1件も存在しません"],
    });
  });

  it("次Processへ渡せる構造なら通過する", () => {
    const result =
      new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
        [createSpecification()],
      );

    expect(result).toEqual({ passed: true });
  });

  it("nullは当該Cycleで定義しない判断済みとして通過する", () => {
    const specification = new StakeholderRequirementsSpecification(
      "strs-1",
      "cycle-1",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );

    const result =
      new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
        [specification],
      );

    expect(result).toEqual({ passed: true });
  });

  it("undefinedは当該Cycleで未判断として失敗する", () => {
    const specification = new StakeholderRequirementsSpecification(
      "strs-1",
      "cycle-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const result =
      new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
        [specification],
      );

    expect(result).toEqual({
      passed: false,
      errors: [
        "strs-1: Stakeholderが未確定です",
        "strs-1: purposeが未確定です",
        "strs-1: scopeが未確定です",
        "strs-1: business contextが未確定です",
        "strs-1: operational contextが未確定です",
        "strs-1: User / Stakeholder Requirementsが未確定です",
        "strs-1: constraintsが未確定です",
        "strs-1: scenariosが未確定です",
        "strs-1: 未確定事項の確認が未完了です",
      ],
    });
  });

  it("空文字や空要素はnullの代替として扱わず失敗する", () => {
    const specification = new StakeholderRequirementsSpecification(
      "strs-1",
      "cycle-1",
      [],
      "",
      "",
      "",
      "",
      [],
      [""],
      [""],
      [{ id: "", description: "" }],
    );

    const result =
      new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
        [specification],
      );

    expect(result).toEqual({
      passed: false,
      errors: [
        "strs-1: Stakeholderが不正です",
        "strs-1: purposeが不正です",
        "strs-1: scopeが不正です",
        "strs-1: business contextが不正です",
        "strs-1: operational contextが不正です",
        "strs-1: User / Stakeholder Requirementsが不正です",
        "strs-1: constraintsに空の値があります",
        "strs-1: scenariosに空の値があります",
        "strs-1: 未確定事項の識別子がありません",
        "strs-1/: 未確定事項が記述されていません",
      ],
    });
  });

  it("Requirementの構造的不備を検出する", () => {
    const specification = new StakeholderRequirementsSpecification(
      "strs-1",
      "cycle-1",
      ["Salon owner"],
      null,
      null,
      null,
      null,
      [{ id: "", statement: "", source: "" }],
      null,
      null,
      null,
    );

    const result =
      new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
        [specification],
      );

    expect(result).toEqual({
      passed: false,
      errors: [
        "strs-1: Requirement識別子がありません",
        "strs-1/: Requirementが記述されていません",
        "strs-1/: Requirement sourceがありません",
      ],
    });
  });
});
