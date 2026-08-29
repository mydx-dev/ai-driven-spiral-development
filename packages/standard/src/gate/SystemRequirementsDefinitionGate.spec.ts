import { describe, expect, it } from "vitest";
import { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { SystemRequirementsDefinitionGate } from "./SystemRequirementsDefinitionGate.js";

const createSpecification = () =>
  new SystemRequirementsSpecification(
    "syrs-1",
    "cycle-1",
    "purpose",
    "scope",
    "overview",
    [
      {
        id: "sys-1",
        statement: "system requirement",
        category: "functional",
        tracesTo: [
          {
            specificationId: "strs-1",
            requirementId: "sr-1",
          },
        ],
      },
    ],
    [],
    [],
    [],
  );

describe("SystemRequirementsDefinitionGate", () => {
  const gate = new SystemRequirementsDefinitionGate();

  it("構造が完成しているSyRSを通過させる", () => {
    expect(gate.verifyStructuralComplete([createSpecification()])).toEqual({
      passed: true,
    });
  });

  it("今Cycleでは定義しないと明示した項目を通過させる", () => {
    const specification = new SystemRequirementsSpecification(
      "syrs-1",
      "cycle-1",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );

    expect(gate.verifyStructuralComplete([specification])).toEqual({
      passed: true,
    });
  });

  it("未判断の項目を検出する", () => {
    const specification = new SystemRequirementsSpecification(
      "syrs-1",
      "cycle-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const result = gate.verifyStructuralComplete([specification]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "syrs-1: system purposeが未確定です",
          "syrs-1: system scopeが未確定です",
          "syrs-1: system overviewが未確定です",
          "syrs-1: System Requirementsが未確定です",
          "syrs-1: assumptionsが未確定です",
          "syrs-1: dependenciesが未確定です",
          "syrs-1: unresolved itemsの確認が未完了です",
        ]),
      );
    }
  });

  it("System Requirementの識別子とStRS traceabilityの不備を検出する", () => {
    const specification = new SystemRequirementsSpecification(
      "syrs-1",
      "cycle-1",
      "purpose",
      "scope",
      "overview",
      [
        {
          id: "",
          statement: "system requirement",
          category: "interface",
          tracesTo: [],
        },
      ],
      [],
      [],
      [],
    );

    const result = gate.verifyStructuralComplete([specification]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "syrs-1: System Requirement識別子がありません",
          "syrs-1/: StRSへのtraceabilityがありません",
        ]),
      );
    }
  });

  it("空文字をnullの代替として扱わない", () => {
    const specification = new SystemRequirementsSpecification(
      "syrs-1",
      "cycle-1",
      "",
      "scope",
      "overview",
      [
        {
          id: "sys-1",
          statement: "system requirement",
          category: "quality",
          tracesTo: [
            {
              specificationId: "",
              requirementId: "sr-1",
            },
          ],
        },
      ],
      [""],
      [""],
      [{ id: "", description: "" }],
    );

    const result = gate.verifyStructuralComplete([specification]);

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "syrs-1: system purposeが不正です",
          "syrs-1/sys-1: StRSへのtraceabilityが不正です",
          "syrs-1: assumptionsに空の値があります",
          "syrs-1: dependenciesに空の値があります",
          "syrs-1: unresolved itemの識別子がありません",
          "syrs-1/: unresolved itemが記述されていません",
        ]),
      );
    }
  });
});
