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
