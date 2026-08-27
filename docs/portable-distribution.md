# Portable Distribution package boundary

## 1. 目的

`ai-driven-spiral-development` を、特定の Template Repository に依存せず、既存の任意 Repository へ導入可能な Portable Distribution として提供する。

この文書では、Portable Distribution を構成する責務境界、依存方向、publish 単位、public API、および利用 Repository へ残す責務を定義する。

重要なのは Repository 数そのものではなく、source-level dependency と install-time dependency の両方で責務境界を維持し、Artifact Adapter と Process preset を独立して Composition できることである。

## 2. 採用する package 戦略

Portable Distribution では責務ごとに npm package を分割する。

```text
ai-driven-spiral-development
  = Core

@mydx/spiral-standard
  = Standard Process

@mydx/spiral-github
  = GitHub transport / persistence foundation

@mydx/spiral-standard-github
  = Standard Process 用 GitHub mapping

@mydx/spiral-quality
  = Quality Guard

@mydx/spiral
  = CLI / Composition Tool
```

GitHub の汎用基盤と Standard Process 固有の GitHub mapping は分離する。

これにより次の2つを両立する。

```text
GitHub を Artifact persistence として再利用できる

Artifact Adapter と Process preset を独立して選択できる
```

## 3. 採用理由

### install-time dependency を責務境界に一致させる

module 境界だけでは dependency 境界として不十分である。

GitHub Adapter や Quality Guard を Core と同じ npm package に同梱すると、Core のみを利用する Repository にも Octokit や Quality tooling が install される。

Portable Distribution では npm package boundary 自体で dependency isolation を保証する。

```text
Core 利用者
→ Core dependency のみ

Standard Process 利用者
→ Core + Standard Process

GitHub foundation 利用者
→ Core + GitHub dependency

Standard + GitHub 利用者
→ Core + Standard + GitHub + Standard/GitHub mapping

Quality Guard 利用者
→ Quality tooling dependency
```

### Artifact Adapter と Process を独立させる

GitHub persistence 自体は Standard Process 固有ではない。

したがって `@mydx/spiral-github` は `Demand`、`ExternalSpec`、`QAReport` 等を知らない。

Standard Process 固有 Artifact と GitHub resource の対応は `@mydx/spiral-standard-github` が担当する。

これにより将来次のような組み合わせが可能になる。

```text
GitHub + Standard Process
GitHub + Custom Process
Filesystem + Standard Process
Jira + Custom Process
```

## 4. Repository 内構成

同一 GitHub Repository 内で monorepo として管理し、npm publish 単位を分離する。

概念構成:

```text
packages/
├─ core/
│  └─ package.json
├─ standard/
│  └─ package.json
├─ github/
│  └─ package.json
├─ standard-github/
│  └─ package.json
├─ quality/
│  └─ package.json
└─ cli/
   └─ package.json
```

現在の `packages/core`、`packages/standard-cycle`、`packages/standard-process.ts` は後続実装でこの package 境界へ整理する。

Repository 自体を分割する必要はない。workspace により同一 Repository で開発、test、release する。

## 5. package 責務

### 5.1 `ai-driven-spiral-development`

Core package とする。

スパイラル開発そのものの抽象モデルと進行制御を提供する。

対象:

```text
Artifact
ArtifactRepository
Process
ProcessGate
ProcessExecutor
Cycle
CycleRepository
SemanticCompletionEvent
Spiral
```

Core は特定の Artifact 保存先、Process preset、GitHub、Quality Guard、CLI を知らない。

許可する依存:

```text
Core
└─ JavaScript / TypeScript 標準機能および Core 自身に必要な最小 dependency
```

禁止する依存:

```text
Core
-X-> @mydx/spiral-standard
-X-> @mydx/spiral-github
-X-> @mydx/spiral-standard-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
-X-> Octokit
-X-> Quality tooling
```

### 5.2 `@mydx/spiral-standard`

Standard Process package とする。

Core の抽象モデルを利用して、AI 駆動スパイラル開発で標準採用する Process と Artifact を定義する。

対象:

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

dependency:

```text
@mydx/spiral-standard
        ↓
ai-driven-spiral-development
```

禁止する依存:

```text
@mydx/spiral-standard
-X-> @mydx/spiral-github
-X-> @mydx/spiral-standard-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
-X-> Octokit
```

Standard Process は Artifact の意味と Process progression を定義するが、永続化方式を定義しない。

### 5.3 `@mydx/spiral-github`

