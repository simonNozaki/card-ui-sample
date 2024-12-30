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
