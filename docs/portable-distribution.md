# Portable Distribution package boundary

## 1. 目的

`ai-driven-spiral-development` の実装を、特定のTemplate Repositoryに依存せず、既存の任意Repositoryへ導入可能なPortable Distributionとして提供する。

Portable Distributionでは、source-level dependencyとinstall-time dependencyの両方で責務境界を維持し、Artifact Adapter、Process preset、Quality Guardを独立してCompositionできることを重視する。

npm packageは `@mydx-dev` scopeへ統一する。

## 2. package構成

```text
@mydx-dev/ai-driven-spiral-development
  = Core

@mydx-dev/spiral-standard
  = Standard Process

@mydx-dev/spiral-github
  = GitHub transport / persistence foundation

@mydx-dev/spiral-standard-github
  = Standard Process × GitHub binding

@mydx-dev/spiral-quality
  = Quality Guard

@mydx-dev/spiral
  = CLI / Composition Tool
```

GitHub Repository自体は分割せず、同一Repository内で各npm packageの責務を分離する。

## 3. package責務

### `@mydx-dev/ai-driven-spiral-development`

Core package。

スパイラル開発の抽象モデルと進行制御を提供する。

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

Coreは特定のArtifact保存先、Process preset、GitHub、Quality Guard、CLIを知らない。

禁止する依存:

```text
Core
-X-> @mydx-dev/spiral-standard
-X-> @mydx-dev/spiral-github
-X-> @mydx-dev/spiral-standard-github
-X-> @mydx-dev/spiral-quality
-X-> @mydx-dev/spiral
```

### `@mydx-dev/spiral-standard`

Standard Process package。

Coreの抽象モデルを利用し、AI駆動スパイラル開発で標準採用するArtifact、Gate、Cycle modelを定義する。

```text
StandardCycle
Demand
Requirement
ExternalSpec
Implementation
QAReport
Release
AcceptanceReport
DemandDefinitionGate
RequirementDefinitionGate
ExternalDesignGate
EngineeringGate
QAGate
ReleaseGate
AcceptanceGate
```

依存方向:

```text
@mydx-dev/spiral-standard
        ↓
@mydx-dev/ai-driven-spiral-development
```

Standard Processは永続化方式を定義しない。

### `@mydx-dev/spiral-github`

GitHub transport / persistence foundation package。

特定のProcess presetに依存せず、GitHub resourceをArtifact persistenceとして利用するための汎用機能を提供する。

```text
GitHub client abstraction
Issue / Pull Request access
Issue ID mapping
section parsing / writing
resource lookup / persistence primitives
```

このpackageはStandard Process固有の `Demand`、`ExternalSpec`、`QAReport` 等を知らない。

禁止する依存:

```text
@mydx-dev/spiral-github
-X-> @mydx-dev/spiral-standard
-X-> @mydx-dev/spiral-standard-github
-X-> @mydx-dev/spiral-quality
-X-> @mydx-dev/spiral
```

### `@mydx-dev/spiral-standard-github`

Standard ProcessとGitHub persistenceを結合するbinding package。

```text
DemandRepository
RequirementRepository
ExternalSpecRepository
ImplementationRepository
QAReportRepository
ReleaseRepository
AcceptanceReportRepository
StandardCycleRepository
```

依存方向:

```text
@mydx-dev/spiral-standard-github
        ├─→ @mydx-dev/ai-driven-spiral-development
        ├─→ @mydx-dev/spiral-standard
        └─→ @mydx-dev/spiral-github
```

このpackageはProcess progressionそのものを実行せず、Standard ProcessのArtifact contractとGitHub persistence primitiveを接続する。

### `@mydx-dev/spiral-quality`

Quality Guard package。

生成・変更されたsoftware artifactがquality policyを満たしているかを静的に検査する。

```text
dependency direction
responsibility boundary
unused code
duplication
complexity
architecture constraint
```

Quality Guardは `Spiral`、`Cycle`、`Process` のruntime execution graphへ組み込まない。

### `@mydx-dev/spiral`

CLI / Composition Tool package。

Portable Distributionのcomponentを利用Repositoryへ選択的に導入する最外層のComposition Rootとする。

CLI自身はCore model、Process、GitHub persistence、binding、Quality analysis logicを再実装しない。

## 4. dependency graph

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

## 5. Composition model

Artifact AdapterとProcess presetは独立した選択軸とする。

