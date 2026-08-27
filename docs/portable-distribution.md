# Portable Distribution package boundary

## 1. 目的

`ai-driven-spiral-development` を、特定の Template Repository に依存せず、既存の任意 Repository へ導入可能な Portable Distribution として提供する。

この文書では、Portable Distribution を構成する以下の責務境界、依存方向、publish 単位、public API、および利用 Repository へ残す責務を定義する。

- Core
- Standard Process
- GitHub Adapter
- Quality Guard
- CLI

Repository を分割すること自体を目的とはしない。重要なのは、同一 Repository 内であっても各 module の責務と依存方向を明確にし、Core を外部技術へ依存させないことである。

## 2. 採用する package 戦略

Portable Distribution では、次の 2 つの npm package を publish する。

```text
ai-driven-spiral-development
@mydx/spiral
```

役割は次の通りとする。

```text
ai-driven-spiral-development
├─ Core
├─ Standard Process
├─ GitHub Adapter
└─ Quality Guard

@mydx/spiral
└─ CLI
```

ライブラリ機能については複数 npm package へ分割せず、`ai-driven-spiral-development` の subpath export として公開する。

```text
ai-driven-spiral-development
ai-driven-spiral-development/standard-process
ai-driven-spiral-development/github
ai-driven-spiral-development/quality
```

CLI のみ独立した package とする。

```bash
pnpm dlx @mydx/spiral init
```

### 採用理由

Core、Standard Process、GitHub Adapter は同じスパイラル実行モデルを構成するライブラリであり、互いの version 互換性を独立して管理する必要性が現時点では低い。

複数 package へ分割すると、例えば以下の version 組み合わせを管理する必要が発生する。

```text
ai-driven-spiral-development@x
@mydx/spiral-github@y
@mydx/spiral-quality@z
```

Portable Distribution の初期段階では、この複雑性を導入する利益よりも、単一 package として互換性を保証する利益の方が大きい。

一方 CLI は、`pnpm dlx` から直接実行され、ファイル生成・package 導入を担当し、runtime library とは異なる release lifecycle を持ち得る。また CLI 固有 dependency を library 利用者へ持ち込みたくない。そのため `@mydx/spiral` として独立 publish する。

## 3. module 構成

Repository 内では次の責務境界を採用する。

```text
packages/
├─ core/
├─ standard-cycle/
├─ index.ts
├─ standard-process.ts
├─ github/
│  └─ index.ts
└─ quality/
   └─ index.ts

cli/
└─ ...
```

現在の以下の構造は維持する。

```text
packages/core/
packages/standard-cycle/
packages/index.ts
packages/standard-process.ts
```

`standard-cycle` は Standard Process の内部実装であり、直接の public entry point にはしない。

public API は必ず次の entry point を経由させる。

```text
packages/index.ts
packages/standard-process.ts
packages/github/index.ts
packages/quality/index.ts
```

内部ファイルパスを package 利用者へ公開しない。

## 4. 責務一覧

### 4.1 Core

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

Core は特定の Artifact 保存先、Process 構成、CI、GitHub、CLI 等を知らない。

#### 許可する依存

```text
Core
└─ JavaScript / TypeScript 標準機能
```

#### 禁止する依存

```text
Core
-X-> Standard Process
-X-> GitHub Adapter
-X-> Quality Guard
-X-> CLI
-X-> Octokit
-X-> GitHub
```

Core は Portable Distribution における最も内側の dependency boundary である。

### 4.2 Standard Process

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

Standard Process は次の標準 Process model を表現する。

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

#### 許可する依存

```text
Standard Process
↓
Core
```

#### 禁止する依存

```text
Standard Process
-X-> GitHub Adapter
-X-> Quality Guard
-X-> CLI
-X-> Octokit
```

Standard Process は Artifact の意味を定義するが、`Demand を GitHub Issue へ保存する` といった永続化方式は定義しない。

### 4.3 GitHub Adapter

#### 責務

Core および Standard Process の Artifact を GitHub 上の resource へ mapping する。

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

GitHub Adapter は GitHub Issue 等を Artifact persistence として利用するための Adapter である。

#### 許可する依存

```text
GitHub Adapter
├─→ Standard Process
│    └─→ Core
└─→ Core
```

外部 dependency として GitHub client を利用してよい。例: `Octokit`。

#### 禁止する依存

```text
GitHub Adapter
-X-> Quality Guard
-X-> CLI
```

#### 重要な境界

GitHub Adapter は Standard Process を実行しない。

例えば `DemandRepository` は Demand を GitHub Issue から復元する責務を持つが、`DemandDefinitionGate` を通過させる、次の Process を開始する、といった進行制御は担当しない。それらは Core / Standard Process 側の責務である。

### 4.4 Quality Guard

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

Quality Guard はスパイラルを進行させる runtime component ではない。`Spiral`、`Cycle`、`Process` の実行責務へ組み込まない。

#### 依存方向

原則として独立した tooling module とする。

```text
Quality Guard
```