GitHub transport / persistence foundation package とする。

特定の Process preset に依存せず、GitHub resource を Artifact persistence として扱うための汎用機能を提供する。

対象例:

```text
GitHub client abstraction
GitHub Issue / Pull Request access
GitHub Issue ID mapping
section parsing / writing foundation
GitHub resource lookup
GitHub resource persistence primitives
```

この package は Standard Process 固有 Artifact を知らない。

禁止する対象例:

```text
Demand
Requirement
ExternalSpec
Implementation
QAReport
Release
AcceptanceReport
StandardCycle
```

dependency:

```text
@mydx/spiral-github
        ↓
ai-driven-spiral-development
```

Core の契約を必要としない完全な transport utility は Core へ依存せず実装してもよい。

GitHub API client はこの package 内に隔離する。

```text
Octokit
```

禁止する依存:

```text
@mydx/spiral-github
-X-> @mydx/spiral-standard
-X-> @mydx/spiral-standard-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
```

### 5.4 `@mydx/spiral-standard-github`

Standard Process と GitHub persistence を結合する mapping package とする。

Standard Process 固有 Artifact を GitHub resource へ mappingする責務を持つ。

対象:

```text
DemandRepository
RequirementRepository
ExternalSpecRepository
ImplementationRepository
QAReportRepository
ReleaseRepository
AcceptanceReportRepository
StandardCycleRepository

DemandIssue mapping
RequirementIssue mapping
ExternalSpecIssue mapping
QA / Release / Acceptance mapping
StandardCycle の GitHub 復元
```

dependency:

```text
@mydx/spiral-standard-github
        ├─→ @mydx/spiral-standard
        ├─→ @mydx/spiral-github
        └─→ ai-driven-spiral-development
```

この package は Process progression を実行しない。

責務は Standard Process の Artifact contract と GitHub persistence primitive を接続することである。

禁止する依存:

```text
@mydx/spiral-standard-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
```

### 5.5 `@mydx/spiral-quality`

Quality Guard package とする。

生成・変更された software artifact が、定義された quality policy を満たしているか検査する。

対象例:

```text
dependency direction
responsibility boundary
unused code
duplication
complexity
file / class responsibility
static member policy
architecture constraint
```

Quality Guard は `Spiral`、`Cycle`、`Process` の runtime execution graph へ組み込まない。

必要な tooling dependency はこの package に隔離する。

```text
ESLint
ts-morph
Knip
dependency-cruiser
jscpd
```

Core の型や source structure を検査対象として扱う必要がある場合でも、許可する方向は次のみとする。

```text
@mydx/spiral-quality
        ↓
ai-driven-spiral-development
```

逆方向は許可しない。

### 5.6 `@mydx/spiral`

CLI / Composition Tool package とする。

Portable Distribution の component を利用 Repository へ選択的に導入する。

CLI 自身は Core model、Process、GitHub persistence、Process-specific mapping、Quality analysis logic を再実装しない。

CLI は最外層 Composition Root に位置する。

## 6. package 間依存方向

許可する主要 dependency graph:

```text
@mydx/spiral-standard
        ↓
ai-driven-spiral-development

@mydx/spiral-github
        ↓
ai-driven-spiral-development

@mydx/spiral-standard-github
        ├─→ @mydx/spiral-standard
        ├─→ @mydx/spiral-github
        └─→ ai-driven-spiral-development

@mydx/spiral-quality
  = runtime graph から独立

@mydx/spiral
  = 最外層 Composition Tool
```

重要な禁止依存:

```text
ai-driven-spiral-development → 外側 package

@mydx/spiral-standard → @mydx/spiral-github
@mydx/spiral-standard → @mydx/spiral-standard-github

@mydx/spiral-github → @mydx/spiral-standard
@mydx/spiral-github → @mydx/spiral-standard-github

@mydx/spiral-standard-github → @mydx/spiral

runtime package → @mydx/spiral-quality
```

## 7. Composition model

Artifact Adapter と Process preset は独立した選択軸とする。

```text
Artifact Adapter
×
Process preset
×
Quality Guard
```

ただし Artifact Adapter と Process の間には mapping / binding が必要になる場合がある。

その binding はどちらかの package 本体へ混在させず、組み合わせ package として表現する。

標準構成では次の対応になる。

```text
--artifact github
→ @mydx/spiral-github

--process standard
→ @mydx/spiral-standard

github × standard binding
→ @mydx/spiral-standard-github

--quality
→ @mydx/spiral-quality
```

