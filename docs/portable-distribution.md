# Portable Distribution package boundary

## 1. 目的

`ai-driven-spiral-development` を、特定の Template Repository に依存せず、既存の任意 Repository へ導入可能な Portable Distribution として提供する。

この文書では、Portable Distribution を構成する以下の責務境界、依存方向、publish 単位、public API、および利用 Repository へ残す責務を定義する。

- Core
- Standard Process
- GitHub Adapter
- Quality Guard
- CLI

重要なのは Repository 数そのものではなく、source-level dependency と install-time dependency の両方で責務境界を維持することである。

## 2. 採用する package 戦略

Portable Distribution では、責務ごとに npm package を分割する。

```text
ai-driven-spiral-development
  = Core

@mydx/spiral-standard
  = Standard Process

@mydx/spiral-github
  = GitHub Artifact Adapter

@mydx/spiral-quality
  = Quality Guard

@mydx/spiral
  = CLI / Composition Tool
```

### 採用理由

module 境界だけでは dependency 境界として不十分である。

例えば GitHub Adapter と Quality Guard を Core と同じ npm package に同梱し、Octokit、ESLint、ts-morph、Knip、dependency-cruiser、jscpd 等を通常の `dependencies` に含めると、Core のみを利用する Repository にも外部 Adapter / tooling dependency が install される。

これは次の原則に反する。

```text
Core は GitHub を知らない
Core は Quality Guard を知らない
Quality Guard は runtime graph から独立する
```

したがって Portable Distribution では source dependency だけでなく install-time dependency も責務境界に従わせる。

```text
Core 利用者
→ Core dependency のみ

Standard Process 利用者
→ Core + Standard Process

GitHub Adapter 利用者
→ Core + Standard Process + GitHub dependency

Quality Guard 利用者
→ Quality tooling dependency
```

CLI は各 package を選択的に導入する最外層 Composition Tool とする。

## 3. Repository 内構成

同一 GitHub Repository 内で monorepo として管理してよいが、npm publish 単位は分離する。

概念構成:

```text
packages/
├─ core/
│  └─ package.json
├─ standard/
│  └─ package.json
├─ github/
│  └─ package.json
├─ quality/
│  └─ package.json
└─ cli/
   └─ package.json
```

現在の `packages/core` / `packages/standard-cycle` / `packages/standard-process.ts` は後続実装で package 境界へ整理する。

Repository を分ける必要はない。workspace により同一 Repository で開発・test・release できる。

## 4. package 責務

### 4.1 `ai-driven-spiral-development`

Core package。

#### 責務

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

#### 許可する依存

```text
Core
└─ JavaScript / TypeScript 標準機能および Core 自身に必要な最小 dependency
```

#### 禁止する依存

```text
Core
-X-> @mydx/spiral-standard
-X-> @mydx/spiral-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
-X-> Octokit
-X-> GitHub tooling
-X-> Quality tooling
```

Core は Portable Distribution における最も内側の dependency boundary である。

### 4.2 `@mydx/spiral-standard`

Standard Process package。

#### 責務

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

標準 Process model:

```text
要求定義
↓
要件定義
↓
外部設計
↓
Engineering
↓
QA
↓
Release
↓
Acceptance
```

#### dependency

```text
@mydx/spiral-standard
        ↓
ai-driven-spiral-development
```

#### 禁止する依存

```text
@mydx/spiral-standard
-X-> @mydx/spiral-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
-X-> Octokit
```

Standard Process は Artifact の意味を定義するが、永続化方式を定義しない。

### 4.3 `@mydx/spiral-github`

GitHub Artifact Adapter package。

#### 責務

Core / Standard Process の Artifact を GitHub resource へ mapping する。

主な対象:

```text
GitHub Issue parsing
GitHub Issue ID mapping

DemandRepository
RequirementRepository
ExternalSpecRepository
ImplementationRepository
QAReportRepository
ReleaseRepository
AcceptanceReportRepository

StandardCycleRepository

GitHub 上の Cycle 復元
GitHub 上の Artifact 検索
GitHub Issue と Artifact 間の mapping
```

#### dependency