Core への runtime 依存は持たない。

Core の型を検査対象として利用する必要が将来発生した場合でも `Quality Guard → Core` のみを許可し、`Core → Quality Guard` は許可しない。

#### 実行場所

Quality Guard は主に次の場所から呼び出される。

```text
package script
pre-commit hook
CI
CLI
```

### 4.5 CLI

#### 責務

Portable Distribution の各 component を利用 Repository へ Composition する。

CLI 自身は Core model や GitHub persistence の business logic を再実装しない。

`@mydx/spiral` は installer / composition tool として扱う。

#### 依存方向

```text
CLI
├─→ ai-driven-spiral-development
├─→ Standard Process
├─→ GitHub Adapter
└─→ Quality Guard
```

概念的には次の構造になる。

```text
CLI ───────────────────────┐
                           ↓
GitHub Adapter → Standard Process → Core

Quality Guard
```

CLI は最も外側の Composition Root である。

## 5. package 間依存方向

依存関係は次の方向だけを許可する。

```text
                    Core
                     ↑
                     │
              Standard Process
                     ↑
                     │
               GitHub Adapter
                     ↑
                     │
                    CLI

Quality Guard
     ↑
     │
    CLI
```

より正確には、以下を許可する。

```text
Standard Process → Core

GitHub Adapter → Standard Process
GitHub Adapter → Core

CLI → Core
CLI → Standard Process
CLI → GitHub Adapter
CLI → Quality Guard
```

Quality Guard は runtime dependency graph とは独立させる。

禁止する代表例:

```text
Core → GitHub Adapter
Core → Standard Process
Core → Quality Guard
Core → CLI

Standard Process → GitHub Adapter
Standard Process → CLI

GitHub Adapter → CLI

Quality Guard → GitHub Adapter
```

## 6. public API

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

package root は Core 専用 entry point とする。GitHub Adapter や Standard Process を root から re-export しない。

これにより、`import { DemandRepository } from "ai-driven-spiral-development";` のような外部技術の Core API への混入を防止する。

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
} from "ai-driven-spiral-development/standard-process";
```

既存の subpath export を維持する。

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
} from "ai-driven-spiral-development/github";
```

GitHub Adapter 内部の parser 等は、利用 Repository が直接使用する合理的な理由がない限り public export しない。

例えば `GitHubIssue`、`DemandIssue`、`ExternalSpecIssue` 等が Repository 実装の内部 detail に留まるのであれば export しない。

### Quality Guard

Quality Guard は JavaScript API を必要最小限公開する。

```ts
import { runQualityGuard } from "ai-driven-spiral-development/quality";
```

利用 Repository が `scripts/quality/metrics.mjs`、`scripts/quality/duplication.mjs` 等をコピーする設計にはしない。package 内実装を script または CLI から実行する。

## 7. package.json exports

最終的な library package は概念的に次の export を持つ。

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./standard-process": {
      "types": "./dist/standard-process.d.ts",
      "import": "./dist/standard-process.js"
    },
    "./github": {
      "types": "./dist/github/index.d.ts",
      "import": "./dist/github/index.js"
    },
    "./quality": {
      "types": "./dist/quality/index.d.ts",
      "import": "./dist/quality/index.js"
    }
  }
}
```

ただし存在しない entry point を先行して exports へ追加しない。

各 module の実装 Issue で `packages/github/index.ts`、`packages/quality/index.ts` が実際に生成された時点で対応する subpath export を追加する。

## 8. publish 単位

### ai-driven-spiral-development

以下を同一 version として publish する。

```text
Core
Standard Process
GitHub Adapter
Quality Guard
```

これらの内部互換性は package 自身が保証する。

### @mydx/spiral

CLI のみ別 package として publish する。

```text
@mydx/spiral
```

主な command:

```bash
pnpm dlx @mydx/spiral init
```

将来的に必要なら以下を追加する。

```bash
pnpm dlx @mydx/spiral check
pnpm dlx @mydx/spiral upgrade
```

CLI package は必要とする `ai-driven-spiral-development` version を dependency として宣言する。

## 9. `spiral-template` から移植する実装

### GitHub Adapter へ移植

`spiral-template` の GitHub Issue を Artifact persistence として扱う実装は GitHub Adapter へ移植する。

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

これらの unit test も GitHub Adapter 側へ移す。

GitHub persistence の正しさは Portable Distribution 自身が保証する。利用 Repository へ Repository 実装をコピーしない。

## 10. Quality Guard へ移植

共通 quality analysis logic は Quality Guard へ移す。

対象:

```text
scripts/quality/metrics.mjs
scripts/quality/duplication.mjs