```text
Artifact Adapter
×
Process preset
×
Quality Guard
```

Artifact AdapterとProcessの組み合わせに固有mappingが必要な場合は、どちらかへ混在させずbinding packageとして表現する。

標準構成:

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

CLI:

```bash
pnpm dlx @mydx-dev/spiral init \
  --artifact github \
  --process standard \
  --quality
```

この構成では次を導入する。

```text
@mydx-dev/ai-driven-spiral-development
@mydx-dev/spiral-standard
@mydx-dev/spiral-github
@mydx-dev/spiral-standard-github
@mydx-dev/spiral-quality
```

Custom ProcessとGitHubを組み合わせる場合、`@mydx-dev/spiral-github` 自体はStandard Processを持ち込まない。利用側または独立packageでmappingを提供する。

## 6. install-time dependency boundary

### Coreのみ

```bash
pnpm add @mydx-dev/ai-driven-spiral-development
```

### Standard Process

```bash
pnpm add \
  @mydx-dev/ai-driven-spiral-development \
  @mydx-dev/spiral-standard
```

### GitHub foundation

```bash
pnpm add @mydx-dev/spiral-github
```

Standard Processは導入されない。

### Standard Process + GitHub

```bash
pnpm add \
  @mydx-dev/ai-driven-spiral-development \
  @mydx-dev/spiral-standard \
  @mydx-dev/spiral-github \
  @mydx-dev/spiral-standard-github
```

### Quality Guard

```bash
pnpm add -D @mydx-dev/spiral-quality
```

## 7. public API

### Core

```ts
import {
  Artifact,
  ArtifactRepository,
  Cycle,
  Process,
  ProcessExecutor,
  ProcessGate,
  SemanticCompletionEvent,
  Spiral,
} from "@mydx-dev/ai-driven-spiral-development";
```

### Standard Process

```ts
import {
  StandardCycle,
  Demand,
  Requirement,
  ExternalSpec,
  Implementation,
  QAReport,
  Release,
  AcceptanceReport,
} from "@mydx-dev/spiral-standard";
```

### GitHub foundation

```ts
import { GitHubIssue, GitHubIssueId } from "@mydx-dev/spiral-github";
```

### Standard Process × GitHub

```ts
import {
  DemandRepository,
  RequirementRepository,
  ExternalSpecRepository,
  ImplementationRepository,
  QAReportRepository,
  ReleaseRepository,
  AcceptanceReportRepository,
  StandardCycleRepository,
} from "@mydx-dev/spiral-standard-github";
```

### Quality Guard

```ts
import { runQualityGuard } from "@mydx-dev/spiral-quality";
```

### CLI

```bash
pnpm dlx @mydx-dev/spiral init
```

## 8. publish単位と順序

publish単位は次の6packageとする。

```text
@mydx-dev/ai-driven-spiral-development
@mydx-dev/spiral-standard
@mydx-dev/spiral-github
@mydx-dev/spiral-standard-github
@mydx-dev/spiral-quality
@mydx-dev/spiral
```

依存解決を考慮し、初回publishは概ね次の順序で行う。

```text
1. Core
2. Standard / GitHub
3. Standard-GitHub
4. Quality
5. CLI
```

Qualityはruntime dependency graphから独立しているため、実際のrelease automationでは独立publish可能である。

## 9. npm scope migration

Portable Distributionでは `@mydx-dev` scopeを正規scopeとする。

旧Core package:

```text
ai-driven-spiral-development
```

新Core package:

```text
@mydx-dev/ai-driven-spiral-development
```

旧Coreは新packageとしてscoped Coreを公開した後も直ちにunpublishしない。新Coreの公開・install・import・buildを確認した後、旧packageをdeprecatedとして新packageへ誘導する。

```bash
npm deprecate ai-driven-spiral-development \
  "Moved to @mydx-dev/ai-driven-spiral-development"
```

旧Standard subpathを利用している場合も独立packageへ移行する。

```text
ai-driven-spiral-development/standard-process
→ @mydx-dev/spiral-standard
```

## 10. 利用Repositoryに残す責務

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
Standard Process model
汎用GitHub primitive
Standard × GitHub mapping
Quality policy/tooling
Composition CLI
```

この境界により、特定Template Repositoryへ依存せず、既存RepositoryへPortable Distributionを導入できる状態を維持する。
