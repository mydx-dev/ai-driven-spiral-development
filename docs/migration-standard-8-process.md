# Standard Process 8工程移行ガイド

Standard Processは旧7工程モデルから、AI駆動スパイラルの8工程モデルへ移行しました。

## 新しい工程

```text
1. 要求定義
2. システム要件定義
3. ソフトウェア要件定義
4. 実装
5. 統合
6. QA
7. 検収
8. フィードバック
```

`フィードバック` は通常Processとして `route()` せず、`StandardCycle` のCycle completion / next-cycle decisionとして扱います。

## 旧工程名

以下はStandard Process名として使用しません。

```text
Demand Definition
Requirement Definition
External Design
Engineering
Release
Acceptance
cycle
```

`QA` は名称を維持しますが、責任は `Verification Result` によるspecified Software Requirementsへの適合確認として定義します。

## Artifact移行

| 旧API | 8工程で利用するArtifact |
| --- | --- |
| Demand / Requirement | Stakeholder Requirements Specification (StRS) |
| ExternalSpec | SRS + Software Architecture Description |
| SystemArchitecture + RequirementAllocation | System Architecture Description |
| SoftwareDesign | Software Architecture Description + Software Element Design |
| Implementation | Software Element Design + Implemented Software Element |
| QAReport | Verification Result |
| Release | 独立Standard Process Artifactとしては廃止 |
| AcceptanceReport | Validation Result |

Requirement Allocationは独立Standard Artifactではなく、Architecture Descriptionのallocation / traceabilityとして保持します。

## Gate移行

| 8工程 | Gate |
| --- | --- |
| 要求定義 | RequirementsGate |
| システム要件定義 | SystemRequirementsGate |
| ソフトウェア要件定義 | SoftwareRequirementsGate |
| 実装 | ImplementationGate |
| 統合 | IntegrationGate |
| QA | VerificationGate |
| 検収 | ValidationGate |
| フィードバック | StandardCycle.feedback() |

システム要件定義とソフトウェア要件定義はComposite Gateです。1 Artifact = 1 Processではありません。

## StandardCycle

旧:

```ts
const event = new SemanticCompletionEvent({
  cycleId,
  name: "cycle",
  cycleDefinition,
});
```

新:

```ts
const event = new SemanticCompletionEvent({
  cycleId,
  name: "フィードバック",
  cycleDefinition,
});
```

`StandardCycle` のfeedback stateは `newInformation` / `changedInformation` を使用します。`newDemand` / `changedDemand` は移行用deprecated aliasです。

## Semantic Completion

GitHub Actions / CLI / Standard GitHub Bindingへ渡す工程名も8工程へ統一してください。

```text
要求定義
システム要件定義
ソフトウェア要件定義
実装
統合
QA
検収
フィードバック
```

旧英語工程名は新規イベントでは受け付けません。

## deprecated API

旧Artifact / Gateは既存利用側の段階的移行のため、一時的にdeprecated compatibility APIとして残しています。`legacy` namespaceから明示的に参照できます。

```ts
import { legacy } from "@mydx-dev/spiral-standard";
```

新規実装ではlegacy APIを使用しないでください。

## GitHub Artifact mapping

Standard packageのArtifact / Gate境界と、GitHub Issue / PR / Checkへの保存方式は分離されています。

8工程ArtifactのGitHub representationはStandard GitHub Binding側で定義します。Standard本体にGitHub固有構造を持ち込まないでください。
