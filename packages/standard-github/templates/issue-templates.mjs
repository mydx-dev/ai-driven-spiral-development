export const standardGitHubIssueTemplates = {
  ".github/ISSUE_TEMPLATE/spiral-cycle.md": `---
name: Spiral Cycle
about: Standard Spiral DevelopmentのCycleを管理する
title: "Cycle"
labels: ""
assignees: ""
---

## 前Cycle

<!-- 例: - #123。初回Cycleでは空欄。 -->

## 次Cycle

<!-- Cycle遷移時に自動設定されるため通常は空欄。 -->

## 要求

<!-- Cycleに属するDemand Issueを1行ずつ記載。例: - #123 -->

## Feature

<!-- 外部設計で定義したFeature Issueを1行ずつ記載。例: - #456 -->

## Release

### 対象

<!-- Release対象を記載。 -->

### Release Notes

<!-- Release内容を記載。 -->

### Release手順

<!-- Release手順を記載。 -->

### 検収手順

<!-- 検収手順を記載。 -->

### Version

<!-- Release versionを1行で記載。 -->

- [ ] Release完了

## フィードバック

- [ ] 現Cycleの不備
- [ ] 新規Demand
- [ ] 既存Demandの変更
`,
  ".github/ISSUE_TEMPLATE/demand.md": `---
name: Demand
about: Standard ProcessのDemandとRequirement / QAを管理する
title: ""
labels: ""
assignees: ""
---

### 要求対象

<!-- 何を対象とする要求か。 -->

### 現在状態

<!-- 現在どうなっているか。 -->

### 期待状態

<!-- どうなってほしいか。 -->

### 発生源

<!-- 顧客、利用者、運用、障害など要求の発生源。 -->

## 要件

<!-- Requirement IDはDemand Issue内で一意にする。例:
- [R1] 利用者が予約を登録できる
  - [ ] QA: 検証結果を記載
-->
`,
  ".github/ISSUE_TEMPLATE/feature.md": `---
name: Feature
about: Standard ProcessのExternal Design / Featureを管理する
title: ""
labels: ""
assignees: ""
---

## 対象要件

<!-- Demand Issue番号とRequirement IDを #123-R1 形式で1行ずつ記載。例: - #123-R1 -->

## 外部設計

<!-- 対象要件を満たす外部設計を記載。 -->

## 対象外

<!-- このFeatureで扱わない範囲を記載。 -->
`,
};
