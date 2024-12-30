# 設定のゴール
src 配下のVue/TypeScriptファイルをビルドしてホストできるようにする。
以下、あえてWebpack 4系・Vue 2.7 x SSRをターゲットにビルド設定を書く。

# Webpack, loaderの導入・設定
### WebpackとCLI
ドキュメント: https://v4.webpack.js.org/guides/getting-started/

基本的にはWebpackの公式に沿ってセットアップを進め、Webpack v4をインストール。`webpack-cli` がないと `webpack` コマンドでビルドを実行できない。
```bash
npm install webpack@4.x  webpack-cli@3.x --save-dev
```

### vue-loader
vue-loaderは、Vueファイルを読んでプレーンなJavaScriptにするVue用のローダー。
vue-loader はVue 3でも引き続きWebpackのローダーとして使われているので、バージョンを下げてVue 2に合わせておく。
- vue-template-compiler もあわせて必要らしいので、Vueのバージョンに揃えておく
```bash
npm install -D vue-loader@15.11.1 vue-template-compiler@2.7.16
```

ビルドして成果物ができることを確認。できたら、package.jsonのscriptに追加しておく。
```bash
npx webpack --config webpack.config.ts
```

## TypeScript対応
### webpack config自体をTypeScriptでかけるようにする
ドキュメント
- https://v4.webpack.js.org/configuration/configuration-languages/#typescript
- https://v2.ja.vuejs.org/v2/guide/typescript#%E6%8E%A8%E5%A5%A8%E6%A7%8B%E6%88%90

Webpack自体をTypeScriptで書く（ `webpack.config.ts` を作れるようにする）
- `@types/webpack` はWebpack本体にあわせて4系の一番あたらしいバージョンを探して指定する
```bash
npm install --save-dev typescript ts-node @types/node @types/webpack
```
合わせて `tsconfig.json` もVueのドキュメントを参考に作る。クライアントサイドだけであれば、ドキュメントのままの設定でOK:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es5",
    "esModuleInterop": true
  }
}
```
一方で、のちにSSR、つまりサーバサイドのビルドにも対応することを見据えてshim定義やDOMの型もサーバサイドで解決できるよう、いくつか追加しておく:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES5",
    "lib": ["ES2020", "DOM"],
    "esModuleInterop": true,
    "moduleResolution": "node",
  },
  "include": [
    "./src/**/*.ts",
    "./src/**/*.vue",
    "./type/**/*.d.ts"
  ],
  "typeRoots": [
    "type",
    "node_modules/@types"
  ]
}
```

*webpack.config.ts* で型情報が補完されることを確認する:
```typescript
import webpack from 'webpack'
import { VueLoaderPlugin } from 'vue-loader'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import path from 'node:path'

type Mode = 'development' | 'production'

function getMode(): Mode {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

/**
* src/index.js をエントリーポイントに、 dist 配下にバンドルしたHTMLを生成する
*/
const config: webpack.Configuration = {
  mode: getMode(),
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
      test: /\.vue$/,
      loader: 'vue-loader'
      },
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ]
}

export default config
```

### VueのscriptをTypeScriptで書けるようにする
ドキュメント: https://vue-loader.vuejs.org/guide/pre-processors.html#typescript

プリプロセッサとして、ts-loaderを導入すればよい。ドキュメントにある構成をそのままコピーしておく。
```typescript
const config: webpack.Configuration = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: { appendTsSuffixTo: [/\.vue$/] }
      }
    ]
  }
}
```

script 部分をTypeScriptで書き直し、再度ビルドできれば完成
```typescript
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data: () => ({
    message: 'Vue bundled!'
  })
})
</script>

<template>
  <div>
    <h1>Hello, Vue!</h1>
    <p>{{ message }}</p>
  </div>
</template>
```

# SSRに対応する
ドキュメント
- https://v2.ssr.vuejs.org/
- https://v2.ssr.vuejs.org/ja

### なぜSSRか
SSR(Universal mode) にすると、初回アクセス時にすべてのJavaScriptをロードせずに済むため、クライアント側ネットワーク状況に限らず安定したレンダリング速度を確保できる。

## ビルドの作り方
公式ドキュメントを参考に、サーバサイド、クライアントそれぞれのビルド設定を作る。クライアントサイドだけで完結する場合と比較すると、それなりにやることが増える。
公式の解説だけでは理解しづらい箇所もあるので、サンプルプロジェクトも参考にする: https://github.com/vuejs/vue-hackernews-2.0

### 指針
ルートとなるVueインスタンスをフロントエンド・バックエンドで共用する。バックエンドでは初期アクセスなどでインスタンスを使い、クライアントではJavaScriptを読み込んだ際にアプリケーションをマウントする。
フロントエンド、バックエンドそれぞれで必要になるものが違うので、サーバサイド・クライアントそれぞれに webpack.config.ts を作る。

