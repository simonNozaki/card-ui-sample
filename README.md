# Card UI sample

Vue 2 SSRでレンダリングさせる、ビルド構成のサンプルプロジェクト。カードUIの実装例をホストする(予定)。

## UI技術スタック

Vue 2をターゲットにしているので、ビルド系のツールチェーンも少し古めの構成になっている。

- Vue 2.7.16
  - vue-server-renderer
  - vue-template-compiler
- Webpack 4.47.0
  - ts-loader
  - vue-loader
- Express.js
- TypeScript 5.7.2


## 開発

Node.js 20+, pnpm 9.0.6 を用意する。

```bash
# パッケージインストール
pnpm install

# バンドルのビルド
pnpm build

# アプリケーションの起動
pnpm start
```
