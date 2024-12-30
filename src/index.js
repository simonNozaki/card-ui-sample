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
    }
    res.end(html)
    log(`Rendered ${req.path}`)
  })
})

server.listen(9001, () => {
  log('Start listening server on port 9001')
})