```text
@mydx/spiral-github
        ↓
@mydx/spiral-standard
        ↓
ai-driven-spiral-development
```

必要に応じて Core を直接 import してよい。

```text
@mydx/spiral-github → ai-driven-spiral-development
```

GitHub API client はこの package 内に隔離する。

例:

```text
Octokit
```

したがって Core / Standard Process のみを利用する Repository に Octokit は install されない。

#### 禁止する依存

```text
@mydx/spiral-github
-X-> @mydx/spiral-quality
-X-> @mydx/spiral
```

GitHub Adapter は persistence adapter であり、Process 進行を担当しない。

### 4.4 `@mydx/spiral-quality`

Quality Guard package。

#### 責務

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

Quality Guard は `Spiral` / `Cycle` / `Process` の runtime execution graph へ組み込まない。

#### dependency

原則として runtime package graph から独立する。

```text
@mydx/spiral-quality
```

必要な tooling dependency はこの package に隔離する。

例:

```text
ESLint
ts-morph
Knip
dependency-cruiser
jscpd
```

Core の型や source structure を検査対象として扱う必要が将来発生した場合でも、許可する方向は次のみとする。

```text
@mydx/spiral-quality
        ↓
ai-driven-spiral-development
```

逆方向は許可しない。

```text
ai-driven-spiral-development
-X-> @mydx/spiral-quality
```

### 4.5 `@mydx/spiral`

CLI / Composition Tool package。

#### 責務

Portable Distribution の component を利用 Repository へ選択的に導入する。

CLI 自身は Core model、Standard Process、GitHub persistence、Quality analysis logic を再実装しない。

#### dependency / composition

CLI は最外層に位置する。

```text
@mydx/spiral
├─→ ai-driven-spiral-development
├─→ @mydx/spiral-standard
├─→ @mydx/spiral-github
└─→ @mydx/spiral-quality
```

ただし `init` 時にすべての component を利用 Repository へ強制導入しない。

CLI option と package composition を対応させる。

```text
--process standard
→ @mydx/spiral-standard

--artifact github
→ @mydx/spiral-github

--quality
→ @mydx/spiral-quality
```

例:

```bash
pnpm dlx @mydx/spiral init \
  --artifact github \
  --process standard \
  --quality
```

## 5. package 間依存方向

許可する依存方向:

```text
@mydx/spiral-standard
        ↓
ai-driven-spiral-development

@mydx/spiral-github
        ↓
@mydx/spiral-standard
        ↓
ai-driven-spiral-development

@mydx/spiral-quality
  = runtime graph から独立

@mydx/spiral
  = 最外層 Composition Tool
```

より正確には次を許可する。

```text
@mydx/spiral-standard → ai-driven-spiral-development

@mydx/spiral-github → @mydx/spiral-standard
@mydx/spiral-github → ai-driven-spiral-development

@mydx/spiral-quality → ai-driven-spiral-development
  ※必要な場合のみ

@mydx/spiral → 各 component
```

禁止する代表例:

```text
ai-driven-spiral-development → @mydx/spiral-standard
ai-driven-spiral-development → @mydx/spiral-github
ai-driven-spiral-development → @mydx/spiral-quality
ai-driven-spiral-development → @mydx/spiral

@mydx/spiral-standard → @mydx/spiral-github
@mydx/spiral-standard → @mydx/spiral-quality
@mydx/spiral-standard → @mydx/spiral

@mydx/spiral-github → @mydx/spiral-quality
@mydx/spiral-github → @mydx/spiral
```

## 6. install-time dependency boundary

package 分割は source の見通しのためだけではなく、利用 Repository に install される dependency を責務単位に制御するために行う。

### Core のみ

```bash
pnpm add ai-driven-spiral-development
```

GitHub / Quality tooling dependency は入らない。

### Standard Process

```bash
pnpm add ai-driven-spiral-development @mydx/spiral-standard
```

GitHub / Quality tooling dependency は入らない。

### GitHub Adapter

```bash
pnpm add ai-driven-spiral-development @mydx/spiral-standard @mydx/spiral-github
```

