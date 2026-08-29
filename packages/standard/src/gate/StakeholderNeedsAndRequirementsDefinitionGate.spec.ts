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
    const result = new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
      [],
    );

    expect(result).toEqual({
      passed: false,
      errors: ["StRSが1件も存在しません"],
    });
  });

  it("次Processへ渡せる構造なら通過する", () => {
    const result = new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete([
      createSpecification(),
    ]);

    expect(result).toEqual({ passed: true });
  });

  it("StRSの構造的不備を検出する", () => {
    const specification = new StakeholderRequirementsSpecification(
      "",
      "",
      [],
      "",
      "",
      "",
      "",
      [{ id: "", statement: "", source: "" }],
      [],
      [],
      [{ id: "", description: "" }],
    );

    const result = new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete([
      specification,
    ]);

    expect(result).toEqual({
      passed: false,
      errors: [
        "StRS識別子がありません",
        ": 対象Cycleがありません",
        ": Stakeholderが識別されていません",
        ": purposeが定義されていません",
        ": scopeが定義されていません",
        ": business contextが記述されていません",
        ": operational contextが記述されていません",
        ": Requirement識別子がありません",
        "/: Requirementが記述されていません",
        "/: Requirement sourceがありません",
        ": 未確定事項の識別子がありません",
        "/: 未確定事項が記述されていません",
      ],
    });
  });

  it("Requirementが存在しない場合は失敗する", () => {
    const specification = createSpecification();
    const withoutRequirements = new StakeholderRequirementsSpecification(
      specification.id,
      specification.cycleId,
      specification.stakeholders,
      specification.purpose,
      specification.scope,
      specification.businessContext,
      specification.operationalContext,
      [],
      specification.constraints,
      specification.scenarios,
      specification.unresolvedItems,
    );

    const result = new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete([
      withoutRequirements,
    ]);

    expect(result).toEqual({
      passed: false,
      errors: ["strs-1: User / Stakeholder Requirementsがありません"],
    });
  });
});
