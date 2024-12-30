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