ここで初めて GitHub client dependency が導入される。

### Quality Guard

```bash
pnpm add -D @mydx/spiral-quality
```

Quality tooling dependency は Quality Guard を選択した Repository にのみ導入される。

これにより `optionalDependencies` / `peerDependencies` による疑似的な境界ではなく、npm package boundary 自体で dependency isolation を保証する。

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
} from "ai-driven-spiral-development";
```

package root は Core 専用 public API とする。

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

現在の

```ts
import { Demand } from "ai-driven-spiral-development/standard-process";
```

は移行期間を経て `@mydx/spiral-standard` へ置き換える。

### GitHub Adapter

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
} from "@mydx/spiral-github";
```

内部 parser は利用側が直接必要としない限り public API に含めない。

### Quality Guard

```ts
import { runQualityGuard } from "@mydx/spiral-quality";
```

必要なら package 自身に executable entry point を持たせてもよい。

利用 Repository が `scripts/quality/metrics.mjs` 等を保持する設計にはしない。

### CLI

```bash
pnpm dlx @mydx/spiral init
```

CLI の TypeScript API を public contract とする必要はない。

## 8. publish 単位

Portable Distribution の publish 単位は以下の 5 package とする。

| package | publish responsibility |
| --- | --- |
| `ai-driven-spiral-development` | Core |
| `@mydx/spiral-standard` | Standard Process |
| `@mydx/spiral-github` | GitHub Artifact Adapter |
| `@mydx/spiral-quality` | Quality Guard |
| `@mydx/spiral` | CLI / Composition Tool |

同一 Repository の workspace として管理し、CI では package 間 dependency direction と互換性を検証する。

### version compatibility

package を分離しても version compatibility を利用者へ丸投げしない。

次を基本方針とする。

- workspace 上で package 間を統合 test する
- Adapter / Standard Process が対応する Core version range を `dependencies` / `peerDependencies` の適切な方で明示する
- CLI が互換性のある package combination を選択して install する
- breaking change 時は関連 package の compatibility matrix を更新する

初期段階では release version を揃える運用を採用してもよいが、package identity 自体は独立させる。

## 9. `spiral-template` から GitHub Adapter へ移植する実装

`spiral-template` の GitHub Issue を Artifact persistence として扱う共通実装は `@mydx/spiral-github` へ移植する。

対象:

```text
src/repository/GitHubIssue.ts
src/repository/*Issue.ts

src/repository/DemandRepository.ts
src/repository/RequirementRepository.ts
src/repository/ExternalSpecRepository.ts
src/repository/ImplementationRepository.ts
src/repository/QAReportRepository.ts
src/repository/ReleaseRepository.ts
src/repository/AcceptanceReportRepository.ts

StandardCycle を GitHub から復元する Repository
CycleFactory 等の GitHub 依存実装
```

これらの unit test も GitHub Adapter package 側へ移す。

利用 Repository へ Repository 実装をコピーしない。

## 10. Quality Guard へ移植する実装

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

対象:

```text
scripts/quality/fixture-checks.mjs
test/quality-fixtures/**
```

利用 Repository が Quality Guard 自体の検出能力を test する必要はない。

## 11. CLI resource へ移すもの

利用 Repository ごとの差分を持たず CLI が生成可能な template resource は `@mydx/spiral` 側で管理する。

対象:

```text
.github/ISSUE_TEMPLATE/**
.github/pull_request_template.md
.github/workflows/**
```

これらは library runtime API ではなく、CLI が利用 Repository へ materialize する resource とする。

## 12. 利用 Repository へ残すもの

Portable Distribution 導入後も project 固有の policy / Composition は利用 Repository へ存在する。

### `spiral.config.*`

スパイラル実行構成。

例:

```text
使用する Artifact Adapter
使用する Process
Execution Channel
Repository 固有設定
```

### `quality.config.*`

project 固有の quality policy。

例:

```text
対象 directory
除外 directory
threshold
architecture rule
責務境界
```

Quality Guard の実装は package に置き、policy は利用 Repository に置く。

### `.github/ISSUE_TEMPLATE/**`

GitHub Artifact を利用する場合に生成する。

