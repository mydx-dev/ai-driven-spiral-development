# ai-driven-spiral-development

AIやエージェントを使った反復型のソフトウェア開発を、**Process単位で観測・判定しながら進行制御するためのTypeScriptライブラリ**です。

LLMやAIエージェントによる生成処理そのものではなく、外部システムが生成・更新した成果物を `Artifact` として観測し、`ProcessGate` による決定的な完了判定を通じて `Cycle` と `Spiral` の進行を制御します。

```text
AI / Agent / Human / External System
        ↓
Artifact
        ↓
ProcessGate
        ↓
Cycle / Spiral
```

## Installation

Core:

```bash
pnpm add @mydx-dev/ai-driven-spiral-development
```

Standard Processも利用する場合:

```bash
pnpm add @mydx-dev/ai-driven-spiral-development @mydx-dev/spiral-standard
```

GitHub Bindingも利用する場合:

```bash
pnpm add @mydx-dev/spiral-github @mydx-dev/spiral-standard-github
```

## Core Concepts

### Artifact

Processが生成・更新し、Gateが観測する成果物です。

```ts
interface Artifact {
  readonly id: string;
}
```

保存先は規定しません。GitHub Issue / Pull Request、Database、File、外部APIなどを `ArtifactRepository` の実装でArtifactへ復元します。

### Process

Processは実行・成果物・完了判定の境界です。

```text
Process
├─ ArtifactRepository
├─ ProcessGate
└─ ProcessExecutor
```

AI駆動スパイラルのProcess粒度とISO/IEC/IEEEのEngineering Process粒度は1:1対応しません。一つのStandard Processが複数のISO由来Artifact / Engineering責任を束ねることがあります。

### SemanticCompletionEvent

実行主体が「意味的には作業が完了した」と通知するイベントです。イベント受信後にGateを評価し、構造的に完了していなければretryします。

### Cycle / Spiral

`Cycle.route()` でProcessを順番に登録し、`Spiral` がSemantic Completion、Gate、retry、次Process、次Cycleへの遷移を制御します。

## Standard Process

`@mydx-dev/spiral-standard` のStandard Processは、AI駆動スパイラル独自の8工程です。

```text
1. 要求定義
   → Stakeholder Requirements Specification (StRS)

2. システム要件定義
   → System Requirements Specification (SyRS)
   → System Architecture Description

3. ソフトウェア要件定義
   → Software Requirements Specification (SRS)
   → Software Architecture Description

4. 実装
   → Software Element Design
   → Implemented Software Element

5. 統合
   → Integrated Software

6. QA
   → Verification Result

7. 検収
   → Validation Result

8. フィードバック
   → Next-cycle decision
```

この8工程そのものをISO標準Processとは扱いません。Requirements ArtifactはISO/IEC/IEEE 29148、Architecture DescriptionはISO/IEC/IEEE 42010、System / Software Engineering責任は15288 / 12207を基準にしつつ、工程の束ね方、Gate、Feedback、Element単位の反復・並列実行はAI駆動スパイラル独自のorchestrationです。

### Standard API

```ts
import {
  StandardCycle,
  standardStageNames,
  StakeholderRequirementsSpecification,
  SystemRequirementsSpecification,
  SystemArchitectureDescription,
  SoftwareRequirementsSpecification,
  SoftwareArchitectureDescription,
  SoftwareElementDesign,
  ImplementedSoftwareElements,
  IntegratedSoftware,
  VerificationResult,
  ValidationResult,
  RequirementsGate,
  SystemRequirementsGate,
  SoftwareRequirementsGate,
  ImplementationGate,
  IntegrationGate,
  VerificationGate,
  ValidationGate,
} from "@mydx-dev/spiral-standard";
```

`standardStageNames` は次の8名称だけをStandard工程名として公開します。

```ts
[
  "要求定義",
  "システム要件定義",
  "ソフトウェア要件定義",
  "実装",
  "統合",
  "QA",
  "検収",
  "フィードバック",
];
```

### Composite Gate

Standard ProcessではProcessとArtifactは1:1ではありません。

```text
要求定義 Gate
└─ StRS

システム要件定義 Gate
├─ SyRS
└─ System Architecture Description

ソフトウェア要件定義 Gate
├─ SRS
└─ Software Architecture Description

実装 Gate
├─ Software Element Design
├─ Implemented Software Element
└─ project-defined Quality Guard

統合 Gate
└─ Integrated Software

QA Gate
└─ Verification Result

検収 Gate
└─ Validation Result
```