クライアント、サーバサイドそれぞれのコードの構造は、公式の解説が詳しい: https://v2.ssr.vuejs.org/ja/guide/structure.html#webpack%E3%81%AB%E3%82%88%E3%82%8B%E3%82%B3%E3%83%BC%E3%83%88%E3%82%99%E6%A7%8B%E9%80%A0

### 共通
クライアント、サーバサイドでいくつかのコード、設定は共用することになる。
*webpack.config.ts*
- src配下のTypeScriptコードを解決するために、 `resolve` を書く
- Vue, TypeScriptを併用する前提なので、対応するローダーをmodule.rulesにいれるが、これらはCSRのときと変わらない
- client, serverそれぞれの設定ファイルのベースになり、 `webpack-merge` でマージして使われる（`webpack-merge` を使った設定の組み合わせは公式の推奨になっている）

```typescript
import path from 'node:path'
import { VueLoaderPlugin } from 'vue-loader'
import type { Configuration } from 'webpack'

type Mode = 'development' | 'production'

function getMode(): Mode {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

/**
 * src/index.js をエントリーポイントに、 dist 配下にバンドルしたHTMLを生成する
 */
const config: Configuration = {
  mode: getMode(),
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.js',
  },
  // (must)ビルドに含めるモジュールおよび拡張子。この設定がないと、ビルド時にimport/exportするモジュールを解決できない
  resolve: {
    extensions: ['.ts'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules']
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      // Vueのscript含め、ソースコードをTypeScriptで書いてもバンドルできるようにする
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: { appendTsSuffixTo: [/\.vue$/] }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ]
}

export default config

```

*tsconfig.json*
- サーバサイド、つまりNode.jsアプリケーションとしてもビルドできるよう、モジュール解決などを調整する
  - `lib` ... サーバサイドでもDOMに関連する型を解決する必要があるので `DOM` を追加
  - `include` ... サーバサイドでVueの型をビルド時に読み出せるよう、shimをおいたディレクトリも含める
```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES5",
    "lib": ["ES2020", "DOM"],
    "esModuleInterop": true,
    "moduleResolution": "node",
  },
  "include": [
    "./src/**/*.ts",
    "./src/**/*.vue",
    "./type/**/*.d.ts"
  ],
  "typeRoots": [
    "type",
    "node_modules/@types"
  ]
}
```

*src/app.ts*
- クライアント・サーバサイドに共通のVueインスタンスを管理する。
- それぞれからこの関数が呼ばれることで、サーバサイドでレンダリングしたマークアップに対してクライアントでマウントしてインタラクティブなアプリケーションにすることができる
```typescript
import Vue from 'vue'
import App from './App.vue'

export function createApp(): Vue {
  return new Vue({
    render: (h) => h(App)
  })
}
```

### サーバサイド
ドキュメント: https://v2.ssr.vuejs.org/ja/guide/build-config.html#server-%E8%A8%AD%E5%AE%9A

*webpack.server.config.ts*
- ドキュメントに書いてあるとおりに対応すれば素直にビルドできる
- ローダーやモジュールの解決などは共通のほうに起き、こちらはバックエンド用のバンドルを作る設定になる
  - サーバサイドなので `node_modules` 配下はバンドルに含めない
  - targetを `node` にする
```typescript
import type { Configuration } from 'webpack'
import merge from 'webpack-merge'
import baseConfig from './webpack.config'
import nodeExternals from 'webpack-node-externals'
import VueSsrServerPlugin from 'vue-server-renderer/server-plugin'

/**
 * SSR用のサーバサイドの設定、バックエンド向けの設定として実装される
 * @see https://v2.ssr.vuejs.org/guide/build-config.html
 */
const config: Configuration = merge(baseConfig, {
  entry: './src/server.ts',
  // This allows webpack to handle dynamic imports in a Node-appropriate
  // fashion, and also tells `vue-loader` to emit server-oriented code when
  // compiling Vue components.
  target: 'node',
  // For bundle renderer source map support
  devtool: '#source-map',
  // This tells the server bundle to use Node-style exports
  output: {
    libraryTarget: 'commonjs2',
    filename: 'server-bundle.js'
  },
  // https://webpack.js.org/configuration/externals/#function
  // https://github.com/liady/webpack-node-externals
  // Externalize app dependencies. This makes the server build much faster
  // and generates a smaller bundle file.
  externals: nodeExternals({
    allowlist: /\.css$/
  }),
  plugins: [new VueSsrServerPlugin()]
})

export default config
```

*src/server.ts*
- サンプルプロジェクトの感じからするに、最小の構成はこういうことらしい
- デフォルトエクスポートで、VueのContextを受け取る関数を返すようにするらしい。ビルドしたあと、この関数がエントリーポイントから呼ばれる
```typescript
import { createApp } from './app'

// Renderer#renderToString の第一引数 context が入ってくる
// 固有の型定義ではなく object 型であればなんでも使えるらしい
export default (_: object): Promise<Vue> => {
  // ルーティングなどを行い、例外的な処理があるときにrejectもコールする
  return new Promise((resolve, _) => {
    const app = createApp()

    resolve(app)
  })
}
```

