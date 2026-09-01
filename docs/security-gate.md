# Security Gate

このリポジトリは、通常の品質CIとは別にソフトウェアサプライチェーン向けのSecurity Gateを実行する。

## PRで実行する検査

### Dedicated secret scanning

TruffleHogを固定versionのrelease binaryとして取得し、公開されたSHA-256 checksumと照合してからPR差分のGit履歴を走査する。`verified` / `unknown` secret detector resultが見つかった場合は`--fail`によりSecurity Gateを失敗させる。

TruffleHogはAPI key、database credential、private key等、多数のcredential detectorを持つ専用secret scannerであり、単純な正規表現だけでは拾えないsecret混入を検出する。外部Actionとしては実行せず、versionと配布物checksumを固定している。

### Repository security checks

`scripts/security-gate.mjs` が補助的に次を検査する。

- 既知形式のcredential / private keyが追跡対象テキストへ混入していないこと
- `eval`、`new Function`、download-and-execute shellのような高リスク構文がproduction sourceへ追加されていないこと
- `.github/workflows` の外部Actionが40文字のcommit SHAへ固定されていること
- 公開packageにinstall / postinstall等のlifecycle scriptが追加されていないこと
- 公開packageが`files` allowlistを宣言していること

検出した場合はSecurity Gateが失敗し、通常CIへ進まない。

### Dependency audit

`pnpm audit --prod --audit-level high` でproduction dependencyの既知脆弱性を検査する。high / criticalの既知脆弱性が報告された場合はSecurity Gateを失敗させる。

### CodeQL

GitHub CodeQLの`javascript-typescript` + `security-extended` query suiteをPRごとに実行する。CodeQLはデータフローを含む静的解析を担当し、repository-localな高リスク構文検査を補完する。

## Supply-chain hardening

- CI / Publishで利用するGitHub Actionsはtagではなくcommit SHAへ固定する。
- DependabotでnpmとGitHub Actionsの更新を週次監視する。
- CI / Publishのdependency installは`--ignore-scripts`を使用し、依存packageのinstall / postinstallを実行しない。
- Publish jobだけにnpm Trusted Publishing用の`id-token: write`を与え、それ以外は原則`contents: read`とする。
- 各公開packageは`files` allowlistで配布対象を限定する。
- CIとPublishの両方で`npm pack --dry-run`を実行し、実際のtarball対象をログへ出す。
- npm publishは`--provenance`を維持する。

## 防げること

このGateは、既知の重大dependency脆弱性、専用secret scannerが分類できるcredentialの混入、代表的なsecret形式、明示的な高リスクJavaScript実行構文、未固定GitHub Action、package lifecycle scriptの追加、publish対象の無制限化などを機械的にブロックする。またCodeQLにより、単純な文字列検査では扱いにくい脆弱なデータフローを検出可能にする。

## 防げないこと

Security Gateだけで、悪意あるコードや未知の脆弱性を完全には判定できない。特に以下は別途レビューやGitHub/npm側の保護機能も必要になる。

- 正常なコードに見える意図的なバックドア
- 公開前で脆弱性DBに登録されていない0-day
- TruffleHogのdetectorでも分類できない独自形式・難読化済みsecret
- SHA固定したActionの固定先commit自体が悪意ある場合
- npm registry、GitHub、CI runner等の基盤側侵害
- business logic上の認可不備や仕様上のセキュリティ欠陥

したがってSecurity Gateは人間のレビューを置き換えるものではなく、PR・依存関係・CI/CD・publish経路に機械的な防御層を追加するためのものとして扱う。
