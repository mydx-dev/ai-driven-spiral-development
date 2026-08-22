# AI-Driven Spiral Development

AIを前提にスパイラル開発を高速・低コストで実行するための
理論、開発プロセス、アーキテクチャ、実装方法をまとめたリポジトリです。

## Core Idea

要求を完全に確定してから作るのではなく、
成果物をクライアントが評価することで要求の解像度を高め、
次のCycleへ反映します。

AIは要求そのものを決める主体ではなく、
要求合意後の要件定義・設計・実装・検証を高速化するために利用します。

## Principles

- Requirement is a hypothesis
- Requirements may become more specific across cycles
- AI may infer unspecified requirements after requirement agreement
- Change cost must be minimized
- Change Locality and Context Locality are first-class design goals
- Tests enforce behavior
- Static analysis enforces architecture
- Human judgment remains at key gates

## Development Flow

Requirement
→ Agreement
→ Requirement Definition
→ External Design
→ Engineering
→ QA
→ Delivery
→ Feedback
→ Next Cycle

## Documents

- [Theory](docs/theory/spiral-development.md)
- [Development Process](docs/process/cycle.md)
- [Application Architecture](docs/architecture/application-architecture.md)
- [Verification Strategy](docs/architecture/verification-strategy.md)
- [ChatGPT / GitHub / Codex Implementation](docs/implementation/)