### `.github/pull_request_template.md`

Repository 上の開発 operation に必要な場合に生成する。

### `.github/workflows/**`

CI は利用 Repository 内で実行されるため生成する。

Workflow から package 化された共通 Quality Guard を呼び、Quality Guard 本体をコピーしない。

### project 固有 Execution Channel

Execution Channel は project ごとに異なるため Portable Distribution 側で固定しない。

例:

```text
Codex
Slack
GitHub Actions
独自 Agent
```

Standard Process は Execution Channel の具体実装を知らない。

CLI は contract / stub / configuration point のみ生成可能とする。

## 13. 利用 Repository の最終形

概念例:

```text
application-repository/
├─ spiral.config.ts
├─ quality.config.mjs
├─ src/
│  └─ project-specific-code
└─ .github/
   ├─ ISSUE_TEMPLATE/
   ├─ pull_request_template.md
   └─ workflows/
```

次の共通実装は存在しない。

```text
src/repository/DemandRepository.ts
src/repository/RequirementRepository.ts
scripts/quality/metrics.mjs
scripts/quality/duplication.mjs
test/quality-fixtures/**
```

これらは package から利用する。

## 14. `spiral-template` の位置付け

Portable Distribution 完成後、`spiral-template` は distribution source ではない。

次のいずれか、または複数の役割を持つ reference Repository として残す。

```text
reference implementation
integration example
CLI 生成結果の sample
integration test target
```

Portable Distribution 利用のために `spiral-template` を fork / template generation する必要はない。

## 15. CLI による Composition

最終的な導入 UX:

```bash
pnpm dlx @mydx/spiral init \
  --artifact github \
  --process standard \
  --quality
```

選択と package の対応:

```text
--process standard
→ @mydx/spiral-standard

--artifact github
→ @mydx/spiral-github

--quality
→ @mydx/spiral-quality
```

CLI は選択された package のみ導入する。

例えば Core のみ必要な利用者へ GitHub Adapter や Quality Guard dependency を持ち込まない。

## 16. 拡張方針

将来別 Adapter を追加する場合も独立 package とする。

例:

```text
@mydx/spiral-filesystem
@mydx/spiral-jira
```

Process preset も同様に追加可能とする。

```text
@mydx/spiral-standard
@mydx/spiral-<custom-process>
```

CLI は特定 combination に固定せず、Artifact Adapter × Process × Quality Guard を Composition する位置付けを維持する。

## 17. 境界ルール

Portable Distribution では以下を不変条件とする。

1. Core は外部 Adapter を参照しない。
2. Core は Standard Process を参照しない。
3. Core 利用者へ GitHub / Quality tooling dependency を install させない。
4. Standard Process は GitHub を知らない。
5. GitHub Adapter は Artifact persistence を担当し、Process 進行を担当しない。
6. GitHub dependency は `@mydx/spiral-github` に隔離する。
7. Quality Guard は runtime execution graph へ混在しない。
8. Quality tooling dependency は `@mydx/spiral-quality` に隔離する。
9. CLI は各 component を Composition する最外層である。
10. 共通実装は利用 Repository へコピーしない。
11. project 固有 policy と Composition のみ利用 Repository へ残す。
12. public API は各 npm package の entry point 経由で公開する。

## 18. 後続 Issue での実装順序

この boundary を前提として次の順に実装する。

```text
1. monorepo / workspace publish structure を整備
2. Standard Process を @mydx/spiral-standard へ分離
3. GitHub Adapter を @mydx/spiral-github として追加
4. spiral-template の GitHub Repository 実装を移植
5. Quality Guard を @mydx/spiral-quality として追加
6. Quality Guard 共通ロジック / fixture test を移植
7. @mydx/spiral CLI を実装
8. init resource 生成を実装
9. package compatibility / integration test を追加
```

各段階で以下を検証する。

```text
@mydx/spiral-github
        ↓
@mydx/spiral-standard
        ↓
ai-driven-spiral-development
```

逆方向依存を許可しない。

また、Core の package install だけでは GitHub / Quality tooling dependency が導入されないことを integration test で保証する。
