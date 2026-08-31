# Portable Distribution package boundary

## 1. 目的

`ai-driven-spiral-development` を特定のTemplate Repositoryに依存せず、既存の任意Repositoryへ導入可能なPortable Distributionとして提供する。

source-level dependencyとinstall-time dependencyの両方で責務境界を維持し、Artifact Adapter、Process preset、Quality Guardを独立してCompositionできることを重視する。

## 2. package構成

```text
@mydx-dev/ai-driven-spiral-development
  = Core

@mydx-dev/spiral-standard
  = 8工程Standard Process

@mydx-dev/spiral-github
  = GitHub transport / persistence foundation

@mydx-dev/spiral-standard-github
  = Standard Process × GitHub binding

@mydx-dev/spiral-quality
  = Quality Guard

@mydx-dev/spiral
  = CLI / Composition Tool
```

## 3. Core

`@mydx-dev/ai-driven-spiral-development` はスパイラル開発の抽象モデルと進行制御だけを提供する。

```text
Artifact
ArtifactRepository
Process
ProcessGate
ProcessExecutor
ExecutionChannel
Cycle
CycleRepository
SemanticCompletionEvent
Spiral
```

Coreは特定のArtifact保存先、Standard Process、GitHub、Quality Guard、CLIを知らない。

## 4. Standard Process

`@mydx-dev/spiral-standard` はAI駆動スパイラルの8工程で利用するArtifact、Gate、Cycle modelを提供する。

```text
要求定義
→ StRS

システム要件定義
→ SyRS
→ System Architecture Description

ソフトウェア要件定義
→ SRS
→ Software Architecture Description

実装
→ Software Element Design
→ Implemented Software Element

統合
→ Integrated Software

QA
→ Verification Result

検収
→ Validation Result

フィードバック
→ StandardCycle.feedback()
```

ProcessとArtifactは1:1ではない。システム要件定義とソフトウェア要件定義は複数Artifactを一体で評価するComposite Gateを持つ。

正規public APIの中心は次の通り。

```text
StandardCycle
standardProcessNames
standardStageNames

StakeholderRequirementsSpecification
SystemRequirementsSpecification
SystemArchitectureDescription
SoftwareRequirementsSpecification
SoftwareArchitectureDescription
SoftwareElementDesign
ImplementedSoftwareElements
IntegratedSoftware
VerificationResult
ValidationResult

RequirementsGate
SystemRequirementsGate
SoftwareRequirementsGate
ImplementationGate
IntegrationGate
VerificationGate
ValidationGate
```

Requirement Allocationは独立Standard Artifactではなく、Architecture Descriptionのallocation / traceabilityとして保持する。

旧7工程Artifact / Gateは段階的移行のためdeprecated compatibility APIとして扱い、新しいStandard工程定義には使用しない。

依存方向:

```text
@mydx-dev/spiral-standard
        ↓
@mydx-dev/ai-driven-spiral-development
```

Standard Processは永続化方式を定義しない。

## 5. GitHub foundation

`@mydx-dev/spiral-github` は特定のProcess presetに依存しないGitHub transport / persistence primitiveを提供する。

```text
GitHub client abstraction
Issue / Pull Request access
Issue ID mapping
section parsing / writing
resource lookup / persistence primitives
```

禁止する依存:

```text
@mydx-dev/spiral-github
-X-> @mydx-dev/spiral-standard
-X-> @mydx-dev/spiral-standard-github
-X-> @mydx-dev/spiral-quality
-X-> @mydx-dev/spiral
```

## 6. Standard × GitHub Binding

`@mydx-dev/spiral-standard-github` はStandard ProcessとGitHub persistenceを結合する。

公開Semantic Completion schemaはStandardと同じ8工程名を使用する。

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

GitHub resourceから各Standard Artifactをどのように復元するかはBindingの責務であり、Standard packageへGitHub依存を持ち込まない。

依存方向:

```text
@mydx-dev/spiral-standard-github
        ├─→ @mydx-dev/ai-driven-spiral-development
        ├─→ @mydx-dev/spiral-standard
        └─→ @mydx-dev/spiral-github
```

## 7. Quality Guard

`@mydx-dev/spiral-quality` は生成・変更されたsoftware artifactがquality policyを満たすかを静的に検査する。

```text
dependency direction
responsibility boundary
unused code
duplication
complexity
architecture constraint
```

Quality GuardはCore runtime execution graphへ依存しない。実装工程ではproject-defined Quality Guard結果を `ImplementationGate` へ注入できる。

## 8. CLI

`@mydx-dev/spiral` はPortable Distribution componentを利用Repositoryへ導入する最外層Composition Rootとする。

```bash
pnpm dlx @mydx-dev/spiral init \
  --artifact github \
  --process standard \
  --quality
```

Standard + GitHub構成で生成するSemantic Completion workflowは8工程名だけを入力候補として公開する。

GitHub Artifact mappingの詳細をCLIへ重複実装せず、Binding packageをsource of truthとする。

## 9. dependency graph

```text
@mydx-dev/spiral-standard
        ↓
@mydx-dev/ai-driven-spiral-development

@mydx-dev/spiral-github
  = Standard Processから独立

@mydx-dev/spiral-standard-github
        ├─→ @mydx-dev/ai-driven-spiral-development
        ├─→ @mydx-dev/spiral-standard
        └─→ @mydx-dev/spiral-github

@mydx-dev/spiral-quality
  = runtime graphから独立

@mydx-dev/spiral
  = 最外層Composition Tool
```

重要な禁止依存:

```text
Core → 外側package
Standard → GitHub / Standard-GitHub / Quality / CLI
GitHub → Standard / Standard-GitHub / Quality / CLI
Standard-GitHub → Quality / CLI
runtime package → Quality
```

## 10. Composition model

Artifact AdapterとProcess presetは独立した選択軸とする。

```text
Artifact Adapter
×
Process preset
×
Quality Guard
```

Artifact AdapterとProcessの組み合わせに固有mappingが必要な場合は、どちらかへ混在させずbinding packageとして表現する。

```text
--artifact github
→ @mydx-dev/spiral-github

--process standard
→ @mydx-dev/spiral-standard

github × standard
→ @mydx-dev/spiral-standard-github

--quality
→ @mydx-dev/spiral-quality
```

## 11. public API

Core:

```ts
import {
  Cycle,
  Process,
  ProcessExecutor,
  SemanticCompletionEvent,
  Spiral,
} from "@mydx-dev/ai-driven-spiral-development";
```

Standard:

```ts
import {
  StandardCycle,
  standardStageNames,
  RequirementsGate,
  SystemRequirementsGate,
  SoftwareRequirementsGate,
  ImplementationGate,
  IntegrationGate,
  VerificationGate,
  ValidationGate,
} from "@mydx-dev/spiral-standard";
```

GitHub foundation:

```ts
import { GitHubIssue, GitHubIssueId } from "@mydx-dev/spiral-github";
```

Standard × GitHub:

```ts
import {
  createStandardGitHubRuntime,
  standardGitHubStageNames,
} from "@mydx-dev/spiral-standard-github";
```

Quality:

```ts
import { runQualityGuard } from "@mydx-dev/spiral-quality";
```

## 12. 利用Repositoryに残す責務

Portable Distributionはproject固有情報を所有しない。

利用Repository側に残すもの:

```text
project固有ExecutionChannel
認証情報
Repository / Organization識別情報
project固有Process
project固有Artifact mapping
workflow固有設定
```

package側に置くもの:

```text
再利用可能なCore model
8工程Standard Process model
汎用GitHub primitive
Standard × GitHub mapping
Quality policy/tooling
Composition CLI
```
