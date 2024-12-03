# Qiita用記事リポジトリ

このリポジトリは、[Blog-Project](https://github.com/SolitudeRA/Blog-Project) のサブリポジトリとして、Qiita向けの記事管理および公開を効率化するために使用されます。GitHub Actionsを活用し、記事の自動更新、シリーズリンク生成、公開プロセスを自動化します。

---

## 特徴

- **Qiita記事管理**  
  Qiita用の記事の自動更新、シリーズリンクの生成、公開プロセスを一元管理。

- **自動化ワークフロー**  
  GitHub Actionsを活用し、記事の解析、同期、公開を完全自動化。

- **シリーズリンク生成**  
  記事内のシリーズ情報に基づき、自動的にリンクを生成し挿入します。

---

## ディレクトリ構成

```
.
├── pre-publish/     # 公開前の記事を格納するディレクトリ
├── public/          # Qiita上で公開する記事を格納するディレクトリ
│   └── .remote/     # Qiitaのリモートデータを同期するディレクトリ
├── scripts/         # 自動化スクリプト
│   ├── parse-articles.js         # 記事を解析し、公開準備を行うスクリプト
│   ├── generate-series-links.js  # シリーズリンクを生成するスクリプト
│   └── sync-remote-to-public.js  # Qiitaのリモート記事をローカルに同期するスクリプト
├── .github/         # GitHub Actions設定
│   └── workflows/
│       └── publish_articles.yml  # 記事公開を自動化するワークフロー
├── qiita.config.json # Qiita CLI用の設定ファイル
├── LICENSE          # ライセンスファイル
└── README.md        # このファイル
```

## 必要なセットアップ

### 1. **リポジトリのクローン**

以下のコマンドでリポジトリをクローンします：

```bash
git clone https://github.com/SolitudeRA/qiita-repo.git
cd qiita-repo
```

### 2. **依存パッケージのインストール**

Node.jsがインストールされていることを確認し、以下のコマンドを実行してください：

```bash
npm install
```

### 3. **Qiitaトークンの生成とGitHub Secretsの設定**

#### Qiitaトークンの生成

1. Qiitaの[アクセストークンページ](https://qiita.com/settings/tokens/new)にアクセスします。
2. **"新しいアクセストークンを発行"** をクリックします。
3. 必要なスコープを選択します：
   - **`read_qiita`**: 記事の読み取り権限。
   - **`write_qiita`**: 記事の作成および更新権限。
4. トークンを生成し、コピーします（トークンは一度しか表示されませんのでご注意ください）。

#### GitHub Secretsへの登録

1. このリポジトリの **Settings** > **Secrets and variables** > **Actions** に移動します。
2. **"New repository secret"** をクリックします。
3. 以下の情報を入力します：
   - **Name**: `QIITA_REPO_TOKEN`
   - **Secret**: 生成したQiitaトークンを貼り付けます。
4. 保存をクリックします。

---

### 4. **GitHub Actionsのリポジトリ権限の設定**

GitHub Actionsがリポジトリに変更をプッシュできるようにするため、リポジトリの書き込み権限を付与する必要があります。

1. **Settings** > **Actions** > **General** に移動します。
2. **Workflow permissions** のセクションで、以下を選択します：
   - **"Read and write permissions"**
3. **Save** をクリックして設定を保存します。

## ワークフローの概要

以下は、このリポジトリで実行されるGitHub Actionsの処理の流れです：

1. **Qiitaリモート記事をローカルに同期**  
   Qiitaから既存の記事を取得し、ローカルの `public/.remote` ディレクトリに同期。

2. **記事の解析**  
   `pre-publish` 内の記事を解析し、Qiitaで公開可能な形式に変換。

3. **シリーズリンクの生成**  
   記事の `series` メタデータに基づいてシリーズリンクを生成し、記事に挿入。

4. **記事の公開**  
   `npx qiita publish` コマンドを利用して記事をQiitaに公開。

5. **再同期と再公開**  
   記事公開後、Qiita上の更新を再取得し、リンクの整合性を確認したうえで再公開。

---

## 使用方法

1. 自動的にメインリポジトリ`blog-project` から記事の追加または更新のコミットを受け。
2. GitHub Actions が自動的に以下の処理を実行します：
   - 記事の `local_updated_at` の自動更新。
   - 記事の解析とリンク生成。
   - Qiita リポジトリへの公開。

---

## ライセンス

このリポジトリは [MITライセンス](LICENSE) のもとで公開されています。