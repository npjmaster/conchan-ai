# 献ちゃんAI

Next.js / TypeScript / PostgreSQL / Prisma / Auth.js / OpenAI API で作る MVP Phase 1 です。

## 起動手順

1. 依存関係をインストールします。

```bash
npm install
```

2. `.env.example` をコピーして `.env` を作成し、`DATABASE_URL` と `NEXTAUTH_SECRET` を設定します。

```bash
cp .env.example .env
```

3. Prisma を生成し、DBマイグレーションを実行します。

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. 開発サーバーを起動します。

```bash
npm run dev
```

`http://localhost:3000` を開いてください。

## OpenAI API

`OPENAI_API_KEY` が設定されている場合のみ OpenAI API を使用します。未設定の場合は、同じJSON形式のモック献立と買い物リストで動作します。

初期モデルは `.env.example` の `OPENAI_MODEL="gpt-5.5"` です。APIキーはサーバー側API Routeだけで使用し、フロントエンドには埋め込みません。

## Phase 1 実装範囲

- トップページ
- お試し献立生成画面
- ユーザー登録
- ログイン
- ユーザー設定
- 献立生成
- レシピ検索リンク表示
- 買い物リストたたき台生成
- 買い物リスト表示

材料貼り付けAI解析、CSV/TXT出力、SEO記事、アフィリエイト、スマホアプリ、決済は未実装です。
