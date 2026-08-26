# ai-driven-spiral-development

AIやエージェントを使った反復型のソフトウェア開発を、**Process単位で観測・判定しながら進行制御するためのTypeScriptライブラリ**です。

このライブラリは、LLMやAIエージェントによる生成処理そのものを提供するものではありません。

GitHub、Slack、CI、データベース、AIエージェントなどの外部システムを利用して生成・更新された成果物を `Artifact` として観測し、`ProcessGate` による決定的な完了判定を通じて、`Cycle` と `Spiral` の進行を制御します。

```text
非決定的な生成
AI / Agent / Human / External System
        ↓
Artifact
        ↓
ProcessGate
        ↓
決定的な進行制御
Cycle / Spiral
```

生成処理が非決定的であっても、Process境界では観測可能な成果物を使って構造的完了を判定することが、このライブラリの基本方針です。

## Installation

```bash
npm install ai-driven-spiral-development
```

pnpm:

```bash
pnpm add ai-driven-spiral-development
```

yarn:

```bash
yarn add ai-driven-spiral-development
```

## Concepts

### Artifact

Processが生成・更新し、Gateが観測する成果物です。

```ts
interface Artifact {
  readonly id: string;
}
```

Artifactの保存先はライブラリでは規定しません。

GitHub Issue、Pull Request、Database、File、外部APIなど、任意の状態を `ArtifactRepository` を通してArtifactとして復元できます。

### Process

開発工程の1単位です。

Processは以下をまとめます。

```text
ArtifactRepository
ProcessGate
ProcessExecutor
```

Process開始時にはExecutorを呼び出し、意味的完了が通知された後にはArtifactをRepositoryから取得してGateを評価します。

### ProcessGate

Artifactを観測して、そのProcessが構造的に完了したかを判定します。

```ts
type GatePass =
  | {
      passed: true;
    }
  | {
      passed: false;
      errors: string[];
    };
```

Gateは外部サービスを直接操作する場所ではありません。

「何が成立すれば完了なのか」を定義します。

### ProcessExecutor

Process開始時やretry時に、外部の実行主体へ処理を依頼します。

実際の実行先は `ExecutionChannel` として利用側が実装します。

例えば以下のようなものを接続できます。

```text
AI Agent
Slack
GitHub
Queue
HTTP API
CLI
```

### Cycle

複数のProcessを順番に束ねる反復単位です。

```text
Process A
↓
Process B
↓
Process C
↓
Cycle Completion
```

`Cycle.route()` によってProcessを登録します。

### SemanticCompletionEvent

Processを実行した主体が、

> このProcessについて意味的には作業が完了した

と通知するためのイベントです。

Semantic Completion Eventが発生しても、Processが即座に完了するわけではありません。

その後にProcessGateがArtifactを検証し、構造的完了を判定します。

### Spiral

Cycle全体の進行を制御します。

Semantic Completion Eventを受け取り、

- ProcessGateの評価
- retry
- 次Processの開始
- Cycle完了
- 次Cycleの開始

を制御します。

## Quick Start

以下は、1つのProcessを持つ最小構成です。

