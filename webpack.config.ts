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