Requirement Allocationは独立Standard Artifactではありません。System Requirement → System Element、Software Requirement → Software Elementのallocation / traceabilityは、それぞれArchitecture Descriptionの責任として保持します。

### StandardCycle

`StandardCycle` のCycle completion名は `フィードバック` です。

```ts
import { StandardCycle } from "@mydx-dev/spiral-standard";

const cycle = new StandardCycle("cycle-1", "none", "none");
```

新規情報または変更情報が存在する場合に次Cycleを必要とします。

```text
newInformation === "exists"
or
changedInformation === "exists"
↓
needNextCycle: true
```

Standard Processは次の順序でrouteします。`フィードバック` はProcessとしてrouteせず、Cycle completion / next-cycle decisionとして扱います。

```ts
const CycleDefinition = StandardCycle.route(requirements)
  .route(systemRequirements)
  .route(softwareRequirements)
  .route(implementation)
  .route(integration)
  .route(qa)
  .route(validation);
```

Semantic Completionも同じ工程名を使います。

```ts
const event = new SemanticCompletionEvent({
  cycleId: "cycle-1",
  name: "ソフトウェア要件定義",
  cycleDefinition: CycleDefinition,
});
```

Cycle feedbackを実行する場合:

```ts
const event = new SemanticCompletionEvent({
  cycleId: "cycle-1",
  name: "フィードバック",
  cycleDefinition: CycleDefinition,
});
```

## Software Element Implementation

Software Architecture Descriptionで識別されたSoftware Elementを実装単位にします。

```text
Software Architecture Description
  ↓ dependency graph
Software Element
  ↓
Software Element Design
  ↓
Implementation
  ↓
Implemented Software Element
  ↓
Local Test / Static Analysis / Quality Guard
```

依存関係のないElementは並列実行できます。未完了Elementが存在するのに実行可能Elementが0件になる循環依存は `SoftwareElementExecutionPlan` が明示的に失敗させます。

最終的なSRS適合性は実装Gateでは判定せず、QA / Verificationに残します。

## GitHub Binding

GitHubはArtifactの保存・表示・traceability・execution integrationの一実装です。

```text
Core / Standard
  Artifact / Gate / Cycle
        ↑
        │ Binding
        ↓
GitHub Issue / PR / Check / Comment
```

`@mydx-dev/spiral-standard-github` のSemantic Completion schemaはStandardと同じ8工程名を使用します。

GitHub上で各8工程ArtifactをどのIssue / PR / Checkへ対応付けるかは、Standard本体とは分離してBinding側で定義します。

## Migration from the legacy Standard Process

旧7工程のStandard Process名は廃止されました。

```text
Demand Definition
Requirement Definition
External Design
Engineering
QA
Release
Acceptance
```

新しいStandard工程名へ移行してください。

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

旧Artifact / Gateは移行期間中のみdeprecated compatibility APIとして残し、`legacy` namespaceからも参照できます。新規実装では8工程のArtifact / Gateを使用してください。

詳細は [8工程Standard Process移行ガイド](docs/migration-standard-8-process.md) を参照してください。

## Custom Process

Standard Processの利用は必須ではありません。Core APIを使えば、独自のArtifact、Gate、Executor、Cycleを構成できます。

Standard Processの途中へプロジェクト固有Processを追加することも可能ですが、そのProcessはStandard 8工程とは区別してください。

## Documentation

- [事前準備](docs/theory/0.preparation.md)
- [AI駆動スパイラル開発](docs/theory/1.spiral-development.md)
- [サイクルモデル](docs/theory/2.cycle-model.md)
- [System Engineering Process Model](docs/theory/3.process-model.md)
- [Software Engineering Process Model](docs/theory/4.process-model.md)
- [QA / 検収 / フィードバック](docs/theory/5.process-model.md)
- [Change Locality / Context Locality](docs/theory/6.change-context-locality.md)
- [Portable Distribution](docs/portable-distribution.md)

## Packages

```text
@mydx-dev/ai-driven-spiral-development
@mydx-dev/spiral-standard
@mydx-dev/spiral-github
@mydx-dev/spiral-standard-github
@mydx-dev/spiral-quality
@mydx-dev/spiral
```

## License

ISC