```ts
import {
  type Artifact,
  type ArtifactRepository,
  Cycle,
  type CycleFeedbackResult,
  type CycleRepository,
  Process,
  ProcessExecutor,
  type ProcessGate,
  SemanticCompletionEvent,
  Spiral,
} from "ai-driven-spiral-development";

class RequirementArtifact implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly completed: boolean,
  ) {}
}

class RequirementArtifactRepository implements ArtifactRepository<RequirementArtifact> {
  public readonly artifacts: RequirementArtifact[] = [];

  async find(id: string) {
    return this.artifacts.find((artifact) => artifact.id === id);
  }

  async findByCycle(cycleId: string) {
    return this.artifacts.filter((artifact) => artifact.cycleId === cycleId);
  }

  async save(artifact: RequirementArtifact) {
    this.artifacts.push(artifact);
  }
}

const requirementArtifactRepository = new RequirementArtifactRepository();

const requirementGate: ProcessGate<RequirementArtifact> = {
  verifyStructuralComplete(artifacts) {
    if (artifacts.length === 0) {
      return {
        passed: false,
        errors: ["Requirement Artifactが存在しません"],
      };
    }

    if (artifacts.some((artifact) => !artifact.completed)) {
      return {
        passed: false,
        errors: ["Requirementが完了していません"],
      };
    }

    return {
      passed: true,
    };
  },
};

const requirementExecutor = new ProcessExecutor<string, RequirementArtifact>({
  channel: {
    async send(message) {
      console.log(message);
    },
  },

  createStartMessage(cycleId) {
    return `Requirement Definitionを開始してください: ${cycleId}`;
  },

  createRetryMessage(cycleId, errors) {
    return [
      `Requirement Definitionを再実行してください: ${cycleId}`,
      ...errors,
    ].join("\n");
  },
});

const requirementDefinition = new Process({
  name: "Requirement Definition",
  artifactRepository: requirementArtifactRepository,
  gate: requirementGate,
  executor: requirementExecutor,
});

class DevelopmentCycle extends Cycle {
  constructor(public readonly id: string) {
    super();
  }

  fallback(_processName: string): this {
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle: false,
    };
  }
}

const CycleDefinition = DevelopmentCycle.route(requirementDefinition);

const cycle = new CycleDefinition("cycle-1");

class InMemoryCycleRepository implements CycleRepository<
  InstanceType<typeof CycleDefinition>
> {
  public readonly cycles = new Map<
    string,
    InstanceType<typeof CycleDefinition>
  >();

  async create() {
    return new CycleDefinition(crypto.randomUUID());
  }

  async find(id: string) {
    return this.cycles.get(id);
  }

  async save(cycle: InstanceType<typeof CycleDefinition>) {
    this.cycles.set(cycle.id, cycle);
  }
}

const cycleRepository = new InMemoryCycleRepository();

await cycleRepository.save(cycle);

// 最初のProcessを開始する
await cycle.start();

// 実際にはAI、GitHub、DBなどによってArtifactが生成・更新される
await requirementArtifactRepository.save(
  new RequirementArtifact("requirement-1", "cycle-1", true),
);

// 実行主体から意味的完了を通知する
const event = new SemanticCompletionEvent({
  cycleId: "cycle-1",
  name: "Requirement Definition",
  cycleDefinition: CycleDefinition,
});

const spiral = new Spiral<typeof CycleDefinition>({
  cycleRepository,

  cycleFactory: async () => new CycleDefinition(crypto.randomUUID()),
});

await spiral.circulate(event);
```

この例では以下の順序で処理されます。

```text
cycle.start()
↓
Requirement Definition Executor
↓
Artifact生成
↓
SemanticCompletionEvent
↓
RequirementGate
↓
passed: true
↓
Cycle完了
```

## Process Lifecycle

Processの進行は、Executorの終了だけでは決まりません。

```text
Process.start()
↓
Executor
↓
外部システムが処理
↓
Artifact生成・更新
↓
Semantic Completion Event
↓
ArtifactRepository.findByCycle()
↓
ProcessGate
├─ passed: false
│    ↓
│  fallback
│    ↓
│  retry
│
└─ passed: true
     ↓
   次Process開始
```

重要なのは、**Executor自身が次Processへ進めない**ことです。

Executorは外部の実行主体を呼び出すだけです。

Processの完了は、Artifactを観測したProcessGateによって決定されます。

## Core API

Core APIはpackage rootからimportします。

```ts
import {
  Artifact,
  ArtifactRepository,
  Process,
  ProcessGate,
  ProcessExecutor,
  ExecutionChannel,
  Cycle,
  CycleRepository,
  Spiral,
  SemanticCompletionEvent,
} from "ai-driven-spiral-development";
```

Coreは開発Processそのものを固定しません。

独自のArtifact、Gate、Executor、Cycleを組み合わせるための制御構造を提供します。

## Standard Process

このライブラリには、AI駆動スパイラル開発の理論で定義した標準Processモデルも含まれています。

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
  DemandDefinitionGate,
  RequirementDefinitionGate,
  ExternalDesignGate,
  EngineeringGate,
  QAGate,
  ReleaseGate,
  AcceptanceGate,
} from "ai-driven-spiral-development/standard-process";
```

標準Processは以下の順序を想定しています。

```text
Demand Definition
↓
Requirement Definition
↓
External Design
↓
Engineering
↓
QA
↓
Release
↓
Acceptance
```

Standard Processは、これらのProcessで利用するArtifactモデルとGateを提供します。

ただし、RepositoryやExecutorは提供しません。

例えばEngineering Processで、

```text
Implementation
```

をどのように取得するかは利用側が決定します。

GitHubを利用する場合、

```text
Pull Request
CI
Review
Merge状態
```

などから `Implementation` を復元するRepositoryを実装できます。

Databaseや別の開発基盤を利用する場合は、その環境に合わせたRepositoryを実装できます。

## StandardCycle

`StandardCycle` は標準的なCycle feedbackモデルを提供します。

```ts
import { StandardCycle } from "ai-driven-spiral-development/standard-process";
```

```ts
const cycle = new StandardCycle("cycle-1", "none", "none");
```

Demandの追加または変更が存在する場合、次Cycleが必要と判定されます。

```text
newDemand === "exists"
or
changedDemand === "exists"