したがって次の CLI は、互換 binding を含めて Composition する。

```bash
pnpm dlx @mydx/spiral init \
  --artifact github \
  --process standard \
  --quality
```

導入 package:

```text
ai-driven-spiral-development
@mydx/spiral-standard
@mydx/spiral-github
@mydx/spiral-standard-github
@mydx/spiral-quality
```

### Custom Process の場合

例えば次を選択する。

```text
--artifact github
--process custom
```

`@mydx/spiral-github` 自体は Standard Process を持ち込まない。

Custom Process 側は次のいずれかで GitHub mapping を提供する。

```text
project-specific mapping
独立した custom-process-github package
```

CLI は互換 binding が存在する場合のみ自動 Composition し、存在しない場合は利用側へ明示的な mapping 実装点を生成する。

## 8. install-time dependency boundary

### Core のみ

```bash
pnpm add ai-driven-spiral-development
```

GitHub / Standard / Quality dependency は入らない。

### Standard Process

```bash
pnpm add ai-driven-spiral-development @mydx/spiral-standard
```

GitHub / Quality dependency は入らない。

### GitHub foundation

```bash
pnpm add ai-driven-spiral-development @mydx/spiral-github
```

Standard Process は入らない。

### Standard Process + GitHub

```bash
pnpm add \
  ai-driven-spiral-development \
  @mydx/spiral-standard \
  @mydx/spiral-github \
  @mydx/spiral-standard-github
```

ここで初めて Standard Process 固有 GitHub mapping が導入される。

### Quality Guard

```bash
pnpm add -D @mydx/spiral-quality
```

Quality tooling dependency は Quality Guard を選択した Repository にのみ導入される。

## 9. public API

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
} from "ai-driven-spiral-development";
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
} from "@mydx/spiral-standard";
```

現在の `ai-driven-spiral-development/standard-process` は移行期間を経て `@mydx/spiral-standard` へ置き換える。

### GitHub foundation

```ts
import {
  GitHubIssue,
  GitHubIssueId,
  GitHubResourceClient,
} from "@mydx/spiral-github";
```

実際の public symbol は実装時に必要最小限へ確定する。

Standard Process 固有 Repository はここから export しない。

### Standard Process + GitHub mapping

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
} from "@mydx/spiral-standard-github";
```

### Quality Guard

```ts
import { runQualityGuard } from "@mydx/spiral-quality";
```

### CLI

```bash
pnpm dlx @mydx/spiral init
```

## 10. publish 単位

Portable Distribution の publish 単位は次の6 package とする。

```text
ai-driven-spiral-development
  = Core

@mydx/spiral-standard
  = Standard Process

@mydx/spiral-github
  = GitHub transport / persistence foundation

@mydx/spiral-standard-github
  = Standard Process 用 GitHub mapping

@mydx/spiral-quality
  = Quality Guard

@mydx/spiral
  = CLI / Composition Tool
```

同一 Repository の workspace として管理し、CI では package 間 dependency direction と互換性を検証する。

version compatibility は利用者へ丸投げしない。

基本方針:

- workspace 上で package 間を統合 test する
- 各 package が対応する dependency version range を明示する
- CLI が互換性のある package combination と binding を選択する
- breaking change 時は compatibility matrix を更新する
- 初期段階では関連 package の release version を揃えてよい

## 11. `spiral-template` から移植する実装

### `@mydx/spiral-github` へ移植

Process 固有知識を持たない GitHub 共通実装を移植する。

対象候補:

```text
GitHubIssue.ts
GitHubIssueId
GitHub Issue section parser / writer
GitHub client access
GitHub resource lookup primitive
```

実際の移植時には Standard Process 固有知識が混在していないか確認し、必要なら責務を分離する。

### `@mydx/spiral-standard-github` へ移植

Standard Process 固有 Artifact mapping を移植する。

対象:

```text
DemandIssue.ts
RequirementIssue.ts
ExternalSpecIssue.ts
AcceptanceCycleIssue.ts
QARequirementIssue.ts

DemandRepository.ts
RequirementRepository.ts
ExternalSpecRepository.ts
ImplementationRepository.ts
QAReportRepository.ts
ReleaseRepository.ts
AcceptanceReportRepository.ts

StandardCycleRepository
CycleFactory 等の Standard + GitHub 結合実装
```

これらの unit test も mapping package 側へ移す。

利用 Repository へ Repository 実装をコピーしない。

## 12. Quality Guard へ移植する実装