### クライアント
*webpack.client.config.ts*
- こちらもドキュメントを参考に、素直にビルド設定を書く
```typescript
import webpack from 'webpack'
import merge from 'webpack-merge'
import baseConfig from './webpack.config'
import VueSsrClientPlugin from 'vue-server-renderer/client-plugin'

const config: webpack.Configuration = merge(baseConfig, {
  entry: './src/client.ts',
  optimization: {
    // Important: this splits the webpack runtime into a leading chunk
    // so that async chunks can be injected right after it.
    // this also enables better caching for your app/vendor code.
    splitChunks: {
      minChunks: Infinity,
      name: 'manifest',
    }
  },
  plugins: [
    // This plugins generates `vue-ssr-client-manifest.json` in the
    // output directory.
    new VueSsrClientPlugin()
  ]
})

export default config
```

*src/client.ts*
- CSRのときと同じく、クライアントのJavaScriptは共用しているVueインスタンスを生成したうえでマウントまでしてしまう
- クライアント側では、サーバサイドで生成されたマークアップがすでにある前提なので、マウントまですればインタラクティブなアプリケーションになる
```typescript
import { createApp } from './app'

const app = createApp()

app.$mount('#app')
```

### 起動エントリーポイント
アプリケーションの起動エンドポイントは、どちらのバンドルにも含めず独立したJavaScriptコードとして実装する。
これは、主にサーバサイドのバンドル結果を使って起動する、メイン関数に近い性質によるものである。
```javascript
// アプリケーション起動時に、直にnodeコマンドの引数になるのであえてJavaScriptで書く

const fs = require('fs')
const path = require('path')
const express = require('express')
const createBundleRenderer = require('vue-server-renderer').createBundleRenderer

const bundle = require('../dist/vue-ssr-server-bundle.json')
const clientManifest = require('../dist/vue-ssr-client-manifest.json')
const template = fs.readFileSync(path.join(__dirname, './index.template.html'), 'utf-8')

function log(message, level) {
  const now = new Date().toISOString()
  const lv = level ?? 'INFO'
  process.stdout.write(`[${now} #${process.pid}] ${lv} ${message}\n`)
}

/**
 * 生成したバンドルをもとにレンダラを生成する
 */
const renderer = createBundleRenderer(bundle, {
  template,
  clientManifest
})

const server = express()
server.get('*', (req, res) => {
  log(`GET ${req.path}`)

  renderer.renderToString({}, (err, html) => {
    if (err) {
      log(`Error occurred... ${err}`, 'ERROR')
      res.status(500).end('Internal Server Error')
      return
    }
    res.end(html)
    log(`Rendered ${req.path}`)
  })
})

server.listen(9001, () => {
  log('Start listening server on port 9001')
})
```

*src/index.template.html*
- メタコメントをHTMLに埋め込んでおく必要がある点に注意: - https://v2.ssr.vuejs.org/ja/guide/#%E3%83%98%E3%82%9A%E3%83%BC%E3%82%B7%E3%82%99%E3%83%86%E3%83%B3%E3%83%95%E3%82%9A%E3%83%AC%E3%83%BC%E3%83%88%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%99%E3%82%8B

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Card UI sample</title>
  </head>
  <body>
    <!-- サーバサイドで生成したVueのマウントポイント -->
    <div id="app"></div>
    <!--vue-ssr-outlet-->
  </body>
</html>
```
生成されるマークアップの補足
- メタコメント箇所にマークアップが注入されると、サーバサイドでは次のようにレンダリングされる
  - クライアントのバンドルが読み込まれているので、クライアントで描画された際には、ハイドレーションされてインタラクティブなアプリケーションになっている
- scriptの読み込みは `defer` である必要がある。VueインスタンスはクライアントでDOMを読み込んだあとにマウントポイントを探してマウントする必要がある。
  - `defer` 属性を与えることで、 `DOMContentLoaded` イベント完了後にスクリプトを実行してくれる
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Card UI sample</title>
  <link rel="preload" href="bundle.js" as="script"></head>
  <body>
    <!-- サーバサイドで生成したVueのマウントポイント -->
    <div id="app"></div>
    <div data-server-rendered="true"><h1>Hello, Vue!</h1> <p>Vue bundled!</p></div><script src="bundle.js" defer></script>
  </body>
</html>
```

ここまで設定を作り、最後に以下のようにしてビルドができるようになれば完成

```bash
NODE_ENV=production npx webpack --config webpack.client.config.ts && npx webpack --config webpack.server.config.ts
```

# その他足りないもの
- cssや静的ファイルもバンドルさせる設定
  - css-loader など、スタイル系ソースをバンドルに含めるためのローダーや設定も必要になる
- ESバージョンのトランスパイル（babel使う）
  - こちらも、トランスパイル用のローダー等設定が必要になる