↓
needNextCycle: true
```

StandardCycleも通常のCycleと同様に、`route()` を使ってProcessを構成します。

```ts
const CycleDefinition = StandardCycle.route(demandDefinition)
  .route(requirementDefinition)
  .route(externalDesign)
  .route(engineering)
  .route(qa)
  .route(release)
  .route(acceptance);
```

Processそのものは利用側でRepository、Gate、Executorを組み合わせて定義します。

## Custom Process

Standard Processの利用は必須ではありません。

独自のProcessを追加、削除、置換できます。

例えば独自のSecurity Review Processを追加できます。

```ts
import {
  type Artifact,
  Process,
  ProcessExecutor,
  type ProcessGate,
} from "ai-driven-spiral-development";

class SecurityReview implements Artifact {
  constructor(
    public readonly id: string,
    public readonly approved: boolean,
  ) {}
}

const securityReviewGate: ProcessGate<SecurityReview> = {
  verifyStructuralComplete(artifacts) {
    if (!artifacts.some((artifact) => artifact.approved)) {
      return {
        passed: false,
        errors: ["Security Reviewが承認されていません"],
      };
    }

    return {
      passed: true,
    };
  },
};

const securityReview = new Process({
  name: "Security Review",
  artifactRepository: securityReviewRepository,
  gate: securityReviewGate,
  executor: securityReviewExecutor,
});
```

そして通常のProcessと同じようにCycleへ登録できます。

```ts
const CycleDefinition = MyCycle.route(engineering)
  .route(securityReview)
  .route(qa);
```

標準Processの途中へ独自Processを追加することも、標準Processを使わず完全に独自のCycleを構成することもできます。

## Integration Responsibilities

このライブラリはGitHub専用でも、特定のAIエージェント専用でもありません。

責務は次のように分離します。

```text
Core / Standard Process

何を成果物として観測するか
何が成立すればProcess完了なのか
どの順番でProcessを進めるか

────────────────────────

Repository / Executor / ExecutionChannel

GitHubをどう読むか
Databaseをどう読むか
Slackへどう送るか
AI Agentをどう起動するか
CIの状態をどう取得するか
```

例えば、

```text
GitHub Issue
↓
ArtifactRepository
↓
Artifact
↓
ProcessGate
```

という構成もできますし、

```text
Database
↓
ArtifactRepository
↓
Artifact
↓
ProcessGate
```

でも構いません。

同様にExecutorの実行先も、

```text
Slack
GitHub
AI Agent
HTTP API
Queue
```

など任意です。

外部サービス固有の処理をCoreへ持ち込まず、Repository / Executor境界で吸収することを想定しています。

## Architecture

全体像は以下です。

```text
                    SemanticCompletionEvent
                              │
                              ▼
                         ┌─────────┐
                         │ Spiral  │
                         └────┬────┘
                              │
                              ▼
                         ┌─────────┐
                         │  Cycle  │
                         └────┬────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
         ┌─────────┐                    ┌─────────┐
         │ Process │                    │ Process │
         └────┬────┘                    └─────────┘
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
 Repository  Gate   Executor
      │                 │
      ▼                 ▼
  Artifact       ExecutionChannel
                         │
                         ▼
                External System
```

## Documentation

READMEは利用開始のためのガイドです。

AI駆動スパイラル開発の背景や理論については `docs/theory` を参照してください。

- [事前準備](docs/theory/0.preparation.md)
- [AI駆動スパイラル開発](docs/theory/1.spiral-development.md)
- [サイクルモデル](docs/theory/2.cycle-model.md)
- [標準プロセスモデル](docs/theory/3.process-model.md)
- [Engineeringプロセス](docs/theory/4.process-model.md)
- [QA / Release / Acceptance](docs/theory/5.process-model.md)
- [Change Locality / Context Locality](docs/theory/6.change-context-locality.md)

## Package

npm:

https://www.npmjs.com/package/ai-driven-spiral-development

GitHub:

https://github.com/mydx-dev/ai-driven-spiral-development

Current package version:

```text
1.0.1
```

## License

ISC