architecture analysis
dependency analysis
responsibility boundary analysis
```

必要に応じて `dependency-cruiser`、`jscpd`、`knip`、`ts-morph`、`eslint` 等を内部実装として利用してよい。

ただし利用 Repository はそれらの実装 detail を直接意識しないことを目標とする。

## 11. package 自身の test へ移すもの

Quality Guard 自身の正しさを確認する fixture は利用 Repository へ生成しない。

対象:

```text
scripts/quality/fixture-checks.mjs
test/quality-fixtures/**
```

これらは `ai-driven-spiral-development` Repository 内の Quality Guard test へ移す。

例えば次を package 自身の CI で保証する。

```text
違反コード
↓
Quality Guard
↓
違反を検出

正常コード
↓
Quality Guard
↓
通過
```

利用 Repository が Quality Guard 自体を test する必要はない。

## 12. CLI resource へ移すもの

利用 Repository ごとの差分を持たず、CLI が生成可能な template resource は CLI package 側で管理する。

対象:

```text
.github/ISSUE_TEMPLATE/**
.github/pull_request_template.md
.github/workflows/**
```

これらは npm package の runtime API ではなく、CLI が利用 Repository へ materialize する resource として扱う。

## 13. 利用 Repository へ残すもの

Portable Distribution 導入後も、project 固有の policy または Composition は利用 Repository へ存在する。

### spiral.config.*

スパイラル実行構成。

例:

```text
使用する Artifact Adapter
使用する Process
Execution Channel
Repository 固有設定
```

### quality.config.*

project 固有の quality policy。

例:

```text
対象 directory
除外 directory
threshold
architecture rule
責務境界
```

Quality Guard の実装は package へ置くが、policy は利用 Repository へ置く。

### .github/ISSUE_TEMPLATE/**

GitHub Artifact を利用する Repository では生成する。これは GitHub 上の human / agent interface であり、Repository に存在する必要がある。

### .github/pull_request_template.md

Repository 上の開発 operation に必要なため生成対象とする。

### .github/workflows/**

CI は利用 Repository 内で GitHub Actions から実行されるため生成対象とする。ただし Workflow 内から共通 quality implementation を呼び出し、Quality Guard 本体を Workflow へコピーしない。

### project 固有 Execution Channel

Execution Channel は project ごとに異なるため Portable Distribution 側で固定しない。

例:

```text
Codex
Slack
GitHub Actions
独自 Agent
```

Standard Process は Execution Channel の具体実装を知らない。CLI は必要な contract または stub だけを生成可能とする。

## 14. 最終的な利用 Repository

Portable Distribution 導入後の利用 Repository は概念的に次の状態となる。

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

これらは npm package から利用する。

## 15. `spiral-template` の位置付け

Portable Distribution 完成後、`spiral-template` は distribution source ではない。

次のいずれか、または複数の役割を持つ reference Repository として残す。

```text
reference implementation
integration example
CLI 生成結果の sample
integration test target
```

Portable Distribution 利用のために `spiral-template` を fork または template 生成する必要はない。

## 16. CLI による Composition

最終的な導入 UX は次を基本とする。

```bash
pnpm dlx @mydx/spiral init \
  --artifact github \
  --process standard
```

CLI は選択された component を Composition する。

```text
--artifact github
        ↓
GitHub Adapter

--process standard
        ↓
Standard Process
```

Quality Guard を選択した場合は Quality Guard を追加する。

CLI は GitHub Adapter、Standard Process、Quality Guard、Core の実装を利用 Repository へコピーしない。必要 package を install し、project 固有 config と GitHub resource だけを生成する。

## 17. 拡張方針

この境界により、将来別 Adapter を追加できる。

例:

```text
ai-driven-spiral-development/github
ai-driven-spiral-development/filesystem
ai-driven-spiral-development/jira
```

同様に Process model も交換可能とする。

```text
standard process
custom process
```

CLI は特定の組み合わせへ固定せず、`Artifact Adapter × Process × Quality Guard` を Composition する位置付けを維持する。

## 18. 境界ルール

Portable Distribution では以下を不変条件とする。

1. Core は外部 Adapter を参照しない。
2. Core は Standard Process を参照しない。
3. Standard Process は GitHub を知らない。
4. GitHub Adapter は Artifact persistence のみを担当し、Process 進行を担当しない。
5. Quality Guard は Core の runtime execution へ混在しない。
6. CLI は各 component を Composition する最外層である。
7. 共通実装は利用 Repository へコピーしない。
8. project 固有 policy と Composition のみ利用 Repository へ残す。
9. public API は entry point 経由で公開し、内部 directory を API 化しない。
10. 存在しない subpath export を先行公開しない。

## 19. 後続 Issue での実装順序

この boundary を前提として、Portable Distribution は次の順に実装する。

```text
1. GitHub Adapter module を追加
2. spiral-template の GitHub Repository 実装を移植
3. GitHub Adapter subpath export を公開
4. Quality Guard module を追加
5. Quality Guard 共通ロジックを移植
6. fixture test を package 側へ移植
7. Quality Guard subpath export を公開
8. @mydx/spiral CLI を実装
9. init resource 生成を実装
10. Portable Distribution integration test を追加
```

各段階で依存方向を検証し、次の逆方向依存を発生させない。

```text
CLI
↓
GitHub Adapter
↓
Standard Process
↓
Core
```
