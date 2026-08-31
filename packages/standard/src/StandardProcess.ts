export const standardProcessNames = [
  "要求定義",
  "システム要件定義",
  "ソフトウェア要件定義",
  "実装",
  "統合",
  "QA",
  "検収",
] as const;

export const standardFeedbackName = "フィードバック" as const;

export const standardStageNames = [
  ...standardProcessNames,
  standardFeedbackName,
] as const;

export type StandardProcessName = (typeof standardProcessNames)[number];
export type StandardStageName = (typeof standardStageNames)[number];