共通 quality analysis logic は `@mydx/spiral-quality` へ移す。

対象:

```text
scripts/quality/metrics.mjs
scripts/quality/duplication.mjs

architecture analysis
dependency analysis
responsibility boundary analysis
```

Quality Guard 自身の fixture / regression test も package 側へ移す。

```text
scripts/quality/fixture-checks.mjs
test/quality-fixtures/**
```

利用 Repository が Quality Guard 自体の検出能力を test する必要はない。

## 13. CLI resource へ移すもの

利用 Repository ごとの差分を持たず CLI が生成可能な template resource は `@mydx/spiral` 側で管理する。

```text
.github/ISSUE_TEMPLATE/**
.github/pull_request_template.md
.github/workflows/**
```

これらは library runtime API ではなく、CLI が利用 Repository へ materialize する resource とする。

## 14. 利用 Repository へ残すもの

Portable Distribution 導入後も project 固有の policy / Composition は利用 Repository へ存在する。

### `spiral.config.*`

```text
使用する Artifact Adapter
使用する Process
使用する mapping / binding
Execution Channel
Repository 固有設定
```

### `quality.config.*`

```text
対象 directory
除外 directory
threshold
architecture rule
責務境界
```

### `.github/**`

GitHub Artifact を利用する場合、Issue Template、PR Template、Workflow 等を CLI が生成する。

### project 固有 Execution Channel

Execution Channel は project ごとに異なるため Portable Distribution 側で固定しない。

```text
Codex
Slack
GitHub Actions
独自 Agent
```

Standard Process は Execution Channel の具体実装を知らない。

## 15. `spiral-template` の位置付け

Portable Distribution 完成後、`spiral-template` は distribution source ではない。

次のいずれか、または複数の役割を持つ reference Repository として残す。

```text
reference implementation
integration example
CLI 生成結果の sample
integration test target
```

Portable Distribution 利用のために `spiral-template` を fork / template generation する必要はない。

## 16. 拡張方針

将来別 Artifact Adapter を追加する場合も汎用 package と Process-specific mapping を分ける。

例:

```text
@mydx/spiral-jira
@mydx/spiral-standard-jira

@mydx/spiral-filesystem
@mydx/spiral-standard-filesystem
```

Custom Process についても同様に mapping package または project-specific mapping を追加できる。

```text
@company/custom-process
@company/custom-process-github
```

この構造により `Artifact Adapter × Process × Quality Guard` の独立 Composition を維持する。

## 17. 境界ルール

Portable Distribution では以下を不変条件とする。

1. Core は外部 Adapter を参照しない。
2. Core は Standard Process を参照しない。
3. Core 利用者へ GitHub / Quality tooling dependency を install させない。
4. Standard Process は GitHub を知らない。
5. GitHub foundation は Standard Process を知らない。
6. Process-specific GitHub mapping は独立 package に隔離する。
7. GitHub dependency は `@mydx/spiral-github` に隔離する。
8. Quality Guard は runtime execution graph へ混在しない。
9. Quality tooling dependency は `@mydx/spiral-quality` に隔離する。
10. CLI は各 component と互換 binding を Composition する最外層である。
11. 共通実装は利用 Repository へコピーしない。
12. project 固有 policy と Composition のみ利用 Repository へ残す。
13. Artifact Adapter と Process preset を独立した選択軸として維持する。

## 18. 後続 Issue での実装順序

この boundary を前提として次の順に実装する。

```text
1. monorepo / workspace publish structure を整備
2. Standard Process を @mydx/spiral-standard へ分離
3. GitHub 汎用基盤を @mydx/spiral-github として追加
4. Standard + GitHub mapping を @mydx/spiral-standard-github として追加
5. spiral-template の GitHub 実装を汎用基盤と mapping に分類して移植
6. Quality Guard を @mydx/spiral-quality として追加
7. Quality Guard 共通ロジック / fixture test を移植
8. @mydx/spiral CLI を実装
9. compatibility / binding resolution を実装
10. init resource 生成を実装
11. package compatibility / integration test を追加
```

各段階で次を検証する。

```text
@mydx/spiral-standard → Core
@mydx/spiral-github → Core

@mydx/spiral-standard-github
  → Standard
  → GitHub
  → Core
```

逆方向依存を許可しない。

また、Core の package install だけでは GitHub / Standard / Quality tooling dependency が導入されないこと、`@mydx/spiral-github` の install だけでは Standard Process が導入されないことを integration test で保証する。
